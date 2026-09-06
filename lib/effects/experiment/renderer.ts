import { effect, frame, surface } from "vgpu";

import { parseHexColor } from "@/lib/color";
import glassShader from "@/lib/effects/experiment/glass.wgsl";
import { loadLogoDistanceField } from "@/lib/effects/experiment/logo-field";
import { getExperimentSnapshot, subscribeExperiment } from "@/lib/effects/experiment/settings";
import { observeRenderActivity } from "@/lib/rendering/activity";
import {
  createAdaptiveRenderQuality,
  type AdaptiveRenderQuality,
} from "@/lib/rendering/adaptive-quality";
import type { RendererLifecycleCallbacks } from "@/lib/rendering/types";
import { createRendererGpu, observeRendererGpu } from "@/lib/rendering/vgpu";
import { themeAppliedEvent } from "@/lib/themes/theme-runtime";

const readColors = () => {
  const css = getComputedStyle(document.documentElement);
  const color = (property: string) =>
    (parseHexColor(css.getPropertyValue(property).trim()) ?? [0, 0, 0]).map((value) => value / 255);
  return {
    background: color("--background"),
    accent: color("--primary"),
    highlight: color("--bright-foreground"),
  };
};

export async function createExperimentRenderer(
  canvas: HTMLCanvasElement,
  callbacks: RendererLifecycleCallbacks,
  signal: AbortSignal
) {
  const logo = await loadLogoDistanceField(signal);
  const gpu = await createRendererGpu({
    label: "Omarchy Experiment",
    signal,
    unsupportedError: (message, options) => new Error(message, options),
  });
  let disposed = false;
  let raf = 0;
  let previous = 0;
  let lastDraw = 0;
  let elapsed = 0;
  let dirty = true;
  let live = false;
  let active = true;
  let settings = getExperimentSnapshot();
  let orb = settings.mode === "orb" ? 1 : 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let quality: AdaptiveRenderQuality | undefined;
  const cleanups: (() => void)[] = [];
  const events = new AbortController();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    signal.removeEventListener("abort", dispose);
    events.abort();
    quality?.dispose();
    for (const cleanup of cleanups.toReversed()) cleanup();
    gpu.dispose();
  }
  signal.addEventListener("abort", dispose, { once: true });

  try {
    signal.throwIfAborted();
    const field = gpu.device.createTexture({
      label: "Omarchy SVG distance field",
      format: "r32float",
      size: [logo.size, logo.size],
      usage: ["copy_dst", "texture_binding"],
    });
    cleanups.push(() => field.destroy());
    gpu.gpu.queue.writeTexture({ texture: field.gpu }, logo.field, { bytesPerRow: logo.size * 4 }, [
      logo.size,
      logo.size,
    ]);
    const output = surface(gpu, canvas, {
      autoResize: false,
      size: [1, 1],
      alphaMode: "opaque",
      label: "Experiment background",
    });

    cleanups.push(() => output.dispose());
    const sceneValues = () => {
      const { fps: _fps, speed: _speed, mode: _mode, ...material } = settings;
      return {
        ...material,
        orb,
        ...readColors(),
        resolution: output.size,
        pointer: [pointerX, pointerY],
        time: elapsed,
      };
    };
    const glass = effect(gpu, glassShader, {
      label: "Omarchy extruded glass",
      set: { logo_field: field, scene: sceneValues() },
    });
    await glass.compile({ colors: [output.format] });
    signal.throwIfAborted();

    const schedule = () => {
      if (!disposed && active && raf === 0) raf = requestAnimationFrame(draw);
    };
    const invalidate = () => {
      dirty = true;
      schedule();
    };
    const draw = (now: number) => {
      raf = 0;
      if (disposed || !active) return;
      const delta = previous ? Math.min(now - previous, 100) : 1000 / 60;
      previous = now;
      const ease = 1 - Math.exp(-delta / 160);
      const targetOrb = settings.mode === "orb" ? 1 : 0;
      orb =
        reduced.matches || Math.abs(targetOrb - orb) < 0.001
          ? targetOrb
          : orb + (targetOrb - orb) * ease;
      const morphing = orb !== targetOrb;
      const moving = Math.abs(targetX - pointerX) > 0.001 || Math.abs(targetY - pointerY) > 0.001;
      pointerX = reduced.matches ? 0 : pointerX + (targetX - pointerX) * ease;
      pointerY = reduced.matches ? 0 : pointerY + (targetY - pointerY) * ease;
      if (!reduced.matches) elapsed += (delta * settings.speed) / 1000;
      const animating = !reduced.matches && (settings.speed > 0 || moving || morphing);
      const render = dirty || !animating || now - lastDraw >= 1000 / settings.fps - 0.5;
      if (render) {
        glass.set({ scene: { time: elapsed, pointer: [pointerX, pointerY], orb } });
        frame(gpu, (current) =>
          current.pass({ target: output, clear: [0, 0, 0, 1] }, (pass) => pass.draw(glass))
        );
        lastDraw = now;
        dirty = false;
        if (!live) {
          live = true;
          callbacks.onLive();
        }
      }
      quality?.recordFrame({
        active: animating,
        deltaMs: delta,
        rendered: render,
        targetFps: settings.fps,
      });
      if (animating) schedule();
      else previous = 0;
    };

    cleanups.push(
      observeRendererGpu(gpu, "Experiment", (cause) => {
        dispose();
        callbacks.onError(cause);
      })
    );
    quality = createAdaptiveRenderQuality({
      canvas,
      resize(size) {
        // Ray marching is more expensive than flat effects; keep the same
        // global adaptive-quality policy with a smaller shading surface.
        output.resize([
          Math.max(1, Math.round(size[0] * 0.65)),
          Math.max(1, Math.round(size[1] * 0.65)),
        ]);
        glass.set({ scene: { resolution: output.size } });
        invalidate();
      },
    });
    cleanups.push(
      subscribeExperiment(() => {
        settings = getExperimentSnapshot();
        glass.set({ scene: sceneValues() });
        invalidate();
      })
    );
    const updateColors = () => {
      glass.set({ scene: readColors() });
      invalidate();
    };
    window.addEventListener(themeAppliedEvent, updateColors, { signal: events.signal });
    reduced.addEventListener("change", invalidate, { signal: events.signal });
    const host = canvas.closest<HTMLElement>(".home-desktop");
    host?.addEventListener(
      "pointermove",
      (event) => {
        const bounds = canvas.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        targetX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1));
        targetY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1));
        if (!reduced.matches) invalidate();
      },
      { passive: true, signal: events.signal }
    );
    host?.addEventListener(
      "pointerleave",
      () => {
        targetX = 0;
        targetY = 0;
        invalidate();
      },
      { signal: events.signal }
    );
    const activity = observeRenderActivity(canvas, (next) => {
      active = next;
      if (active) {
        previous = 0;
        invalidate();
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
        previous = 0;
      }
    });
    cleanups.push(activity.dispose);
    schedule();
    return { dispose };
  } catch (cause) {
    dispose();
    throw cause;
  }
}
