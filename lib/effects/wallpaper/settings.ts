import { parseJsonObject } from "@/lib/json";
import { numberInRange } from "@/lib/settings/readers";
import { storageGet, storageSetJson } from "@/lib/settings/storage";

const storageKey = "omarchy.secret-lab:v1:wallpaper-parallax";

export type WallpaperParallaxSettings = {
  enabled: boolean;
  pointer: number;
  scroll: number;
  smoothing: number;
};

export const wallpaperParallaxLimits = {
  pointer: { minimum: 0, maximum: 48 },
  scroll: { minimum: 0, maximum: 120 },
  smoothing: { minimum: 0, maximum: 600 },
} as const;

export const defaultWallpaperParallaxSettings: WallpaperParallaxSettings = {
  enabled: true,
  pointer: 10,
  scroll: 0,
  smoothing: 480,
};

export function parseWallpaperParallaxSettings(value: string | null): WallpaperParallaxSettings {
  if (value === null) return defaultWallpaperParallaxSettings;
  try {
    const parsed = parseJsonObject(JSON.parse(value));
    if (!parsed) return defaultWallpaperParallaxSettings;
    return {
      enabled:
        parsed.enabled === true || parsed.enabled === false
          ? parsed.enabled
          : defaultWallpaperParallaxSettings.enabled,
      pointer: numberInRange(
        parsed.pointer,
        defaultWallpaperParallaxSettings.pointer,
        wallpaperParallaxLimits.pointer.minimum,
        wallpaperParallaxLimits.pointer.maximum
      ),
      scroll: numberInRange(
        parsed.scroll,
        defaultWallpaperParallaxSettings.scroll,
        wallpaperParallaxLimits.scroll.minimum,
        wallpaperParallaxLimits.scroll.maximum
      ),
      smoothing: numberInRange(
        parsed.smoothing,
        defaultWallpaperParallaxSettings.smoothing,
        wallpaperParallaxLimits.smoothing.minimum,
        wallpaperParallaxLimits.smoothing.maximum
      ),
    };
  } catch {
    return defaultWallpaperParallaxSettings;
  }
}

let snapshot = defaultWallpaperParallaxSettings;
let initialized = false;
const listeners = new Set<() => void>();

function publish(next: WallpaperParallaxSettings) {
  if (
    snapshot.enabled === next.enabled &&
    snapshot.pointer === next.pointer &&
    snapshot.scroll === next.scroll &&
    snapshot.smoothing === next.smoothing
  )
    return;
  snapshot = next;
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key === storageKey || event.key === null) {
    publish(parseWallpaperParallaxSettings(storageGet(storageKey)));
  }
}

export function getWallpaperParallaxSnapshot() {
  if (!initialized && typeof window !== "undefined") {
    snapshot = parseWallpaperParallaxSettings(storageGet(storageKey));
    initialized = true;
  }
  return snapshot;
}

export function getServerWallpaperParallaxSnapshot() {
  return defaultWallpaperParallaxSettings;
}

export function subscribeWallpaperParallax(listener: () => void) {
  getWallpaperParallaxSnapshot();
  if (listeners.size === 0) {
    publish(parseWallpaperParallaxSettings(storageGet(storageKey)));
    window.addEventListener("storage", onStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function setWallpaperParallaxSettings(update: Partial<WallpaperParallaxSettings>) {
  const next = parseWallpaperParallaxSettings(
    JSON.stringify({ ...getWallpaperParallaxSnapshot(), ...update })
  );
  publish(next);
  storageSetJson(storageKey, next);
}

export function resetWallpaperParallaxSettings() {
  publish(defaultWallpaperParallaxSettings);
  storageSetJson(storageKey, defaultWallpaperParallaxSettings);
}
