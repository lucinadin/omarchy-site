import { effect, frame, sampler, surface, type Effect, type Surface, type Texture } from "vgpu";

import { foilDebugViewToUniform, foilMaskModeToUniform } from "@/lib/effects/foil/settings";
import {
  getPatronBadgeGlareSnapshot,
  subscribePatronBadgeGlare,
  type PatronBadgeGlareSettings,
} from "@/lib/effects/patron-badges/glare-settings";
import glareShader from "@/lib/effects/patron-badges/glare.wgsl";
import {
  createAdaptiveRenderQuality,
  type AdaptiveRenderQuality,
} from "@/lib/rendering/adaptive-quality";
import { uploadImageElementTexture } from "@/lib/rendering/image-texture";
import type { RendererLifecycleCallbacks } from "@/lib/rendering/types";
import { createRendererGpu, observeRendererGpu } from "@/lib/rendering/vgpu";

const NEUTRAL_POINTER = [0.5, 0.42] as const;
const POINTER_INTENSITY = 0.92;
const KEYBOARD_SWEEP_MS = 1_100;
const SETTLED_EPSILON = 0.001;
const DEGREES_TO_RADIANS = Math.PI / 180;

type BadgeElements = {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  image: HTMLImageElement;
  phase: number;
  plane: HTMLElement;
  stage: HTMLElement;
};

type BadgeGlareEntry = BadgeElements & {
  currentIntensity: number;
  currentX: number;
  currentY: number;
  dirty: boolean;
  effect: Effect;
  keyboardSweepStartedAt: number | null;
  pointerActive: boolean;
  surface: Surface;
  targetIntensity: number;
  targetX: number;
  targetY: number;
  texture: Texture;
  visible: boolean;
};

export class PatronBadgeGlareUnsupportedError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PatronBadgeGlareUnsupportedError";
  }
}

function collectBadgeElements(root: HTMLElement) {
  const elements: BadgeElements[] = [];

  for (const host of root.querySelectorAll<HTMLElement>("[data-patron-badge-art]")) {
    const image = host.querySelector<HTMLImageElement>("[data-patron-badge-image]");
    const canvas = host.querySelector<HTMLCanvasElement>("[data-patron-badge-glare]");
    const plane = host.querySelector<HTMLElement>("[data-patron-badge-plane]");
    const stage = host.querySelector<HTMLElement>("[data-patron-badge-stage]");
    if (!image || !canvas || !plane || !stage) {
      throw new Error(
        "A patron badge artwork is missing its image, pointer stage, tilt plane, or glare canvas."
      );
    }

    elements.push({
      canvas,
      host,
      image,
      phase: Number(host.dataset.badgePhase ?? "0"),
      plane,
      stage,
    });
  }

  if (elements.length === 0) throw new Error("No patron badge artwork was found.");
  return elements;
}

async function decodeBadgeImages(elements: readonly BadgeElements[], signal: AbortSignal) {
  const pending: Promise<void>[] = [];
  for (const { image } of elements) {
    pending.push(
      image.decode().then(() => {
        if (image.naturalWidth < 1 || image.naturalHeight < 1) {
          throw new Error(
            `The patron badge artwork ${image.currentSrc || image.src} did not load.`
          );
        }
      })
    );
  }
  await Promise.all(pending);
  signal.throwIfAborted();
}

function pointerPosition(event: PointerEvent, host: HTMLElement) {
  const bounds = host.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return NEUTRAL_POINTER;
  return [
    Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
    Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
  ] as const;
}

function approach(current: number, target: number, amount: number) {
  const next = current + (target - current) * amount;
  return Math.abs(next - target) < SETTLED_EPSILON ? target : next;
}

function updateBadgeTilt(entry: BadgeGlareEntry, settings: PatronBadgeGlareSettings) {
  const tiltRange = settings.tiltDegrees * 2;
  const tiltX = (0.5 - entry.currentY) * tiltRange * entry.currentIntensity;
  const tiltY = (entry.currentX - 0.5) * tiltRange * entry.currentIntensity;

  if (entry.currentIntensity === 0) {
    entry.plane.style.removeProperty("transform");
    entry.plane.style.removeProperty("will-change");
    return [0, 0] as const;
  }

  const scale = 1 + entry.currentIntensity * 0.018;
  entry.plane.style.willChange = "transform";
  entry.plane.style.transform = `perspective(900px) rotateX(${tiltX.toFixed(3)}deg) rotateY(${tiltY.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
  return [tiltX * DEGREES_TO_RADIANS, tiltY * DEGREES_TO_RADIANS] as const;
}

export async function createPatronBadgeGlareRenderer(
  root: HTMLElement,
  callbacks: RendererLifecycleCallbacks,
  signal: AbortSignal
) {
  const elements = collectBadgeElements(root);
  await decodeBadgeImages(elements, signal);

  let disposed = false;
  let animationFrame = 0;
  let lastFrameTime = 0;
  let live = false;
  const gpu = await createRendererGpu({
    label: "Omarchy patron badge glare",
    signal,
    unsupportedError: (message, options) => new PatronBadgeGlareUnsupportedError(message, options),
  });
  const unsubscribeGpu = observeRendererGpu(gpu, "Omarchy patron badge glare", callbacks.onError);
  const entries: BadgeGlareEntry[] = [];
  const eventController = new AbortController();
  let adaptiveQuality: AdaptiveRenderQuality | undefined;
  let visibilityObserver: IntersectionObserver | undefined;
  let unsubscribeGlareSettings: (() => void) | undefined;

  function dispose() {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener("abort", dispose);
    eventController.abort();
    cancelAnimationFrame(animationFrame);
    visibilityObserver?.disconnect();
    adaptiveQuality?.dispose();
    unsubscribeGlareSettings?.();
    unsubscribeGpu();
    for (const entry of entries) {
      delete entry.canvas.dataset.live;
      delete entry.image.dataset.foilLive;
      entry.plane.style.removeProperty("transform");
      entry.plane.style.removeProperty("will-change");
      entry.surface.dispose();
      entry.texture.destroy();
    }
    gpu.dispose();
  }

  signal.addEventListener("abort", dispose, { once: true });
  try {
    signal.throwIfAborted();
    const badgeSampler = sampler(gpu, {
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      magFilter: "linear",
      minFilter: "linear",
    });
    let glareSettings = getPatronBadgeGlareSnapshot();

    for (const element of elements) {
      const texture = gpu.device.createTexture({
        format: "rgba8unorm",
        label: `omarchy-patron-badge-${element.host.dataset.badgeId ?? "art"}`,
        size: [element.image.naturalWidth, element.image.naturalHeight],
        usage: ["copy_dst", "texture_binding"],
      });
      uploadImageElementTexture(gpu.gpu.queue, texture.gpu, element.image);

      const output = surface(gpu, element.canvas, {
        alphaMode: "premultiplied",
        autoResize: false,
        clearColor: [0, 0, 0, 0],
        label: `omarchy-patron-badge-glare-${element.host.dataset.badgeId ?? "art"}`,
        size: [1, 1],
      });
      const glare = effect(gpu, glareShader, {
        label: `omarchy-patron-badge-glare-${element.host.dataset.badgeId ?? "art"}`,
        set: {
          badge_sampler: badgeSampler,
          badge_source: texture,
          glare_params: {
            band_width: glareSettings.bandWidth,
            color: glareSettings.color,
            debug_view: foilDebugViewToUniform(glareSettings.debugView),
            edge_strength: glareSettings.edgeStrength,
            edge_width: glareSettings.edgeWidth,
            foil_texture: glareSettings.foilTexture,
            glare_strength: glareSettings.glareIntensity,
            groove_angle: glareSettings.grooveAngle * DEGREES_TO_RADIANS,
            groove_density: glareSettings.grooveDensity,
            intensity: 0,
            light_height: glareSettings.lightHeight,
            light_radius: glareSettings.lightRadius,
            mask_mode: foilMaskModeToUniform(glareSettings.maskMode),
            phase: element.phase,
            pointer: NEUTRAL_POINTER,
            rainbow_density: glareSettings.rainbowDensity,
            relief: glareSettings.relief,
            resolution: output.size,
            roughness: glareSettings.roughness,
            sparkle_density: glareSettings.sparkleDensity,
            sparkle_strength: glareSettings.sparkleStrength,
            surface_strength: glareSettings.surfaceStrength,
            surface_tilt: [0, 0],
            texture_brightness: glareSettings.textureBrightness,
            texture_softness: glareSettings.textureSoftness,
            texture_threshold: glareSettings.textureThreshold,
          },
        },
      });

      entries.push({
        ...element,
        currentIntensity: 0,
        currentX: NEUTRAL_POINTER[0],
        currentY: NEUTRAL_POINTER[1],
        dirty: true,
        effect: glare,
        keyboardSweepStartedAt: null,
        pointerActive: false,
        surface: output,
        targetIntensity: 0,
        targetX: NEUTRAL_POINTER[0],
        targetY: NEUTRAL_POINTER[1],
        texture,
        visible: true,
      });
    }

    await Promise.all(
      entries.map((entry) => entry.effect.compile({ colors: [entry.surface.format] }))
    );
    signal.throwIfAborted();

    const scheduleFrame = () => {
      if (disposed || animationFrame !== 0) return;
      animationFrame = requestAnimationFrame(renderFrame);
    };

    const renderFrame = (now: number) => {
      animationFrame = 0;
      if (disposed) return;

      const deltaMs = lastFrameTime === 0 ? 1000 / 60 : Math.min(64, now - lastFrameTime);
      lastFrameTime = now;
      const ease = 1 - Math.exp((-12 * deltaMs) / 1_000);
      const rendered: BadgeGlareEntry[] = [];
      let animating = false;

      for (const entry of entries) {
        if (entry.keyboardSweepStartedAt !== null && !entry.pointerActive) {
          const progress = Math.min(1, (now - entry.keyboardSweepStartedAt) / KEYBOARD_SWEEP_MS);
          entry.targetX = 0.08 + progress * 0.84;
          entry.targetY = 0.34 + Math.sin(progress * Math.PI) * 0.24;
          entry.targetIntensity = Math.sin(progress * Math.PI) * 0.72;
          entry.dirty = true;
          if (progress >= 1) {
            entry.keyboardSweepStartedAt = null;
            entry.targetIntensity = 0;
          }
        }

        const previousX = entry.currentX;
        const previousY = entry.currentY;
        const previousIntensity = entry.currentIntensity;
        entry.currentX = approach(entry.currentX, entry.targetX, ease);
        entry.currentY = approach(entry.currentY, entry.targetY, ease);
        entry.currentIntensity = approach(entry.currentIntensity, entry.targetIntensity, ease);
        const changed =
          entry.currentX !== previousX ||
          entry.currentY !== previousY ||
          entry.currentIntensity !== previousIntensity;
        const moving =
          entry.keyboardSweepStartedAt !== null ||
          entry.currentX !== entry.targetX ||
          entry.currentY !== entry.targetY ||
          entry.currentIntensity !== entry.targetIntensity;

        if (entry.dirty || changed) {
          const surfaceTilt = updateBadgeTilt(entry, glareSettings);
          entry.effect.set({
            glare_params: {
              intensity: entry.currentIntensity,
              pointer: [entry.currentX, entry.currentY],
              surface_tilt: surfaceTilt,
            },
          });
          rendered.push(entry);
          entry.dirty = false;
        }
        if (moving) animating = true;
      }

      if (rendered.length > 0) {
        frame(gpu, (currentFrame) => {
          for (const entry of rendered) {
            currentFrame.pass({ clear: [0, 0, 0, 0], target: entry.surface }, (pass) =>
              pass.draw(entry.effect)
            );
          }
        });
        if (!live) {
          live = true;
          for (const entry of entries) {
            entry.canvas.dataset.live = "true";
            entry.image.dataset.foilLive = "true";
          }
          callbacks.onLive();
        }
      }

      adaptiveQuality?.recordFrame({ active: animating, deltaMs, rendered: rendered.length > 0 });
      if (animating) scheduleFrame();
      else lastFrameTime = 0;
    };

    adaptiveQuality = createAdaptiveRenderQuality({
      canvas: entries[0].canvas,
      resize(size) {
        for (const entry of entries) {
          entry.surface.resize(size);
          entry.effect.set({ glare_params: { resolution: size } });
          entry.dirty = true;
        }
        scheduleFrame();
      },
    });

    unsubscribeGlareSettings = subscribePatronBadgeGlare(() => {
      glareSettings = getPatronBadgeGlareSnapshot();
      for (const entry of entries) {
        entry.effect.set({
          glare_params: {
            band_width: glareSettings.bandWidth,
            color: glareSettings.color,
            debug_view: foilDebugViewToUniform(glareSettings.debugView),
            edge_strength: glareSettings.edgeStrength,
            edge_width: glareSettings.edgeWidth,
            foil_texture: glareSettings.foilTexture,
            glare_strength: glareSettings.glareIntensity,
            groove_angle: glareSettings.grooveAngle * DEGREES_TO_RADIANS,
            groove_density: glareSettings.grooveDensity,
            light_height: glareSettings.lightHeight,
            light_radius: glareSettings.lightRadius,
            mask_mode: foilMaskModeToUniform(glareSettings.maskMode),
            rainbow_density: glareSettings.rainbowDensity,
            relief: glareSettings.relief,
            roughness: glareSettings.roughness,
            sparkle_density: glareSettings.sparkleDensity,
            sparkle_strength: glareSettings.sparkleStrength,
            surface_strength: glareSettings.surfaceStrength,
            texture_brightness: glareSettings.textureBrightness,
            texture_softness: glareSettings.textureSoftness,
            texture_threshold: glareSettings.textureThreshold,
          },
        });
        entry.dirty = true;
      }

      const previewEntry = entries.find((entry) => entry.visible);
      if (previewEntry && !previewEntry.pointerActive) {
        previewEntry.keyboardSweepStartedAt = performance.now() - KEYBOARD_SWEEP_MS * 0.22;
      }
      scheduleFrame();
    });

    visibilityObserver = new IntersectionObserver((observed) => {
      for (const observation of observed) {
        const entry = entries.find(({ host }) => host === observation.target);
        if (!entry) continue;
        entry.visible = observation.isIntersecting;
        if (!entry.visible) {
          entry.pointerActive = false;
          entry.keyboardSweepStartedAt = null;
          entry.currentIntensity = 0;
          entry.currentX = NEUTRAL_POINTER[0];
          entry.currentY = NEUTRAL_POINTER[1];
          entry.targetIntensity = 0;
          entry.targetX = NEUTRAL_POINTER[0];
          entry.targetY = NEUTRAL_POINTER[1];
          entry.dirty = true;
        }
        scheduleFrame();
      }
    });

    for (const entry of entries) {
      const updatePointer = (event: PointerEvent) => {
        const [x, y] = pointerPosition(event, entry.stage);
        entry.pointerActive = true;
        entry.keyboardSweepStartedAt = null;
        entry.targetX = x;
        entry.targetY = y;
        entry.targetIntensity = POINTER_INTENSITY;
        entry.dirty = true;
        scheduleFrame();
      };
      const releasePointer = () => {
        entry.pointerActive = false;
        entry.targetX = NEUTRAL_POINTER[0];
        entry.targetY = NEUTRAL_POINTER[1];
        entry.targetIntensity = 0;
        entry.dirty = true;
        scheduleFrame();
      };
      const startKeyboardSweep = () => {
        if (!entry.host.matches(":focus-visible")) return;
        entry.keyboardSweepStartedAt = performance.now();
        entry.targetX = 0.08;
        entry.targetY = 0.34;
        entry.dirty = true;
        scheduleFrame();
      };

      const listenerOptions = { passive: true, signal: eventController.signal };
      entry.host.addEventListener("pointerenter", updatePointer, listenerOptions);
      entry.host.addEventListener("pointermove", updatePointer, listenerOptions);
      entry.host.addEventListener("pointerleave", releasePointer, listenerOptions);
      entry.host.addEventListener("pointercancel", releasePointer, listenerOptions);
      entry.host.addEventListener(
        "pointerup",
        (event) => {
          if (event.pointerType === "touch") releasePointer();
        },
        listenerOptions
      );
      entry.host.addEventListener("focus", startKeyboardSweep, listenerOptions);
      entry.host.addEventListener("blur", releasePointer, listenerOptions);
      visibilityObserver.observe(entry.host);

      if (entry.host.matches(":hover")) {
        entry.pointerActive = true;
        entry.targetIntensity = POINTER_INTENSITY;
      }
    }

    scheduleFrame();

    return { dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
