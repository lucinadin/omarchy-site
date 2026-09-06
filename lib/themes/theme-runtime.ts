import { addTransitionType, startTransition } from "react";

import { clearLogoPreview } from "@/lib/effects/logo/preview";
import { isJsonArray, parseJsonObject, type JsonObject } from "@/lib/json";
import { notifySite } from "@/lib/site-notification-events";
import {
  isCommunityThemeIdentity,
  parseThemeColors,
} from "@/lib/themes/community-theme-validation";
import { defaultThemeId, omarchyThemes } from "@/lib/themes/official";
import {
  defaultThemeSkewAngle,
  normalizeThemeSkewAngle,
  themePreferenceKey,
  themeSkewAnglePreferenceKey,
} from "@/lib/themes/theme-constants";
import { getThemeStyle, type OmarchyTheme } from "@/lib/themes/themes";
import { isFiniteNumber } from "@/lib/validation";

export const themePreferenceEvent = "omarchy-theme-change";
export const themeAppliedEvent = "omarchy-theme-applied";

export type ThemeTransitionOrigin = {
  x: number;
  y: number;
};

export type ThemeViewTransitionType = "theme-apply" | "theme-revert";

type ThemePreferenceEventDetail = {
  origin?: ThemeTransitionOrigin;
  themeId: string;
  transitionType?: ThemeViewTransitionType;
};

type ThemeTriggerEvent = {
  clientX: number;
  clientY: number;
  currentTarget: HTMLElement;
};

const knownThemes = new Map<string, OmarchyTheme>(omarchyThemes.map((theme) => [theme.id, theme]));

export function registerThemes(themes: readonly OmarchyTheme[]) {
  for (const theme of themes) knownThemes.set(theme.id, theme);
}

export function getThemeById(value: string | null) {
  return value === null ? null : (knownThemes.get(value) ?? null);
}

function parsePersistedCommunityTheme(value: string) {
  let savedValue: unknown;
  try {
    savedValue = JSON.parse(value);
  } catch {
    return null;
  }

  const saved = parseJsonObject(savedValue);
  const themeValue = parseJsonObject(saved?.theme);
  const colors = parseThemeColors(themeValue?.colors);
  const styleValues = saved ? saved.styleValues : undefined;
  if (
    saved?.version !== 1 ||
    themeValue === null ||
    colors === null ||
    !isJsonArray(styleValues) ||
    !isCommunityThemeIdentity(themeValue)
  ) {
    return null;
  }

  const expectedWallpaper = `linear-gradient(${colors.background}, ${colors.background})`;
  if (themeValue.wallpaper !== expectedWallpaper) return null;

  const theme: OmarchyTheme = {
    colors,
    id: themeValue.id,
    kind: "community",
    mode: themeValue.mode,
    name: themeValue.name,
    wallpaper: expectedWallpaper,
  };
  const expectedStyleValues = Object.values(getThemeStyle(theme));
  if (
    styleValues.length !== expectedStyleValues.length ||
    styleValues.some((styleValue, index) => styleValue !== expectedStyleValues[index])
  ) {
    return null;
  }

  return theme;
}

export function getThemePreferenceEventDetail(event: Event): ThemePreferenceEventDetail | null {
  if (!(event instanceof CustomEvent)) return null;
  const detail = parseJsonObject(event.detail);
  if (detail === null) return null;
  const theme = isThemePreferenceReference(detail) ? getThemeById(detail.themeId) : null;
  if (theme === null) return null;

  const { transitionType } = detail;
  if (
    transitionType !== undefined &&
    transitionType !== "theme-apply" &&
    transitionType !== "theme-revert"
  ) {
    return null;
  }

  const { origin } = detail;
  if (origin !== undefined) {
    const parsedOrigin = parseJsonObject(origin);
    if (
      parsedOrigin === null ||
      !isFiniteNumber(parsedOrigin.x) ||
      !isFiniteNumber(parsedOrigin.y)
    ) {
      return null;
    }
    return {
      origin: { x: parsedOrigin.x, y: parsedOrigin.y },
      themeId: theme.id,
      transitionType,
    };
  }

  return { themeId: theme.id, transitionType };
}

function isThemePreferenceReference(value: JsonObject): value is JsonObject & { themeId: string } {
  return typeof value.themeId === "string";
}

export function getSavedTheme() {
  if (typeof window === "undefined") {
    return omarchyThemes.find((candidate) => candidate.id === defaultThemeId) ?? omarchyThemes[0];
  }

  let savedTheme: string | null = null;

  try {
    savedTheme = window.localStorage.getItem(themePreferenceKey);
  } catch {
    // Fall through to the stock theme when storage is unavailable.
  }

  const knownTheme = getThemeById(savedTheme);
  if (knownTheme) return knownTheme;

  const persistedTheme = savedTheme ? parsePersistedCommunityTheme(savedTheme) : null;
  if (persistedTheme) {
    registerThemes([persistedTheme]);
    return persistedTheme;
  }

  return getThemeById(defaultThemeId) ?? omarchyThemes[0];
}

export function isThemeCycleShortcut(
  event: Pick<
    KeyboardEvent,
    "altKey" | "code" | "ctrlKey" | "defaultPrevented" | "metaKey" | "repeat" | "shiftKey"
  >
) {
  return (
    !event.defaultPrevented &&
    !event.repeat &&
    event.code === "KeyT" &&
    event.metaKey &&
    event.ctrlKey &&
    event.shiftKey &&
    !event.altKey
  );
}

export function isThemePreferenceStorageEvent(
  event: Pick<StorageEvent, "key" | "storageArea">,
  expectedStorageArea: Storage
) {
  return event.key === themePreferenceKey && event.storageArea === expectedStorageArea;
}

export function getAppliedThemeId(): string {
  if (typeof document === "undefined") return getSavedTheme().id;
  const appliedThemeId = document.documentElement.dataset.theme ?? null;
  return getThemeById(appliedThemeId)?.id ?? getSavedTheme().id;
}

export function applyDocumentTheme(themeValue: OmarchyTheme) {
  const root = document.documentElement;
  if (root.dataset.theme !== themeValue.id) clearLogoPreview();
  root.dataset.theme = themeValue.id;
  root.style.colorScheme = themeValue.mode;

  for (const [property, value] of Object.entries(getThemeStyle(themeValue))) {
    root.style.setProperty(property, value);
  }

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", themeValue.colors.background);

  window.dispatchEvent(
    new CustomEvent<ThemePreferenceEventDetail>(themeAppliedEvent, {
      detail: { themeId: themeValue.id },
    })
  );
}

export function getThemeTransitionOrigin(event: ThemeTriggerEvent): ThemeTransitionOrigin {
  if (event.clientX !== 0 || event.clientY !== 0) {
    return { x: event.clientX, y: event.clientY };
  }

  const triggerBounds = event.currentTarget.getBoundingClientRect();
  return {
    x: triggerBounds.left + triggerBounds.width / 2,
    y: triggerBounds.top + triggerBounds.height / 2,
  };
}

export function setThemeTransitionOrigin(origin?: ThemeTransitionOrigin) {
  const root = document.documentElement;
  const viewportWidth = Math.max(root.clientWidth, window.innerWidth);
  const viewportHeight = Math.max(root.clientHeight, window.innerHeight);
  const x = Math.min(Math.max(origin?.x ?? viewportWidth / 2, 0), viewportWidth);
  const y = Math.min(Math.max(origin?.y ?? viewportHeight / 2, 0), viewportHeight);
  // The computed custom property includes the CSS `deg` unit, which Number intentionally rejects.
  // oxlint-disable-next-line unicorn/prefer-number-coercion
  const skewAngle = Number.parseFloat(
    window.getComputedStyle(root).getPropertyValue("--theme-skew-angle")
  );
  const skew =
    viewportHeight *
    Math.tan(((Number.isFinite(skewAngle) ? skewAngle : defaultThemeSkewAngle) * Math.PI) / 180);
  const verticalProgress = viewportHeight === 0 ? 0.5 : y / viewportHeight;
  const topX = x + skew * verticalProgress;
  const bottomX = x - skew * (1 - verticalProgress);

  root.style.setProperty("--theme-transition-skew", `${skew}px`);
  root.style.setProperty("--theme-origin-x", `${x}px`);
  root.style.setProperty("--theme-origin-y", `${y}px`);
  root.style.setProperty("--theme-origin-top-x", `${topX}px`);
  root.style.setProperty("--theme-origin-bottom-x", `${bottomX}px`);
}

export function runThemeViewTransition(type: ThemeViewTransitionType, update: () => void) {
  startTransition(() => {
    addTransitionType(type);
    update();
  });
}

export function getSavedThemeSkewAngle() {
  try {
    return normalizeThemeSkewAngle(window.localStorage.getItem(themeSkewAnglePreferenceKey));
  } catch {
    return defaultThemeSkewAngle;
  }
}

export function saveThemeSkewAngle(value: number) {
  const angle = normalizeThemeSkewAngle(value);
  document.documentElement.style.setProperty("--theme-skew-angle", `${angle}deg`);

  try {
    window.localStorage.setItem(themeSkewAnglePreferenceKey, String(angle));
  } catch {
    // The live setting still works when storage is unavailable.
  }

  return angle;
}

export function resetThemeSkewAngle() {
  document.documentElement.style.setProperty("--theme-skew-angle", `${defaultThemeSkewAngle}deg`);

  try {
    window.localStorage.removeItem(themeSkewAnglePreferenceKey);
  } catch {
    // The live reset still works when storage is unavailable.
  }

  return defaultThemeSkewAngle;
}

export function persistThemePreference(themeValue: OmarchyTheme) {
  registerThemes([themeValue]);
  const savedValue =
    themeValue.kind === "official"
      ? themeValue.id
      : JSON.stringify({
          styleValues: Object.values(getThemeStyle(themeValue)),
          theme: themeValue,
          version: 1,
        });

  try {
    window.localStorage.setItem(themePreferenceKey, savedValue);
  } catch {
    // The live theme change still works when storage is unavailable.
  }
}

export function previewTheme(
  themeValue: OmarchyTheme,
  origin?: ThemeTransitionOrigin,
  transitionType: ThemeViewTransitionType = "theme-apply"
) {
  registerThemes([themeValue]);
  const detail: ThemePreferenceEventDetail = { themeId: themeValue.id, transitionType };
  if (origin !== undefined) detail.origin = origin;

  window.dispatchEvent(
    new CustomEvent<ThemePreferenceEventDetail>(themePreferenceEvent, {
      detail,
    })
  );
}

export function saveThemePreference(themeValue: OmarchyTheme, origin?: ThemeTransitionOrigin) {
  persistThemePreference(themeValue);
  previewTheme(themeValue, origin);
}

export function getNextTheme(themeId: string) {
  const activeThemeIndex = omarchyThemes.findIndex((theme) => theme.id === themeId);
  return omarchyThemes[(activeThemeIndex + 1) % omarchyThemes.length];
}

export function cycleThemePreference() {
  const nextTheme = getNextTheme(getAppliedThemeId());
  saveThemePreference(nextTheme);
  notifySite(`Theme changed · ${nextTheme.name}`);
  return nextTheme;
}
