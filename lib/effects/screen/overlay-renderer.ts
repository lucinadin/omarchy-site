import { clock, effect, frameLoop, surface } from "vgpu";

import overlayShader from "@/lib/effects/screen/shaders/overlay.wgsl";
import type { OverlayEffectState } from "@/lib/effects/screen/types";
import { observeRenderActivity } from "@/lib/rendering/activity";
import {
  createAdaptiveRenderQuality,
  renderSurfaceSize,
  type AdaptiveRenderQuality,
} from "@/lib/rendering/adaptive-quality";
import type { RendererController, RendererLifecycleCallbacks } from "@/lib/rendering/types";
import { createRendererGpu, observeRendererGpu } from "@/lib/rendering/vgpu";
import { unreachable } from "@/lib/validation";

export class ScreenOverlayUnsupportedError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ScreenOverlayUnsupportedError";
  }
}

function modeForOverlay(effectId: OverlayEffectState["effect"]) {
  switch (effectId) {
    case "crt-mask":
      return 1;
    case "grain":
      return 2;
    case "dither":
      return 3;
    case "scanlines":
      return 4;
    case "off":
      return 0;
    default:
      return unreachable(effectId);
  }
}

export async function createScreenOverlayRenderer(
  canvas: HTMLCanvasElement,
  initialState: OverlayEffectState,
  callbacks: RendererLifecycleCallbacks,
  signal?: AbortSignal
): Promise<RendererController<OverlayEffectState>> {
  let disposed = false;
  let live = false;
  const gpu = await createRendererGpu({
    label: "Omarchy screen overlay",
    signal,
    unsupportedError: (message, options) => new ScreenOverlayUnsupportedError(message, options),
  });

  let unsubscribeGpu: (() => void) | undefined;
  let adaptiveQuality: AdaptiveRenderQuality | undefined;
  let activity: ReturnType<typeof observeRenderActivity> | undefined;

  function dispose() {
    if (disposed) return;
    disposed = true;
    signal?.removeEventListener("abort", dispose);
    activity?.dispose();
    adaptiveQuality?.dispose();
    unsubscribeGpu?.();
    // vgpu owns its frame loops, surfaces, shader resources, and device.
    gpu.dispose();
  }

  signal?.addEventListener("abort", dispose, { once: true });

  try {
    signal?.throwIfAborted();
    unsubscribeGpu = observeRendererGpu(gpu, "Omarchy screen overlay", callbacks.onError);
    const output = surface(gpu, canvas, {
      alphaMode: "premultiplied",
      autoResize: false,
      clearColor: [0, 0, 0, 0],
      label: "omarchy-screen-overlay-surface",
      size: renderSurfaceSize(canvas, "high"),
    });
    const overlay = effect(gpu, overlayShader, {
      label: "omarchy-screen-overlay",
      set: {
        overlay_params: {
          dither: initialState.settings.dither,
          grain: initialState.settings.grain,
          intensity: initialState.settings.intensity,
          mode: modeForOverlay(initialState.effect),
          resolution: output.size,
          scanlines: initialState.settings.scanlines,
          time: 0,
          vignette: initialState.settings.vignette,
        },
      },
    });

    const configure = (state: OverlayEffectState) => {
      overlay.set({
        overlay_params: {
          dither: state.settings.dither,
          grain: state.settings.grain,
          intensity: state.settings.intensity,
          mode: modeForOverlay(state.effect),
          scanlines: state.settings.scanlines,
          vignette: state.settings.vignette,
        },
      });
    };

    output.onResize(() => {
      overlay.set({ overlay_params: { resolution: output.size } });
    });
    const quality = createAdaptiveRenderQuality({
      canvas,
      resize: (size) => output.resize(size),
    });
    adaptiveQuality = quality;
    const time = clock(gpu);
    let loop: ReturnType<typeof frameLoop> | null = null;
    const startLoop = () => {
      loop ??= frameLoop(gpu, (frame) => {
        overlay.set({ overlay_params: { time: time.time } });
        frame.pass(output, overlay);
        quality.recordFrame({
          active: true,
          deltaMs: time.deltaTime * 1_000,
          rendered: true,
        });
        if (!live) {
          live = true;
          callbacks.onLive();
        }
      });
    };
    activity = observeRenderActivity(canvas, (active) => {
      if (active) {
        if (!loop) quality.reset();
        startLoop();
      } else {
        loop?.stop();
        loop = null;
      }
    });

    return { configure, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
