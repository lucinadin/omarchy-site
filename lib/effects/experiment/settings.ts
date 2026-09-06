import { parseJsonObject } from "@/lib/json";
import { numberInRange } from "@/lib/settings/readers";
import { storageGet, storageSetJson } from "@/lib/settings/storage";

const storageKey = "omarchy.secret-lab:v1:experiment";

export const experimentModes = [
  { label: "Logo", value: "logo" },
  { label: "Orb", value: "orb" },
] as const;
type ExperimentMode = (typeof experimentModes)[number]["value"];

const defaultExperimentValues = {
  scale: 0.9,
  speed: 0.35,
  tilt: 0.55,
  ior: 1.45,
  dispersion: 0.12,
  frost: 0.15,
  light: 1.2,
  opacity: 0.85,
  fps: 30,
  wobble: 0.5,
};
export type ExperimentSettings = typeof defaultExperimentValues & { mode: ExperimentMode };
export const defaultExperimentSettings: ExperimentSettings = {
  ...defaultExperimentValues,
  mode: "logo",
};

export const experimentControls = [
  { key: "wobble", label: "Orb flow", minimum: 0, maximum: 1, step: 0.05, section: "Shape" },
  { key: "scale", label: "Size", minimum: 0.35, maximum: 1.5, step: 0.05, section: "Shape" },
  { key: "ior", label: "Refraction", minimum: 1, maximum: 2.4, step: 0.05, section: "Glass" },
  {
    key: "dispersion",
    label: "Dispersion",
    minimum: 0,
    maximum: 0.4,
    step: 0.01,
    section: "Glass",
  },
  { key: "frost", label: "Frost", minimum: 0, maximum: 1, step: 0.05, section: "Glass" },
  { key: "light", label: "Light", minimum: 0.2, maximum: 3, step: 0.1, section: "Glass" },
  { key: "opacity", label: "Presence", minimum: 0, maximum: 1, step: 0.05, section: "Glass" },
  { key: "speed", label: "Speed", minimum: 0, maximum: 2, step: 0.05, section: "Motion" },
  { key: "tilt", label: "Pointer tilt", minimum: 0, maximum: 1.5, step: 0.05, section: "Motion" },
  { key: "fps", label: "Frame rate", minimum: 12, maximum: 60, step: 1, section: "Motion" },
] as const;

export function parseExperimentSettings(value: string | null): ExperimentSettings {
  if (!value) return defaultExperimentSettings;
  try {
    const parsed = parseJsonObject(JSON.parse(value));
    if (!parsed) return defaultExperimentSettings;
    const result: ExperimentSettings = {
      ...defaultExperimentSettings,
      mode:
        experimentModes.find((mode) => mode.value === parsed.mode)?.value ??
        defaultExperimentSettings.mode,
    };
    for (const { key, minimum, maximum } of experimentControls) {
      result[key] = numberInRange(parsed[key], result[key], minimum, maximum);
    }
    return result;
  } catch {
    return defaultExperimentSettings;
  }
}

let snapshot = defaultExperimentSettings;
let initialized = false;
const listeners = new Set<() => void>();

function publish(next: ExperimentSettings) {
  if (
    snapshot.mode === next.mode &&
    experimentControls.every(({ key }) => snapshot[key] === next[key])
  )
    return;
  snapshot = next;
  for (const listener of listeners) listener();
}

export function getExperimentSnapshot() {
  if (!initialized && globalThis.window) {
    snapshot = parseExperimentSettings(storageGet(storageKey));
    initialized = true;
  }
  return snapshot;
}

export function getServerExperimentSnapshot() {
  return defaultExperimentSettings;
}

function onStorage(event: StorageEvent) {
  if (event.key === storageKey || event.key === null) {
    publish(parseExperimentSettings(storageGet(storageKey)));
  }
}

export function subscribeExperiment(listener: () => void) {
  getExperimentSnapshot();
  if (!listeners.size) {
    publish(parseExperimentSettings(storageGet(storageKey)));
    window.addEventListener("storage", onStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", onStorage);
  };
}

export function setExperimentSettings(update: Partial<ExperimentSettings>) {
  const next = parseExperimentSettings(JSON.stringify({ ...getExperimentSnapshot(), ...update }));
  publish(next);
  storageSetJson(storageKey, next);
}

export function resetExperimentSettings() {
  publish(defaultExperimentSettings);
  storageSetJson(storageKey, defaultExperimentSettings);
}
