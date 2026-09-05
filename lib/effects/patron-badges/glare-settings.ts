import type { FoilDebugView, FoilMaskMode } from "@/lib/effects/foil/settings";
import { parseJsonObject, type JsonValue } from "@/lib/json";
import { numberInRange } from "@/lib/settings/readers";
import { storageGet, storageSetJson } from "@/lib/settings/storage";

const STORAGE_KEY = "omarchy.secret-lab:v1:patron-badge-glare";

export type PatronBadgeGlareSettings = {
  bandWidth: number;
  color: number;
  debugView: FoilDebugView;
  edgeStrength: number;
  edgeWidth: number;
  foilTexture: number;
  glareIntensity: number;
  grooveAngle: number;
  grooveDensity: number;
  lightHeight: number;
  lightRadius: number;
  maskMode: FoilMaskMode;
  rainbowDensity: number;
  relief: number;
  roughness: number;
  sparkleDensity: number;
  sparkleStrength: number;
  surfaceStrength: number;
  textureBrightness: number;
  textureSoftness: number;
  textureThreshold: number;
  tiltDegrees: number;
};

export const patronBadgeGlareLimits = {
  bandWidth: { maximum: 2, minimum: 0.5 },
  color: { maximum: 1, minimum: 0 },
  edgeStrength: { maximum: 2, minimum: 0 },
  edgeWidth: { maximum: 12, minimum: 0.5 },
  foilTexture: { maximum: 2, minimum: 0 },
  glareIntensity: { maximum: 2, minimum: 0 },
  grooveAngle: { maximum: 180, minimum: -180 },
  grooveDensity: { maximum: 96, minimum: 4 },
  lightHeight: { maximum: 1.2, minimum: 0.08 },
  lightRadius: { maximum: 1, minimum: 0.08 },
  rainbowDensity: { maximum: 24, minimum: 1 },
  relief: { maximum: 3, minimum: 0 },
  roughness: { maximum: 1, minimum: 0.05 },
  sparkleDensity: { maximum: 160, minimum: 16 },
  sparkleStrength: { maximum: 2, minimum: 0 },
  surfaceStrength: { maximum: 2, minimum: 0 },
  textureBrightness: { maximum: 0.8, minimum: 0 },
  textureSoftness: { maximum: 0.8, minimum: 0.05 },
  textureThreshold: { maximum: 0.8, minimum: 0 },
  tiltDegrees: { maximum: 8, minimum: 0 },
} as const;

export const defaultPatronBadgeGlareSettings: PatronBadgeGlareSettings = {
  bandWidth: 1.8,
  color: 0.3,
  debugView: "final",
  edgeStrength: 0.3,
  edgeWidth: 5.5,
  foilTexture: 2,
  glareIntensity: 0.7,
  grooveAngle: 31,
  grooveDensity: 4,
  lightHeight: 1.06,
  lightRadius: 1,
  maskMode: "texture-and-edges",
  rainbowDensity: 1,
  relief: 2.45,
  roughness: 0.86,
  sparkleDensity: 160,
  sparkleStrength: 2,
  surfaceStrength: 0.4,
  textureBrightness: 0.48,
  textureSoftness: 0.65,
  textureThreshold: 0,
  tiltDegrees: 6,
};

const listeners = new Set<() => void>();
let initialized = false;
let settings = defaultPatronBadgeGlareSettings;

function normalizeMaskMode(value: JsonValue | undefined) {
  if (value === "edges" || value === "texture" || value === "texture-and-edges") {
    return value;
  }
  if (value === "accent" || value === "surface") return "texture";
  if (value === "accent-and-edges" || value === "both" || value === "edge") {
    return "texture-and-edges";
  }
  return defaultPatronBadgeGlareSettings.maskMode;
}

function normalizeDebugView(value: JsonValue | undefined) {
  if (
    value === "coverage" ||
    value === "edges" ||
    value === "final" ||
    value === "normals" ||
    value === "reflection"
  ) {
    return value;
  }
  return defaultPatronBadgeGlareSettings.debugView;
}

export function parsePatronBadgeGlareSettings(value: string | null) {
  if (value === null) return defaultPatronBadgeGlareSettings;

  try {
    const parsed = parseJsonObject(JSON.parse(value));
    if (parsed === null) return defaultPatronBadgeGlareSettings;
    return {
      bandWidth: numberInRange(
        parsed.bandWidth,
        defaultPatronBadgeGlareSettings.bandWidth,
        patronBadgeGlareLimits.bandWidth.minimum,
        patronBadgeGlareLimits.bandWidth.maximum
      ),
      color: numberInRange(
        parsed.color,
        defaultPatronBadgeGlareSettings.color,
        patronBadgeGlareLimits.color.minimum,
        patronBadgeGlareLimits.color.maximum
      ),
      debugView: normalizeDebugView(parsed.debugView),
      edgeStrength: numberInRange(
        parsed.edgeStrength,
        defaultPatronBadgeGlareSettings.edgeStrength,
        patronBadgeGlareLimits.edgeStrength.minimum,
        patronBadgeGlareLimits.edgeStrength.maximum
      ),
      edgeWidth: numberInRange(
        parsed.edgeWidth,
        defaultPatronBadgeGlareSettings.edgeWidth,
        patronBadgeGlareLimits.edgeWidth.minimum,
        patronBadgeGlareLimits.edgeWidth.maximum
      ),
      foilTexture: numberInRange(
        parsed.foilTexture,
        defaultPatronBadgeGlareSettings.foilTexture,
        patronBadgeGlareLimits.foilTexture.minimum,
        patronBadgeGlareLimits.foilTexture.maximum
      ),
      glareIntensity: numberInRange(
        parsed.glareIntensity,
        defaultPatronBadgeGlareSettings.glareIntensity,
        patronBadgeGlareLimits.glareIntensity.minimum,
        patronBadgeGlareLimits.glareIntensity.maximum
      ),
      grooveAngle: numberInRange(
        parsed.grooveAngle,
        defaultPatronBadgeGlareSettings.grooveAngle,
        patronBadgeGlareLimits.grooveAngle.minimum,
        patronBadgeGlareLimits.grooveAngle.maximum
      ),
      grooveDensity: numberInRange(
        parsed.grooveDensity,
        defaultPatronBadgeGlareSettings.grooveDensity,
        patronBadgeGlareLimits.grooveDensity.minimum,
        patronBadgeGlareLimits.grooveDensity.maximum
      ),
      lightHeight: numberInRange(
        parsed.lightHeight,
        defaultPatronBadgeGlareSettings.lightHeight,
        patronBadgeGlareLimits.lightHeight.minimum,
        patronBadgeGlareLimits.lightHeight.maximum
      ),
      lightRadius: numberInRange(
        parsed.lightRadius,
        defaultPatronBadgeGlareSettings.lightRadius,
        patronBadgeGlareLimits.lightRadius.minimum,
        patronBadgeGlareLimits.lightRadius.maximum
      ),
      maskMode: normalizeMaskMode(parsed.maskMode),
      rainbowDensity: numberInRange(
        parsed.rainbowDensity,
        defaultPatronBadgeGlareSettings.rainbowDensity,
        patronBadgeGlareLimits.rainbowDensity.minimum,
        patronBadgeGlareLimits.rainbowDensity.maximum
      ),
      relief: numberInRange(
        parsed.relief,
        defaultPatronBadgeGlareSettings.relief,
        patronBadgeGlareLimits.relief.minimum,
        patronBadgeGlareLimits.relief.maximum
      ),
      roughness: numberInRange(
        parsed.roughness,
        defaultPatronBadgeGlareSettings.roughness,
        patronBadgeGlareLimits.roughness.minimum,
        patronBadgeGlareLimits.roughness.maximum
      ),
      sparkleDensity: numberInRange(
        parsed.sparkleDensity,
        defaultPatronBadgeGlareSettings.sparkleDensity,
        patronBadgeGlareLimits.sparkleDensity.minimum,
        patronBadgeGlareLimits.sparkleDensity.maximum
      ),
      sparkleStrength: numberInRange(
        parsed.sparkleStrength,
        defaultPatronBadgeGlareSettings.sparkleStrength,
        patronBadgeGlareLimits.sparkleStrength.minimum,
        patronBadgeGlareLimits.sparkleStrength.maximum
      ),
      surfaceStrength: numberInRange(
        parsed.surfaceStrength,
        defaultPatronBadgeGlareSettings.surfaceStrength,
        patronBadgeGlareLimits.surfaceStrength.minimum,
        patronBadgeGlareLimits.surfaceStrength.maximum
      ),
      textureBrightness: numberInRange(
        parsed.textureBrightness ?? parsed.accentBrightness,
        defaultPatronBadgeGlareSettings.textureBrightness,
        patronBadgeGlareLimits.textureBrightness.minimum,
        patronBadgeGlareLimits.textureBrightness.maximum
      ),
      textureSoftness: numberInRange(
        parsed.textureSoftness ?? parsed.accentSoftness,
        defaultPatronBadgeGlareSettings.textureSoftness,
        patronBadgeGlareLimits.textureSoftness.minimum,
        patronBadgeGlareLimits.textureSoftness.maximum
      ),
      textureThreshold: numberInRange(
        parsed.textureThreshold ?? parsed.accentThreshold,
        defaultPatronBadgeGlareSettings.textureThreshold,
        patronBadgeGlareLimits.textureThreshold.minimum,
        patronBadgeGlareLimits.textureThreshold.maximum
      ),
      tiltDegrees: numberInRange(
        parsed.tiltDegrees,
        defaultPatronBadgeGlareSettings.tiltDegrees,
        patronBadgeGlareLimits.tiltDegrees.minimum,
        patronBadgeGlareLimits.tiltDegrees.maximum
      ),
    } satisfies PatronBadgeGlareSettings;
  } catch {
    return defaultPatronBadgeGlareSettings;
  }
}

function sameSettings(left: PatronBadgeGlareSettings, right: PatronBadgeGlareSettings) {
  const entries = Object.entries(left);
  const rightEntries = Object.entries(right);
  return (
    entries.length === rightEntries.length &&
    entries.every(([key, value]) =>
      rightEntries.some(([rightKey, rightValue]) => rightKey === key && rightValue === value)
    )
  );
}

function publish(nextSettings: PatronBadgeGlareSettings, force = false) {
  if (!force && sameSettings(settings, nextSettings)) return;
  settings = nextSettings;
  for (const listener of listeners) listener();
}

function initialize() {
  if (initialized || !globalThis.window) return;
  initialized = true;
  publish(parsePatronBadgeGlareSettings(storageGet(STORAGE_KEY)));

  globalThis.window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    publish(parsePatronBadgeGlareSettings(event.newValue));
  });
}

export function getPatronBadgeGlareSnapshot() {
  initialize();
  return settings;
}

export function getServerPatronBadgeGlareSnapshot() {
  return defaultPatronBadgeGlareSettings;
}

export function subscribePatronBadgeGlare(listener: () => void) {
  initialize();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setPatronBadgeGlareSettings(update: Partial<PatronBadgeGlareSettings>) {
  initialize();
  const nextSettings = parsePatronBadgeGlareSettings(JSON.stringify({ ...settings, ...update }));
  publish(nextSettings);
  if (globalThis.window) {
    storageSetJson(STORAGE_KEY, nextSettings);
  }
}

export function resetPatronBadgeGlareSettings() {
  initialize();
  publish(defaultPatronBadgeGlareSettings, true);
  if (globalThis.window) {
    storageSetJson(STORAGE_KEY, defaultPatronBadgeGlareSettings);
  }
}
