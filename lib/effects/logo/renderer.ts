import { draw, frame, surface } from "vgpu";

import {
  logoEffectPlaybackEqual,
  type LogoEffectPlayback,
  type LogoEffectPresentation,
  type PreparedLogoEffect,
} from "@/lib/effects/logo/definition";
import {
  clearLogoFrame,
  LOGO_EFFECT_INSTANCE_BYTES,
  LOGO_EFFECT_INSTANCE_WORDS,
  publishLogoFrame,
} from "@/lib/effects/logo/frame-bridge";
import { createGlyphEncoder, type GlyphEncoder } from "@/lib/effects/logo/glyphs";
import glyphShader from "@/lib/effects/logo/glyphs.wgsl";
import { defaultLogoEffectIdle, type LogoEffectIdle } from "@/lib/effects/logo/idle";
import { applyLogoIdleFrame, type LogoIdleEmission } from "@/lib/effects/logo/idle-frame";
import { logoFrameCanGoLive } from "@/lib/effects/logo/lifecycle";
import { OMARCHY_MARK, OMARCHY_MARK_COLUMNS, OMARCHY_MARK_ROWS } from "@/lib/effects/logo/mark";
import { readLogoPalette } from "@/lib/effects/logo/palette";
import { advanceRevealLoop } from "@/lib/effects/logo/playback-scheduler";
import { createLogoCells } from "@/lib/effects/logo/runtime/grid";
import { LOGO_EFFECT_TICK_MS } from "@/lib/effects/logo/sampled-runtime";
import type {
  GlyphVisual,
  LogoEffectInstanceWriter,
  LogoEffectRuntimeCore,
  LogoGlyphChannel,
  LogoInteraction,
  LogoEffectStartMode,
  LogoEffectStatus,
  LogoPoint,
  LogoPointerTrailPoint,
  LogoRendererController,
} from "@/lib/effects/logo/types";
import {
  createAdaptiveRenderQuality,
  renderSurfaceSize,
  type AdaptiveRenderQuality,
} from "@/lib/rendering/adaptive-quality";
import type { RendererLifecycleCallbacks } from "@/lib/rendering/types";
import { assertWebGpuAvailable, createRendererGpu, observeRendererGpu } from "@/lib/rendering/vgpu";

export const logoRendererBundleMarker = "omarchy-logo-renderer-vgpu-v2";

export class LogoRendererUnsupportedError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LogoRendererUnsupportedError";
  }
}

const CELLS = createLogoCells(OMARCHY_MARK);
const MAX_CATCH_UP_TICKS = 30;
const MAX_FRAME_DELTA_MS = LOGO_EFFECT_TICK_MS * MAX_CATCH_UP_TICKS;
const LOGO_PRESENTATION_FPS = 1_000 / LOGO_EFFECT_TICK_MS;
const POINTER_HISTORY_LIMIT = 28;
const POINTER_SAMPLE_DISTANCE = 0.55;
const POINTER_SAMPLE_INTERVAL_MS = 32;
const POINTER_TRAIL_RETENTION_MS = 1600;
type TimedLogoPointer = LogoPoint & {
  atMs: number;
};

function preparedPlaybackRate(playback: LogoEffectPlayback, status: LogoEffectStatus) {
  if (status === "revealing") return playback.revealRate;
  if (status !== "ambient" || playback.mode === "once") return 0;
  if (playback.mode === "ambient") return playback.ambientRate;
  return playback.repeatDelayMotion === "ambient" ? playback.ambientRate : 0;
}

function packInstance(
  floats: Float32Array,
  integers: Uint32Array,
  index: number,
  column: number,
  row: number,
  visual: GlyphVisual,
  presentation: Pick<
    LogoEffectPresentation,
    "contrast" | "glow" | "grayscale" | "pixelSize" | "saturation" | "scanlines"
  >,
  encodeGlyph: GlyphEncoder
) {
  const encoded = encodeGlyph(visual.glyph, visual.style === "spark");
  const word = index * LOGO_EFFECT_INSTANCE_WORDS;

  floats[word] = column;
  floats[word + 1] = row;
  floats[word + 2] = presentation.pixelSize;
  floats[word + 3] = presentation.scanlines;
  floats[word + 4] = visual.color[0] / 255;
  floats[word + 5] = visual.color[1] / 255;
  floats[word + 6] = visual.color[2] / 255;
  floats[word + 7] = visual.alpha ?? 1;
  floats[word + 8] = visual.offsetX ?? 0;
  floats[word + 9] = visual.offsetY ?? 0;
  integers[word + 10] = encoded.bitmap[0];
  integers[word + 11] = encoded.bitmap[1];
  integers[word + 12] = encoded.bitmap[2];
  integers[word + 13] = encoded.bitmap[3];
  integers[word + 14] = encoded.bitmap[4];
  integers[word + 15] = encoded.bitmap[5];
  integers[word + 16] = encoded.style;
  integers[word + 17] = 1;
  floats[word + 18] = visual.scale ?? 1;
  floats[word + 19] = (visual.glow ?? 0) * presentation.glow;
}

function packRuntime(
  runtime: LogoEffectRuntimeCore,
  bytes: ArrayBuffer,
  presentation: LogoEffectPresentation,
  instanceCapacity: number,
  encodeGlyph: GlyphEncoder,
  idle: LogoEffectIdle,
  idleElapsedMs: number
): number {
  const floats = new Float32Array(bytes);
  const integers = new Uint32Array(bytes);
  const emissions: LogoIdleEmission[] = [];
  const writer: LogoEffectInstanceWriter = {
    capacity: instanceCapacity,
    get count() {
      return emissions.length;
    },
    push(particle, channel: LogoGlyphChannel) {
      if (emissions.length >= instanceCapacity) {
        throw new RangeError(
          `Logo effect emitted more than its declared ${instanceCapacity} instances`
        );
      }
      emissions.push({ channel, particle });
    },
  };

  runtime.writeInstances(writer);
  const animated = applyLogoIdleFrame(emissions, idle, idleElapsedMs);
  for (let instance = 0; instance < animated.length; instance += 1) {
    const { channel, particle } = animated[instance];
    const preparedGlyph = presentation.glyphs.overrides[channel] ?? presentation.glyphs.default;
    const keepsEffectGlyph = preparedGlyph.kind === "source";
    const visual: GlyphVisual = keepsEffectGlyph
      ? particle
      : {
          ...particle,
          glyph: preparedGlyph.value,
          style: "glyph",
        };
    packInstance(
      floats,
      integers,
      instance,
      particle.column,
      particle.row,
      visual,
      presentation,
      encodeGlyph
    );
  }
  return animated.length;
}

export async function createLogoRenderer(
  canvas: HTMLCanvasElement,
  interactionTarget: HTMLElement | null,
  callbacks: RendererLifecycleCallbacks & { onSettledFrame?: () => void },
  signal?: AbortSignal
): Promise<LogoRendererController> {
  assertWebGpuAvailable((message, options) => new LogoRendererUnsupportedError(message, options));

  const encodeGlyph = await createGlyphEncoder(canvas);
  if (signal?.aborted) {
    throw new DOMException("Logo renderer initialization was aborted.", "AbortError");
  }

  const gpu = await createRendererGpu({
    label: "Omarchy logo",
    signal,
    unsupportedError: (message, options) => new LogoRendererUnsupportedError(message, options),
  });
  let active = true;
  let disposed = false;
  const frameOwner = Symbol("omarchy-logo-frame");
  let animationFrame = 0;
  let presentationDirty = false;
  let currentIdle = defaultLogoEffectIdle("laseretch");
  let idleElapsedMs = 0;
  let currentPreparedEffect: PreparedLogoEffect | undefined;
  const currentPalette = readLogoPalette(canvas);
  let currentRuntime: LogoEffectRuntimeCore | undefined;
  let currentSeed = 0;
  let hasRendered = false;
  let previewPending = false;
  let liveGeneration = 0;
  let lastFrameAt = 0;
  let revealLoopPauseMs = 0;
  let tickAccumulatorMs = 0;
  let pointer: LogoPoint | null = null;
  let previousPointer: LogoPoint | null = null;
  let pointerAtMs = 0;
  let pointerHistory: TimedLogoPointer[] = [];
  let pointerInside = false;
  let pointerPressed = false;
  let pointerReleased = false;
  let pointerPrimaryDown = false;
  let pointerType = "mouse";
  let pointerVelocity = { columnPerSecond: 0, rowPerSecond: 0 };
  const pointerTarget = interactionTarget ?? canvas;
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let adaptiveQuality: AdaptiveRenderQuality | undefined;
  let unsubscribeGpu: (() => void) | undefined;

  const initialResources = (() => {
    try {
      const canvasSurface = surface(gpu, canvas, {
        alphaMode: "premultiplied",
        autoResize: false,
        clearColor: [0, 0, 0, 0],
        label: "omarchy-logo-surface",
        size: renderSurfaceSize(canvas, "high"),
      });
      const instanceCapacity = CELLS.length;
      const instanceData = new ArrayBuffer(instanceCapacity * LOGO_EFFECT_INSTANCE_BYTES);
      const instanceBuffer = gpu.device.createBuffer({
        label: "omarchy-logo-instances",
        size: instanceData.byteLength,
        usage: ["storage", "copy_dst"],
      });
      const glyphDraw = draw(gpu, {
        blend: "alpha",
        instances: instanceCapacity,
        label: "omarchy-logo-glyphs",
        set: { glyph_color_adjustment: [1, 1, 0, 0], glyphs: instanceBuffer },
        shader: glyphShader,
        vertices: 6,
      });
      return { canvasSurface, glyphDraw, instanceBuffer, instanceCapacity, instanceData };
    } catch (error) {
      gpu.dispose();
      throw error;
    }
  })();

  const canvasSurface = initialResources.canvasSurface;
  const glyphDraw = initialResources.glyphDraw;
  let appliedColorAdjustment: readonly [number, number, number, number] = [1, 1, 0, 0];
  let instanceBuffer = initialResources.instanceBuffer;
  let instanceCapacity = initialResources.instanceCapacity;
  let instanceData = initialResources.instanceData;

  const ensureInstanceCapacity = (requiredCapacity: number) => {
    if (requiredCapacity <= instanceCapacity) return;

    const nextCapacity = Math.max(requiredCapacity, instanceCapacity * 2);
    const nextData = new ArrayBuffer(nextCapacity * LOGO_EFFECT_INSTANCE_BYTES);
    const nextBuffer = gpu.device.createBuffer({
      label: "omarchy-logo-instances",
      size: nextData.byteLength,
      usage: ["storage", "copy_dst"],
    });
    glyphDraw.set({ glyphs: nextBuffer });
    instanceBuffer.destroy();
    instanceBuffer = nextBuffer;
    instanceCapacity = nextCapacity;
    instanceData = nextData;
  };

  const stopCurrent = () => {
    liveGeneration += 1;
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    presentationDirty = false;
    currentPreparedEffect = undefined;
    currentRuntime = undefined;
    hasRendered = false;
    pointerHistory = [];
    clearLogoFrame(frameOwner);
  };

  const terminate = (failure?: { error: unknown }) => {
    if (disposed) return;
    disposed = true;
    stopCurrent();
    adaptiveQuality?.dispose();
    pointerTarget.removeEventListener("pointerdown", pressPointer);
    pointerTarget.removeEventListener("pointermove", updatePointer);
    pointerTarget.removeEventListener("pointerup", releasePointer);
    pointerTarget.removeEventListener("pointercancel", cancelPointer);
    pointerTarget.removeEventListener("pointerleave", clearPointer);
    motionPreference.removeEventListener("change", applyMotionPreference);
    unsubscribeGpu?.();
    instanceBuffer.destroy();
    canvasSurface.dispose();
    gpu.dispose();
    if (failure) callbacks.onError(failure.error);
  };

  const pointerTrailForFrame = (now: number): LogoPointerTrailPoint[] => {
    pointerHistory = pointerHistory.filter(
      (point) => now - point.atMs <= POINTER_TRAIL_RETENTION_MS
    );
    return pointerHistory.map(({ atMs, column, row }) => ({
      ageMs: Math.max(0, now - atMs),
      column,
      row,
    }));
  };

  const pointerIsActive = () =>
    Boolean(active && currentRuntime?.usesPointer && currentRuntime.pointerEnabled());

  const pointerTrailIsActive = () => pointerIsActive() && pointerHistory.length > 0;

  const interactionForFrame = (now: number): LogoInteraction =>
    pointerIsActive()
      ? {
          current: pointer,
          inside: pointerInside,
          pointerType,
          pressed: pointerPressed,
          previous: previousPointer,
          primaryDown: pointerPrimaryDown,
          released: pointerReleased,
          trail: pointerTrailForFrame(now),
          velocity: pointerVelocity,
        }
      : {
          current: null,
          inside: false,
          pointerType: "mouse",
          pressed: false,
          previous: null,
          primaryDown: false,
          released: false,
          trail: [],
          velocity: { columnPerSecond: 0, rowPerSecond: 0 },
        };

  const stepRuntime = (deltaTicks: number, now: number) => {
    if (!currentRuntime) return { completedReveal: false, restarted: false };
    const statusBefore = currentRuntime.status;
    const playback = currentPreparedEffect?.playback;
    if (!playback) return { completedReveal: false, restarted: false };
    const runtimeDeltaTicks = deltaTicks * preparedPlaybackRate(playback, statusBefore);
    currentRuntime.step({ deltaTicks: runtimeDeltaTicks, interaction: interactionForFrame(now) });
    if (currentIdle.enabled && currentRuntime.status !== "revealing" && deltaTicks > 0) {
      idleElapsedMs += deltaTicks * LOGO_EFFECT_TICK_MS;
    }
    const repeatPlayback = playback.mode === "repeat" ? playback : undefined;
    const loop = advanceRevealLoop({
      deltaMs: deltaTicks * LOGO_EFFECT_TICK_MS,
      elapsedMs: revealLoopPauseMs,
      enabled: repeatPlayback !== undefined,
      repeatDelayMs: repeatPlayback?.repeatDelayMs ?? 0,
      statusAfter: currentRuntime.status,
      statusBefore,
    });
    revealLoopPauseMs = loop.elapsedMs;
    if (loop.restart) {
      currentRuntime.reset();
      idleElapsedMs = 0;
    }
    pointerPressed = false;
    pointerReleased = false;
    return { completedReveal: loop.completedReveal, restarted: loop.restart };
  };

  const render = () => {
    if (disposed || !active || !currentRuntime) return;

    try {
      const presentation = currentPreparedEffect?.presentation;
      if (!presentation) return;
      ensureInstanceCapacity(currentRuntime.instanceCapacity);
      const instanceCount = packRuntime(
        currentRuntime,
        instanceData,
        presentation,
        currentRuntime.instanceCapacity,
        encodeGlyph,
        currentIdle,
        currentRuntime.status === "revealing" ? 0 : idleElapsedMs
      );
      if (instanceCount > 0) {
        instanceBuffer.write(
          new Uint8Array(instanceData, 0, instanceCount * LOGO_EFFECT_INSTANCE_BYTES)
        );
      }
      const colorAdjustment = [
        presentation.contrast,
        presentation.saturation,
        presentation.grayscale,
        0,
      ] as const;
      if (
        colorAdjustment[0] !== appliedColorAdjustment[0] ||
        colorAdjustment[1] !== appliedColorAdjustment[1] ||
        colorAdjustment[2] !== appliedColorAdjustment[2]
      ) {
        glyphDraw.set({ glyph_color_adjustment: colorAdjustment });
        appliedColorAdjustment = colorAdjustment;
      }
      const submittedFrame = frame(gpu, (currentFrame) => {
        currentFrame.pass({ clear: [0, 0, 0, 0], target: canvasSurface }, (pass) => {
          if (instanceCount > 0) pass.draw(glyphDraw, { instances: instanceCount });
        });
      });
      publishLogoFrame(frameOwner, {
        bytes: new Uint8Array(instanceData, 0, instanceCount * LOGO_EFFECT_INSTANCE_BYTES),
        colorAdjustment,
        instanceCount,
      });
      if (previewPending && instanceCount > 0 && currentRuntime.status !== "revealing") {
        previewPending = false;
        callbacks.onSettledFrame?.();
      }
      if (!hasRendered && logoFrameCanGoLive(instanceCount)) {
        hasRendered = true;
        const generation = liveGeneration;
        void submittedFrame.done.then(() => {
          if (disposed || generation !== liveGeneration) return;
          requestAnimationFrame(() => {
            if (!disposed && generation === liveGeneration) callbacks.onLive();
          });
        });
      }
    } catch (error) {
      terminate({ error });
    }
  };

  const runtimeAdvancesVisually = () => {
    if (currentRuntime === undefined) return false;
    const playback = currentPreparedEffect?.playback;
    const timedVisuals = playback
      ? currentRuntime.status === "revealing" ||
        (currentRuntime.status === "ambient" &&
          (playback.mode === "ambient" ||
            (playback.mode === "repeat" && playback.repeatDelayMotion === "ambient")))
      : currentRuntime.status !== "settled";
    return (
      timedVisuals ||
      (currentIdle.enabled && currentRuntime.status !== "revealing") ||
      (pointerIsActive() && pointer !== null) ||
      (pointerIsActive() && pointerPrimaryDown) ||
      pointerTrailIsActive()
    );
  };

  const shouldAnimate = () =>
    active &&
    currentRuntime !== undefined &&
    (runtimeAdvancesVisually() || currentPreparedEffect?.playback.mode === "repeat");

  const tick = (now: number) => {
    animationFrame = 0;
    if (disposed || !active || !currentRuntime) return;

    if (lastFrameAt === 0) lastFrameAt = now;
    const deltaMs = Math.min(MAX_FRAME_DELTA_MS, Math.max(0, now - lastFrameAt));
    lastFrameAt = now;
    tickAccumulatorMs += deltaMs;
    const deltaTicks = Math.min(
      MAX_CATCH_UP_TICKS,
      Math.floor(tickAccumulatorMs / LOGO_EFFECT_TICK_MS)
    );
    if (deltaTicks > 0) tickAccumulatorMs -= deltaTicks * LOGO_EFFECT_TICK_MS;

    const statusBeforeStep = currentRuntime.status;
    const visualAdvance = runtimeAdvancesVisually();
    const step = stepRuntime(deltaTicks, now);
    const shouldPresent =
      presentationDirty ||
      step.completedReveal ||
      step.restarted ||
      currentRuntime.status !== statusBeforeStep ||
      (deltaTicks > 0 && visualAdvance);
    presentationDirty = false;
    if (shouldPresent) render();
    adaptiveQuality?.recordFrame({
      active: !disposed && document.visibilityState === "visible",
      deltaMs,
      rendered: shouldPresent && !disposed,
      targetFps: LOGO_PRESENTATION_FPS,
    });
    if (shouldAnimate()) animationFrame = requestAnimationFrame(tick);
  };

  const startTicker = () => {
    if (
      animationFrame !== 0 ||
      disposed ||
      !active ||
      !currentRuntime ||
      motionPreference.matches
    ) {
      return;
    }
    lastFrameAt = 0;
    tickAccumulatorMs = 0;
    animationFrame = requestAnimationFrame(tick);
  };

  const playCurrent = (startMode: LogoEffectStartMode = "reveal") => {
    liveGeneration += 1;
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    presentationDirty = false;
    if (!currentPreparedEffect || disposed) return;
    Object.assign(currentPalette, readLogoPalette(canvas));
    const context = {
      cells: CELLS,
      palette: currentPalette,
      seed: currentSeed,
    };
    currentRuntime = currentPreparedEffect.createRuntime(context);
    currentRuntime.reset();
    idleElapsedMs = 0;
    revealLoopPauseMs = 0;
    ensureInstanceCapacity(currentRuntime.instanceCapacity);
    pointerHistory = [];
    previousPointer = pointer;
    pointerVelocity = { columnPerSecond: 0, rowPerSecond: 0 };
    hasRendered = false;

    if (startMode === "settled" || motionPreference.matches) {
      currentRuntime.settle();
      stepRuntime(0, performance.now());
      if (active) render();
      if (startMode === "settled" && !motionPreference.matches && shouldAnimate()) startTicker();
      return;
    }

    stepRuntime(0, performance.now());
    if (!active) return;
    render();
    startTicker();
  };
  const applyMotionPreference = () => playCurrent("settled");

  const scheduleCurrentFrame = () => {
    if (disposed || !active || !currentRuntime) return;
    if (motionPreference.matches) {
      render();
      return;
    }
    presentationDirty = true;
    startTicker();
  };
  const refreshPalette = () => {
    Object.assign(currentPalette, readLogoPalette(canvas));
    if (active && currentRuntime) render();
  };
  const recordPointer = (event: PointerEvent) => {
    const bounds = pointerTarget.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return false;
    const nextPointer = {
      column: ((event.clientX - bounds.left) / bounds.width) * OMARCHY_MARK_COLUMNS,
      row: ((event.clientY - bounds.top) / bounds.height) * OMARCHY_MARK_ROWS,
    };
    const now = performance.now();
    const pointerDeltaMs = pointerAtMs > 0 ? Math.max(1, now - pointerAtMs) : 0;
    previousPointer = pointer;
    pointerVelocity =
      pointer && pointerDeltaMs > 0
        ? {
            columnPerSecond: ((nextPointer.column - pointer.column) / pointerDeltaMs) * 1000,
            rowPerSecond: ((nextPointer.row - pointer.row) / pointerDeltaMs) * 1000,
          }
        : { columnPerSecond: 0, rowPerSecond: 0 };
    pointerAtMs = now;
    pointer = nextPointer;
    pointerInside = true;
    pointerType = event.pointerType || "mouse";

    const previousPoint = pointerHistory.at(-1);
    const sampleDistance = previousPoint
      ? Math.hypot(
          nextPointer.column - previousPoint.column,
          (nextPointer.row - previousPoint.row) * 2
        )
      : Number.POSITIVE_INFINITY;
    const sampleAge = previousPoint ? now - previousPoint.atMs : Number.POSITIVE_INFINITY;

    if (
      !previousPoint ||
      sampleDistance >= POINTER_SAMPLE_DISTANCE ||
      sampleAge >= POINTER_SAMPLE_INTERVAL_MS
    ) {
      const segments = previousPoint ? Math.min(6, Math.max(1, Math.ceil(sampleDistance))) : 1;
      for (let segment = 1; segment <= segments; segment += 1) {
        const progress = segment / segments;
        pointerHistory.push({
          atMs: previousPoint ? previousPoint.atMs + (now - previousPoint.atMs) * progress : now,
          column: previousPoint
            ? previousPoint.column + (nextPointer.column - previousPoint.column) * progress
            : nextPointer.column,
          row: previousPoint
            ? previousPoint.row + (nextPointer.row - previousPoint.row) * progress
            : nextPointer.row,
        });
      }
      pointerHistory = pointerHistory.slice(-POINTER_HISTORY_LIMIT);
    }
    return true;
  };
  const updatePointer = (event: PointerEvent) => {
    if (!pointerIsActive() || motionPreference.matches) return;
    if (!recordPointer(event)) return;
    scheduleCurrentFrame();
  };
  const pressPointer = (event: PointerEvent) => {
    if (!pointerIsActive() || motionPreference.matches) return;
    if (!recordPointer(event) || !event.isPrimary || event.button !== 0) return;
    pointerPressed = true;
    pointerPrimaryDown = true;
    scheduleCurrentFrame();
  };
  const releasePointer = (event: PointerEvent) => {
    if (!pointerIsActive() || motionPreference.matches) return;
    recordPointer(event);
    if (!event.isPrimary || event.button !== 0) return;
    pointerReleased = pointerPrimaryDown;
    pointerPrimaryDown = false;
    scheduleCurrentFrame();
  };
  const clearPointer = () => {
    previousPointer = pointer;
    pointer = null;
    pointerAtMs = 0;
    pointerInside = false;
    pointerReleased ||= pointerPrimaryDown;
    pointerPrimaryDown = false;
    pointerVelocity = { columnPerSecond: 0, rowPerSecond: 0 };
    if (pointerIsActive()) {
      scheduleCurrentFrame();
    }
  };
  const cancelPointer = () => {
    pointerHistory = [];
    clearPointer();
  };
  try {
    unsubscribeGpu = observeRendererGpu(gpu, "Omarchy logo", (error) => terminate({ error }));
    adaptiveQuality = createAdaptiveRenderQuality({
      canvas,
      resize(size) {
        canvasSurface.resize(size);
        scheduleCurrentFrame();
      },
    });
    pointerTarget.addEventListener("pointerdown", pressPointer);
    pointerTarget.addEventListener("pointermove", updatePointer);
    pointerTarget.addEventListener("pointerup", releasePointer);
    pointerTarget.addEventListener("pointercancel", cancelPointer);
    pointerTarget.addEventListener("pointerleave", clearPointer);
    motionPreference.addEventListener("change", applyMotionPreference);
  } catch (error) {
    terminate();
    throw error;
  }

  return {
    configureIdle(idle) {
      currentIdle = idle;
      if (!currentRuntime || !active) return;
      render();
      if (shouldAnimate() && animationFrame === 0 && !motionPreference.matches) startTicker();
      else if (!shouldAnimate() && animationFrame !== 0) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    },
    dispose() {
      terminate();
    },
    playPrepared(effect, seed, startMode = "reveal") {
      previewPending = true;
      const previousPrepared = currentPreparedEffect;
      const canApply =
        previousPrepared !== undefined &&
        currentRuntime !== undefined &&
        previousPrepared.bundleMarker === effect.bundleMarker &&
        currentSeed === seed;

      if (canApply && currentRuntime) {
        const update = effect.applyTo(currentRuntime);
        currentPreparedEffect = effect;
        if (!logoEffectPlaybackEqual(previousPrepared.playback, effect.playback)) {
          revealLoopPauseMs = 0;
        }
        if (update === "none" || update === "live") {
          if (!active) return;
          stepRuntime(0, performance.now());
          presentationDirty = false;
          render();
          if (shouldAnimate() && animationFrame === 0) startTicker();
          else if (!shouldAnimate() && animationFrame !== 0) {
            cancelAnimationFrame(animationFrame);
            animationFrame = 0;
          }
          return;
        }
      }

      currentPreparedEffect = effect;
      currentSeed = seed;
      playCurrent(startMode);
    },
    refreshPalette,
    replay(startMode = "reveal") {
      playCurrent(startMode);
    },
    setActive(nextActive) {
      if (disposed || active === nextActive) return;
      active = nextActive;
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      presentationDirty = false;
      lastFrameAt = 0;
      tickAccumulatorMs = 0;
      adaptiveQuality?.reset();

      if (!active) {
        pointer = null;
        previousPointer = null;
        pointerAtMs = 0;
        pointerHistory = [];
        pointerInside = false;
        pointerPressed = false;
        pointerReleased = false;
        pointerPrimaryDown = false;
        pointerVelocity = { columnPerSecond: 0, rowPerSecond: 0 };
        clearLogoFrame(frameOwner);
        return;
      }

      if (!currentRuntime) return;
      adaptiveQuality?.refreshSize();
      stepRuntime(0, performance.now());
      render();
      if (!motionPreference.matches && shouldAnimate()) startTicker();
    },
    stop: stopCurrent,
  };
}
