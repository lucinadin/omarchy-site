import {
  getRenderQualityPreference,
  registerRenderQualityController,
  type RenderQualityPreference,
  type RenderQualityTier,
} from "@/lib/rendering/quality-preference";

const DEFAULT_REFRESH_FPS = 60;
const MAX_INTERACTIVE_FPS = 90;
const HEALTH_WINDOW_MS = 2_000;
const HEALTH_RATIO = 0.8;
const REFRESH_SAMPLE_COUNT = 20;
const MAX_REFRESH_SAMPLES = 60;
const INACTIVE_GAP_MS = 250;

export type FrameHealthSample = {
  active: boolean;
  deltaMs: number;
  rendered: boolean;
  targetFps?: number;
};

type TimedFrame = {
  durationMs: number;
  rendered: boolean;
};

type AdaptiveRenderQualityOptions = {
  canvas: HTMLCanvasElement;
  resize: (size: readonly [number, number]) => void;
};

export type AdaptiveRenderQuality = {
  readonly tier: RenderQualityTier;
  dispose: () => void;
  recordFrame: (sample: FrameHealthSample) => void;
  refreshSize: () => void;
  reset: () => void;
};

export type { RenderQualityTier } from "@/lib/rendering/quality-preference";

export function renderQualityDpr(tier: RenderQualityTier, devicePixelRatio: number) {
  if (tier === "low") return 1;
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(2, Math.max(1, ratio));
}

export function renderSurfaceSize(
  canvas: HTMLCanvasElement,
  tier: RenderQualityTier
): readonly [number, number] {
  const bounds = canvas.getBoundingClientRect();
  const dpr = renderQualityDpr(tier, window.devicePixelRatio);
  return [
    Math.max(1, Math.round(bounds.width * dpr)),
    Math.max(1, Math.round(bounds.height * dpr)),
  ];
}

export function createAdaptiveRenderQuality({
  canvas,
  resize,
}: AdaptiveRenderQualityOptions): AdaptiveRenderQuality {
  let disposed = false;
  let resizeFrame = 0;
  let preference = getRenderQualityPreference();
  let tier: RenderQualityTier = preference === "low" ? "low" : "high";
  let lastDevicePixelRatio = window.devicePixelRatio;
  const health = createFrameHealthMonitor();

  canvas.dataset.renderQuality = tier;

  const applyResize = () => {
    resizeFrame = 0;
    if (disposed) return;
    resize(renderSurfaceSize(canvas, tier));
    health.reset();
  };

  const refreshSize = () => {
    if (disposed || resizeFrame !== 0) return;
    resizeFrame = requestAnimationFrame(applyResize);
  };

  const setTier = (nextTier: RenderQualityTier) => {
    if (tier === nextTier) return;
    tier = nextTier;
    canvas.dataset.renderQuality = tier;
    qualityRegistration.reportTier(tier);
    refreshSize();
  };
  const applyPreference = (nextPreference: RenderQualityPreference) => {
    preference = nextPreference;
    health.reset();
    setTier(preference === "low" ? "low" : "high");
  };

  const onWindowResize = () => {
    if (window.devicePixelRatio === lastDevicePixelRatio) return;
    lastDevicePixelRatio = window.devicePixelRatio;
    refreshSize();
  };

  const observer = new ResizeObserver(refreshSize);
  observer.observe(canvas);
  window.addEventListener("resize", onWindowResize);
  const qualityRegistration = registerRenderQualityController(tier, applyPreference);
  refreshSize();

  return {
    get tier() {
      return tier;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      window.removeEventListener("resize", onWindowResize);
      qualityRegistration.unregister();
      delete canvas.dataset.renderQuality;
    },
    recordFrame(sample) {
      if (disposed || preference !== "auto" || tier === "low") return;
      if (!health.record(sample)) return;
      setTier("low");
    },
    refreshSize,
    reset: health.reset,
  };
}

export function createFrameHealthMonitor() {
  let refreshFps = DEFAULT_REFRESH_FPS;
  let refreshSamples: number[] = [];
  let activeFrames: TimedFrame[] = [];
  let activeDurationMs = 0;
  let activeRenderedFrames = 0;
  let activeTargetFps: number | undefined;
  let downgrade = false;

  const resetActiveWindow = () => {
    activeFrames = [];
    activeDurationMs = 0;
    activeRenderedFrames = 0;
    activeTargetFps = undefined;
  };

  const reset = () => {
    refreshFps = DEFAULT_REFRESH_FPS;
    refreshSamples = [];
    downgrade = false;
    resetActiveWindow();
  };

  const targetFor = (sample: FrameHealthSample) =>
    sample.targetFps !== undefined && Number.isFinite(sample.targetFps) && sample.targetFps > 0
      ? Math.min(sample.targetFps, refreshFps)
      : Math.min(refreshFps, MAX_INTERACTIVE_FPS);

  const record = (sample: FrameHealthSample) => {
    if (downgrade) return true;
    if (
      !sample.active ||
      !Number.isFinite(sample.deltaMs) ||
      sample.deltaMs <= 0 ||
      sample.deltaMs > INACTIVE_GAP_MS
    ) {
      resetActiveWindow();
      return false;
    }

    const previousRefresh = refreshFps;
    refreshFps = updatedRefreshFps(refreshFps, refreshSamples, sample.deltaMs);
    refreshSamples.push(sample.deltaMs);
    if (refreshSamples.length > MAX_REFRESH_SAMPLES) refreshSamples.shift();

    const target = targetFor(sample);
    if (
      activeTargetFps !== undefined &&
      (Math.abs(activeTargetFps - target) > 0.5 || Math.abs(previousRefresh - refreshFps) > 0.5)
    ) {
      resetActiveWindow();
    }
    activeTargetFps = target;

    const currentFrame = { durationMs: sample.deltaMs, rendered: sample.rendered };
    activeFrames.push(currentFrame);
    activeDurationMs += currentFrame.durationMs;
    if (currentFrame.rendered) activeRenderedFrames += 1;

    while (activeFrames.length > 1) {
      const oldestFrame = activeFrames[0];
      if (!oldestFrame || activeDurationMs - oldestFrame.durationMs < HEALTH_WINDOW_MS) break;
      const removedFrame = activeFrames.shift();
      if (!removedFrame) break;
      activeDurationMs -= removedFrame.durationMs;
      if (removedFrame.rendered) activeRenderedFrames -= 1;
    }

    const observedFps = activeRenderedFrames / (activeDurationMs / 1_000);
    downgrade = activeDurationMs >= HEALTH_WINDOW_MS && observedFps < target * HEALTH_RATIO;
    return downgrade;
  };

  return { record, reset };
}

function updatedRefreshFps(current: number, samples: readonly number[], deltaMs: number) {
  if (deltaMs < 4 || deltaMs > 50) return current;
  const next = [...samples, deltaMs].slice(-REFRESH_SAMPLE_COUNT);
  if (next.length < REFRESH_SAMPLE_COUNT) return current;
  const sorted = next.toSorted((left, right) => left - right);
  const median = sorted[Math.floor(sorted.length / 2)];
  const lower = sorted[Math.floor(sorted.length * 0.2)];
  const upper = sorted[Math.floor(sorted.length * 0.8)];
  if (median === undefined || lower === undefined || upper === undefined) return current;
  if ((upper - lower) / median > 0.12) return current;
  const candidate = 1_000 / median;
  return candidate > current + 4 ? candidate : current;
}
