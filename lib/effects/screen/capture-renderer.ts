import { clock, draw, effect, frameLoop, sampler, surface, target } from "vgpu";

import { LOGO_EFFECT_INSTANCE_BYTES, subscribeToLogoFrame } from "@/lib/effects/logo/frame-bridge";
import glyphShader from "@/lib/effects/logo/glyphs.wgsl";
import captureShader from "@/lib/effects/screen/shaders/capture.wgsl";
import { supportsCanvasPaint } from "@/lib/effects/screen/support";
import type { CaptureEffectState, CaptureRendererController } from "@/lib/effects/screen/types";
import {
  createAdaptiveRenderQuality,
  renderSurfaceSize,
  type AdaptiveRenderQuality,
} from "@/lib/rendering/adaptive-quality";
import type { RendererLifecycleCallbacks } from "@/lib/rendering/types";
import { assertWebGpuAvailable, createRendererGpu, observeRendererGpu } from "@/lib/rendering/vgpu";
import { themeAppliedEvent } from "@/lib/themes/theme-runtime";
import { unreachable } from "@/lib/validation";

type CanvasBitmapBinding = {
  clone: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  source: HTMLCanvasElement;
};

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export class ScreenCaptureUnsupportedError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ScreenCaptureUnsupportedError";
  }
}

function modeForEffect(effectId: CaptureEffectState["effect"]) {
  switch (effectId) {
    case "crt":
      return 1;
    case "grain":
      return 2;
    case "dither":
      return 3;
    case "off":
      return 0;
    default:
      return unreachable(effectId);
  }
}

function modeForDitherPattern(pattern: CaptureEffectState["settings"]["ditherPattern"]) {
  return pattern === "halftone" ? 1 : 0;
}

const CRT_NOISE_FRAME_RATE = 30;

const CAPTURE_EXCLUDE_SELECTOR =
  "script, iframe, nextjs-portal, next-route-announcer, [data-screen-effects-skip-capture], [data-screen-effects-capture-player], [data-screen-overlay-player], [data-secret-lab]";

function excludedFromCapture(node: Node) {
  const element = node instanceof Element ? node : node.parentElement;
  return Boolean(element?.closest(CAPTURE_EXCLUDE_SELECTOR));
}

function copyCanvasBitmaps(bindings: CanvasBitmapBinding[]) {
  for (const { clone, context, source } of bindings) {
    if (source.width < 1 || source.height < 1) continue;

    if (clone.width !== source.width) clone.width = source.width;
    if (clone.height !== source.height) clone.height = source.height;
    try {
      context.clearRect(0, 0, clone.width, clone.height);
      context.drawImage(source, 0, 0);
    } catch {
      // A canvas with protected or unavailable pixels remains blank in the capture clone.
    }
  }
}

function copyFormState(bindings: Map<FormControl, FormControl>) {
  for (const [sourceControl, cloneControl] of bindings) {
    if (sourceControl instanceof HTMLInputElement && cloneControl instanceof HTMLInputElement) {
      cloneControl.checked = sourceControl.checked;
    }
    cloneControl.value = sourceControl.value;
  }
}

function copyScrollState(bindings: Map<HTMLElement, HTMLElement>) {
  for (const [source, clone] of bindings) {
    clone.scrollLeft = source.scrollLeft;
    clone.scrollTop = source.scrollTop;
  }
}

function logoStageIsOccluded(stage: HTMLElement) {
  const bounds = stage.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return true;
  const insetX = Math.min(2, bounds.width / 4);
  const insetY = Math.min(2, bounds.height / 4);
  const points = [
    [bounds.left + bounds.width / 2, bounds.top + bounds.height / 2],
    [bounds.left + insetX, bounds.top + insetY],
    [bounds.right - insetX, bounds.top + insetY],
    [bounds.left + insetX, bounds.bottom - insetY],
    [bounds.right - insetX, bounds.bottom - insetY],
  ] as const;

  return points.some(([x, y]) => {
    const topmost = document.elementFromPoint(x, y);
    return topmost !== null && !stage.contains(topmost);
  });
}

function bindClonedElements(clonedElements: Map<Element, Element>) {
  const scrollBindings = new Map<HTMLElement, HTMLElement>();
  const formBindings = new Map<FormControl, FormControl>();
  const canvasBindings: CanvasBitmapBinding[] = [];
  // Use the exact source/clone pairs instead of re-querying both trees and matching by index.
  for (const [sourceElement, cloneElement] of clonedElements) {
    cloneElement.removeAttribute("id");
    cloneElement.removeAttribute("for");
    cloneElement.removeAttribute("aria-controls");
    cloneElement.removeAttribute("aria-describedby");
    cloneElement.removeAttribute("aria-labelledby");

    if (!(sourceElement instanceof HTMLElement) || !(cloneElement instanceof HTMLElement)) continue;
    cloneElement.style.removeProperty("view-transition-name");
    cloneElement.style.removeProperty("view-transition-class");
    if (
      sourceElement.scrollHeight > sourceElement.clientHeight ||
      sourceElement.scrollWidth > sourceElement.clientWidth
    ) {
      scrollBindings.set(sourceElement, cloneElement);
    }

    if (
      (sourceElement instanceof HTMLInputElement && cloneElement instanceof HTMLInputElement) ||
      (sourceElement instanceof HTMLSelectElement && cloneElement instanceof HTMLSelectElement) ||
      (sourceElement instanceof HTMLTextAreaElement && cloneElement instanceof HTMLTextAreaElement)
    ) {
      formBindings.set(sourceElement, cloneElement);
    }
    if (sourceElement instanceof HTMLCanvasElement && cloneElement instanceof HTMLCanvasElement) {
      const context = cloneElement.getContext("2d");
      if (context) canvasBindings.push({ source: sourceElement, clone: cloneElement, context });
    }
    if (sourceElement.matches(".omarchy-effects-mark")) {
      cloneElement.dataset.screenEffectsCapture = "";
      const sourceStage = sourceElement.querySelector<HTMLElement>(".omarchy-effects-mark__stage");
      if (sourceStage && logoStageIsOccluded(sourceStage)) {
        cloneElement.dataset.screenEffectsLogoOccluded = "";
      }
    }
  }
  copyFormState(formBindings);
  copyCanvasBitmaps(canvasBindings);
  return { formBindings, scrollBindings };
}

function clonePageSource(source: HTMLElement) {
  const clone = document.createElement("div");
  for (const attribute of source.attributes) {
    clone.setAttribute(attribute.name, attribute.value);
  }
  // Reject renderer/control subtrees before cloning, so capturing body never
  // recursively copies an earlier capture or depends on an application wrapper.
  const walker = document.createTreeWalker(source, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node instanceof Element && node.matches(CAPTURE_EXCLUDE_SELECTOR)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  const clonedElements = new Map<Element, Element>([[source, clone]]);
  const textBindings = new Map<Node, Node>();
  let sourceNode = walker.nextNode();
  while (sourceNode) {
    const cloneNode = sourceNode.cloneNode(false);
    const parentClone = sourceNode.parentElement && clonedElements.get(sourceNode.parentElement);
    parentClone?.append(cloneNode);
    if (sourceNode instanceof Element && cloneNode instanceof Element)
      clonedElements.set(sourceNode, cloneNode);
    if (sourceNode.nodeType === Node.TEXT_NODE) textBindings.set(sourceNode, cloneNode);
    sourceNode = walker.nextNode();
  }
  const bodyStyle = getComputedStyle(document.body);
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("inert", "");
  clone.style.backgroundColor = bodyStyle.backgroundColor;
  clone.style.color = bodyStyle.color;
  clone.style.width = `${window.innerWidth}px`;
  clone.style.minHeight = `${Math.max(source.scrollHeight, window.innerHeight)}px`;
  clone.style.transform = `translateY(${-window.scrollY}px)`;
  clone.style.transformOrigin = "left top";
  const { formBindings, scrollBindings } = bindClonedElements(clonedElements);
  return { clone, formBindings, scrollBindings, textBindings };
}

function drawElementIntoTexture(
  queue: GPUQueue,
  source: Element,
  texture: GPUTexture,
  width: number,
  height: number
) {
  const sourceConfig = {
    source,
  };
  const destinationConfig = {
    destination: { texture },
    height,
    width,
  };

  if (queue.drawElementImageToTexture) {
    queue.drawElementImageToTexture(sourceConfig, destinationConfig);
    return;
  }
  if (queue.copyElementImageToTexture) {
    queue.copyElementImageToTexture(sourceConfig, destinationConfig);
    return;
  }
  throw new ScreenCaptureUnsupportedError(
    "This browser does not expose the HTML-in-Canvas WebGPU texture-copy API."
  );
}

export async function createScreenCaptureRenderer(
  outputCanvas: HTMLCanvasElement,
  captureCanvas: HTMLCanvasElement,
  captureRoot: HTMLElement,
  source: HTMLElement,
  initialState: CaptureEffectState,
  callbacks: RendererLifecycleCallbacks,
  signal?: AbortSignal
): Promise<CaptureRendererController> {
  assertWebGpuAvailable((message, options) => new ScreenCaptureUnsupportedError(message, options));
  if (!supportsCanvasPaint(captureCanvas)) {
    throw new ScreenCaptureUnsupportedError(
      "HTML-in-Canvas is unavailable. Enable the Chromium canvas-draw-element feature."
    );
  }
  if (!captureCanvas.getContext("2d")) {
    throw new ScreenCaptureUnsupportedError(
      "HTML-in-Canvas requires a rendering context on its containing canvas."
    );
  }

  let disposed = false;
  let cloneFrame = 0;
  let captureReadyFrame = 0;
  let scrollFrame = 0;
  let currentState = initialState;
  let currentClone: HTMLElement | null = null;
  let currentScrollBindings = new Map<HTMLElement, HTMLElement>();
  let currentFormBindings = new Map<FormControl, FormControl>();
  let currentTextBindings = new Map<Node, Node>();
  let live = false;
  let paintFailed = false;
  const gpu = await createRendererGpu({
    label: "Omarchy screen capture",
    signal,
    unsupportedError: (message, options) => new ScreenCaptureUnsupportedError(message, options),
  });

  const eventController = new AbortController();
  let unsubscribeGpu: (() => void) | undefined;
  let unsubscribeLogoFrame: (() => void) | undefined;
  let adaptiveQuality: AdaptiveRenderQuality | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let mutationObserver: MutationObserver | undefined;

  function dispose() {
    if (disposed) return;
    disposed = true;
    signal?.removeEventListener("abort", dispose);
    eventController.abort();
    cancelAnimationFrame(cloneFrame);
    cancelAnimationFrame(captureReadyFrame);
    cancelAnimationFrame(scrollFrame);
    mutationObserver?.disconnect();
    resizeObserver?.disconnect();
    adaptiveQuality?.dispose();
    unsubscribeLogoFrame?.();
    unsubscribeGpu?.();
    captureRoot.replaceChildren();
    // vgpu tears down its loops/resources, then destroys the owned device and its buffers/textures.
    gpu.dispose();
  }

  signal?.addEventListener("abort", dispose, { once: true });

  try {
    signal?.throwIfAborted();
    unsubscribeGpu = observeRendererGpu(gpu, "Omarchy screen capture", callbacks.onError);
    const output = surface(gpu, outputCanvas, {
      alphaMode: "premultiplied",
      autoResize: false,
      clearColor: [0, 0, 0, 0],
      label: "omarchy-screen-capture-surface",
      size: renderSurfaceSize(outputCanvas, "high"),
    });
    const createPageTexture = (size: readonly [number, number]) =>
      gpu.device.createTexture({
        format: "rgba8unorm",
        label: "omarchy-screen-capture-source",
        size,
        usage: ["copy_dst", "render_attachment", "texture_binding"],
      });
    let pageTexture = createPageTexture(output.size);
    let pageTextureSize: readonly [number, number] = [output.size[0], output.size[1]];
    let pendingPageTexture: {
      size: readonly [number, number];
      texture: typeof pageTexture;
    } | null = null;
    const logoTarget = target(gpu, {
      clearColor: [0, 0, 0, 0],
      format: "rgba8unorm",
      label: "omarchy-screen-capture-logo-target",
      size: [1, 1],
    });
    let logoInstanceCapacity = 1;
    let logoInstanceCount = 0;
    let logoColorAdjustment: readonly [number, number, number, number] = [1, 1, 0, 0];
    let logoInstanceBuffer = gpu.device.createBuffer({
      label: "omarchy-screen-capture-logo-instances",
      size: LOGO_EFFECT_INSTANCE_BYTES,
      usage: ["storage", "copy_dst"],
    });
    const logoDraw = draw(gpu, {
      blend: "alpha",
      instances: logoInstanceCapacity,
      label: "omarchy-screen-capture-logo-glyphs",
      set: { glyph_color_adjustment: logoColorAdjustment, glyphs: logoInstanceBuffer },
      shader: glyphShader,
      vertices: 6,
    });
    const ensureLogoInstanceCapacity = (requiredCapacity: number) => {
      if (requiredCapacity <= logoInstanceCapacity) return;
      const nextCapacity = Math.max(requiredCapacity, logoInstanceCapacity * 2);
      const nextBuffer = gpu.device.createBuffer({
        label: "omarchy-screen-capture-logo-instances",
        size: nextCapacity * LOGO_EFFECT_INSTANCE_BYTES,
        usage: ["storage", "copy_dst"],
      });
      logoDraw.set({ glyphs: nextBuffer });
      logoInstanceBuffer.destroy();
      logoInstanceBuffer = nextBuffer;
      logoInstanceCapacity = nextCapacity;
    };
    unsubscribeLogoFrame = subscribeToLogoFrame((snapshot) => {
      if (disposed) return;
      if (!snapshot) {
        logoInstanceCount = 0;
        return;
      }
      ensureLogoInstanceCapacity(snapshot.instanceCount);
      logoInstanceCount = snapshot.instanceCount;
      if (
        snapshot.colorAdjustment[0] !== logoColorAdjustment[0] ||
        snapshot.colorAdjustment[1] !== logoColorAdjustment[1] ||
        snapshot.colorAdjustment[2] !== logoColorAdjustment[2]
      ) {
        logoColorAdjustment = snapshot.colorAdjustment;
        logoDraw.set({ glyph_color_adjustment: logoColorAdjustment });
      }
      if (snapshot.bytes.byteLength > 0) logoInstanceBuffer.write(snapshot.bytes);
    });
    const pageSampler = sampler(gpu, {
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      magFilter: "linear",
      minFilter: "linear",
    });
    const shader = effect(gpu, captureShader, {
      label: "omarchy-screen-capture",
      set: {
        page_params: {
          bayer_matrix_size: initialState.settings.bayerMatrixSize,
          chromatic_aberration: initialState.settings.chromaticAberration,
          contrast: initialState.settings.contrast,
          curvature: initialState.settings.curvature,
          dither: initialState.settings.dither,
          dither_pattern: modeForDitherPattern(initialState.settings.ditherPattern),
          frame_rate: CRT_NOISE_FRAME_RATE,
          grain: initialState.settings.grain,
          grayscale: initialState.settings.grayscale,
          halftone_angle: initialState.settings.halftoneAngle,
          halftone_dot_size: initialState.settings.halftoneDotSize,
          intensity: initialState.settings.intensity,
          logo_bounds: [0, 0, 0, 0],
          logo_enabled: 0,
          mode: modeForEffect(initialState.effect),
          palette_levels: initialState.settings.paletteLevels,
          pattern_scale: initialState.settings.patternScale,
          resolution: output.size,
          saturation: initialState.settings.saturation,
          scanline_spacing: initialState.settings.scanlineSpacing,
          scanline_thickness: initialState.settings.scanlineThickness,
          scanlines: initialState.settings.scanlines,
          time: 0,
          vignette: initialState.settings.vignette,
        },
        page_sampler: pageSampler,
        page_source: pageTexture,
        logo_source: logoTarget.color,
      },
    });

    const configure = (state: CaptureEffectState) => {
      currentState = state;
      shader.set({
        page_params: {
          bayer_matrix_size: state.settings.bayerMatrixSize,
          chromatic_aberration: state.settings.chromaticAberration,
          contrast: state.settings.contrast,
          curvature: state.settings.curvature,
          dither: state.settings.dither,
          dither_pattern: modeForDitherPattern(state.settings.ditherPattern),
          grain: state.settings.grain,
          grayscale: state.settings.grayscale,
          halftone_angle: state.settings.halftoneAngle,
          halftone_dot_size: state.settings.halftoneDotSize,
          intensity: state.settings.intensity,
          mode: modeForEffect(state.effect),
          palette_levels: state.settings.paletteLevels,
          pattern_scale: state.settings.patternScale,
          saturation: state.settings.saturation,
          scanline_spacing: state.settings.scanlineSpacing,
          scanline_thickness: state.settings.scanlineThickness,
          scanlines: state.settings.scanlines,
          vignette: state.settings.vignette,
        },
      });
    };

    const requestPaint = () => captureCanvas.requestPaint?.();

    const readLogoBounds = () => {
      const stage = [...source.querySelectorAll<HTMLElement>(".omarchy-effects-mark__stage")].find(
        (element) => !excludedFromCapture(element) && !logoStageIsOccluded(element)
      );
      if (!stage || window.innerWidth < 1 || window.innerHeight < 1) {
        return [0, 0, 0, 0];
      }
      const bounds = stage.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return [0, 0, 0, 0];
      const normalizedBounds = [
        bounds.left / window.innerWidth,
        bounds.top / window.innerHeight,
        bounds.width / window.innerWidth,
        bounds.height / window.innerHeight,
      ];
      const logoSize = [
        Math.max(1, Math.round(normalizedBounds[2] * output.size[0])),
        Math.max(1, Math.round(normalizedBounds[3] * output.size[1])),
      ] as const;
      if (logoTarget.size[0] !== logoSize[0] || logoTarget.size[1] !== logoSize[1]) {
        logoTarget.resize(logoSize);
        shader.set({ logo_source: logoTarget.color });
      }
      return normalizedBounds;
    };

    let committedLogoBounds = [0, 0, 0, 0];
    let captureLayoutReady = true;

    const syncClone = () => {
      if (disposed) return;
      const { clone, formBindings, scrollBindings, textBindings } = clonePageSource(source);
      currentClone = clone;
      currentFormBindings = formBindings;
      currentScrollBindings = scrollBindings;
      currentTextBindings = textBindings;
      captureRoot.replaceChildren(clone);
      copyScrollState(scrollBindings);
      captureRoot.style.width = `${window.innerWidth}px`;
      captureRoot.style.height = `${window.innerHeight}px`;
      captureRoot.style.overflow = "hidden";
      captureCanvas.style.width = `${window.innerWidth}px`;
      captureCanvas.style.height = `${window.innerHeight}px`;
      if (pendingPageTexture) {
        captureLayoutReady = false;
        cancelAnimationFrame(captureReadyFrame);
        captureReadyFrame = requestAnimationFrame(() => {
          captureReadyFrame = 0;
          captureLayoutReady = true;
          requestPaint();
        });
      } else {
        captureLayoutReady = true;
        requestPaint();
      }
    };

    const syncScrollState = () => {
      scrollFrame = 0;
      if (currentClone) currentClone.style.transform = `translateY(${-window.scrollY}px)`;
      copyScrollState(currentScrollBindings);
      requestPaint();
    };

    const scheduleScrollSync = () => {
      if (scrollFrame !== 0) return;
      scrollFrame = requestAnimationFrame(syncScrollState);
    };

    const scheduleCloneSync = () => {
      if (cloneFrame !== 0) return;
      cloneFrame = requestAnimationFrame(() => {
        cloneFrame = 0;
        syncClone();
      });
    };

    const onPaint = () => {
      if (disposed || paintFailed) return;
      if (pendingPageTexture && !captureLayoutReady) return;
      const captureTarget = pendingPageTexture ?? {
        size: pageTextureSize,
        texture: pageTexture,
      };
      try {
        drawElementIntoTexture(
          gpu.gpu.queue,
          captureRoot,
          captureTarget.texture.gpu,
          captureTarget.size[0],
          captureTarget.size[1]
        );
        if (captureTarget === pendingPageTexture) {
          const previousPageTexture = pageTexture;
          pageTexture = captureTarget.texture;
          pageTextureSize = captureTarget.size;
          pendingPageTexture = null;
          shader.set({ page_source: pageTexture });
          previousPageTexture.destroy();
        }
        committedLogoBounds = readLogoBounds();
        if (!live) {
          live = true;
          callbacks.onLive();
        }
      } catch (error) {
        paintFailed = true;
        callbacks.onError(error);
      }
    };

    captureCanvas.addEventListener("paint", onPaint, { signal: eventController.signal });
    resizeObserver = new ResizeObserver(scheduleCloneSync);
    resizeObserver.observe(source);
    mutationObserver = new MutationObserver((records) => {
      const pageRecords = records.filter(
        (record) =>
          !excludedFromCapture(record.target) &&
          (record.type !== "childList" ||
            [...record.addedNodes, ...record.removedNodes].some(
              (node) => !excludedFromCapture(node)
            ))
      );
      if (pageRecords.length === 0) return;
      // Clock and terminal text updates do not require rebuilding the whole page.
      if (
        pageRecords.every(
          (record) => record.type === "characterData" && currentTextBindings.has(record.target)
        )
      ) {
        for (const record of pageRecords) {
          const cloneText = currentTextBindings.get(record.target);
          if (cloneText) cloneText.nodeValue = record.target.nodeValue;
        }
        requestPaint();
      } else scheduleCloneSync();
    });
    mutationObserver.observe(source, {
      attributeFilter: [
        "class",
        "data-live",
        "data-renderer",
        "data-theme",
        "style",
        "data-active-workspace",
        "data-bar-position",
        "data-bar-transparent",
        "data-bar-visible",
        "hidden",
        "open",
        "checked",
        "value",
        "src",
        "srcset",
        "sizes",
      ],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    window.addEventListener("scroll", scheduleScrollSync, {
      passive: true,
      signal: eventController.signal,
    });
    source.addEventListener("scroll", scheduleScrollSync, {
      capture: true,
      passive: true,
      signal: eventController.signal,
    });
    window.addEventListener(themeAppliedEvent, scheduleCloneSync, {
      signal: eventController.signal,
    });
    const syncForms = () => {
      copyFormState(currentFormBindings);
      requestPaint();
    };
    source.addEventListener("input", syncForms, { capture: true, signal: eventController.signal });
    source.addEventListener("change", syncForms, { capture: true, signal: eventController.signal });

    output.onResize(() => {
      const nextSize = [output.size[0], output.size[1]] as const;
      const captureSize = pendingPageTexture?.size ?? pageTextureSize;
      if (captureSize[0] !== nextSize[0] || captureSize[1] !== nextSize[1]) {
        pendingPageTexture?.texture.destroy();
        pendingPageTexture = {
          size: nextSize,
          texture: createPageTexture(nextSize),
        };
        captureLayoutReady = false;
      }
      captureCanvas.width = nextSize[0];
      captureCanvas.height = nextSize[1];
      shader.set({
        page_params: { resolution: nextSize },
      });
      cancelAnimationFrame(cloneFrame);
      cloneFrame = 0;
      syncClone();
    });
    const quality = createAdaptiveRenderQuality({
      canvas: outputCanvas,
      resize: (size) => output.resize(size),
    });
    adaptiveQuality = quality;

    void document.fonts.ready.then(() => {
      if (!disposed) scheduleCloneSync();
    });
    const time = clock(gpu);
    frameLoop(gpu, (frame) => {
      const active = live && !paintFailed && currentState.effect !== "off";
      if (!active) {
        quality.recordFrame({
          active: false,
          deltaMs: time.deltaTime * 1_000,
          rendered: false,
        });
        return;
      }
      const logoEnabled =
        logoInstanceCount > 0 && committedLogoBounds[2] > 0 && committedLogoBounds[3] > 0;
      shader.set({
        page_params: {
          logo_bounds: committedLogoBounds,
          logo_enabled: logoEnabled ? 1 : 0,
          frame_rate: CRT_NOISE_FRAME_RATE,
          time: time.time,
        },
      });
      if (logoEnabled) {
        frame.pass({ clear: [0, 0, 0, 0], target: logoTarget }, (pass) => {
          pass.draw(logoDraw, { instances: logoInstanceCount });
        });
      }
      frame.pass(output, shader);
      quality.recordFrame({
        active: document.visibilityState === "visible",
        deltaMs: time.deltaTime * 1_000,
        rendered: true,
      });
    });

    return {
      configure,
      dispose,
      refresh: scheduleCloneSync,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
