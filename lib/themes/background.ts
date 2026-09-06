import { parseJsonObject } from "@/lib/json";
import { storageGet, storageSetJson } from "@/lib/settings/storage";
import { isHexColor } from "@/lib/themes/community-theme-validation";
import { omarchyThemes, type OmarchyThemeId } from "@/lib/themes/official";

export const backgroundPreferenceKey = "omarchy-background:v1";

export type BackgroundPreference =
  | { kind: "automatic" }
  | { kind: "wallpaper"; themeId: OmarchyThemeId }
  | { kind: "solid"; color: string };

export const automaticBackground: BackgroundPreference = { kind: "automatic" };

export function parseBackgroundPreference(value: string | null): BackgroundPreference {
  if (!value) return automaticBackground;
  try {
    const saved = parseJsonObject(JSON.parse(value));
    if (saved?.kind === "solid" && isHexColor(saved.color)) {
      return { kind: "solid", color: saved.color };
    }
    if (saved?.kind === "wallpaper") {
      const theme = omarchyThemes.find((candidate) => candidate.id === saved.themeId);
      if (theme) return { kind: "wallpaper", themeId: theme.id };
    }
  } catch {
    return automaticBackground;
  }
  return automaticBackground;
}

let snapshot: BackgroundPreference = automaticBackground;
let initialized = false;
const listeners = new Set<() => void>();

export function getBackgroundSnapshot() {
  if (!initialized && typeof window !== "undefined") {
    snapshot = parseBackgroundPreference(storageGet(backgroundPreferenceKey));
    initialized = true;
  }
  return snapshot;
}

export function getServerBackgroundSnapshot() {
  return automaticBackground;
}

export function previewBackground(preference: BackgroundPreference) {
  snapshot = preference;
  initialized = true;
  for (const listener of listeners) listener();
}

export function persistBackground(preference: BackgroundPreference) {
  storageSetJson(backgroundPreferenceKey, preference);
  previewBackground(preference);
}

function onStorage(event: StorageEvent) {
  if (event.key === backgroundPreferenceKey || event.key === null) {
    previewBackground(parseBackgroundPreference(storageGet(backgroundPreferenceKey)));
  }
}

export function subscribeBackground(listener: () => void) {
  if (!listeners.size) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", onStorage);
  };
}

export function resolveBackground(preference: BackgroundPreference, themeId: string | null) {
  if (preference.kind === "solid") return preference;
  const id = preference.kind === "wallpaper" ? preference.themeId : themeId;
  const theme = omarchyThemes.find((candidate) => candidate.id === id);
  return theme ? { kind: "wallpaper" as const, themeId: theme.id } : null;
}
