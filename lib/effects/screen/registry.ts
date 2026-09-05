import type { CaptureEffectSettings, OverlayEffectSettings } from "@/lib/effects/screen/settings";
import type { JsonValue } from "@/lib/json";
import { findCatalogId } from "@/lib/validation";

export const CAPTURE_EFFECTS = [
  {
    id: "crt",
    label: "CRT",
    settings: {
      bayerMatrixSize: 4,
      chromaticAberration: 0.35,
      contrast: 1,
      curvature: 0.22,
      dither: 0.2,
      ditherPattern: "bayer",
      grain: 0.28,
      grayscale: 0,
      halftoneAngle: 45,
      halftoneDotSize: 1,
      intensity: 0.8,
      paletteLevels: 10,
      patternScale: 1,
      saturation: 1,
      scanlineSpacing: 2,
      scanlineThickness: 0.5,
      scanlines: 0.48,
      vignette: 0.42,
    } satisfies CaptureEffectSettings,
  },
  {
    id: "grain",
    label: "Grain",
    settings: {
      bayerMatrixSize: 4,
      chromaticAberration: 0,
      contrast: 1,
      curvature: 0,
      dither: 0,
      ditherPattern: "bayer",
      grain: 0.42,
      grayscale: 0,
      halftoneAngle: 45,
      halftoneDotSize: 1,
      intensity: 0.75,
      paletteLevels: 16,
      patternScale: 1,
      saturation: 1,
      scanlineSpacing: 2,
      scanlineThickness: 0.5,
      scanlines: 0,
      vignette: 0.08,
    } satisfies CaptureEffectSettings,
  },
  {
    id: "dither",
    label: "Dither",
    settings: {
      bayerMatrixSize: 4,
      chromaticAberration: 0,
      contrast: 1,
      curvature: 0,
      dither: 0.82,
      ditherPattern: "bayer",
      grain: 0.04,
      grayscale: 0,
      halftoneAngle: 45,
      halftoneDotSize: 1,
      intensity: 0.9,
      paletteLevels: 6,
      patternScale: 1,
      saturation: 1,
      scanlineSpacing: 2,
      scanlineThickness: 0.5,
      scanlines: 0,
      vignette: 0.08,
    } satisfies CaptureEffectSettings,
  },
] as const;

export const OVERLAY_EFFECTS = [
  {
    id: "crt-mask",
    label: "CRT mask",
    settings: {
      dither: 0.08,
      grain: 0.24,
      intensity: 0.62,
      scanlines: 0.62,
      vignette: 0.46,
    } satisfies OverlayEffectSettings,
  },
  {
    id: "grain",
    label: "Grain",
    settings: {
      dither: 0,
      grain: 0.72,
      intensity: 0.7,
      scanlines: 0,
      vignette: 0,
    } satisfies OverlayEffectSettings,
  },
  {
    id: "dither",
    label: "Dither mask",
    settings: {
      dither: 0.72,
      grain: 0,
      intensity: 0.48,
      scanlines: 0,
      vignette: 0,
    } satisfies OverlayEffectSettings,
  },
  {
    id: "scanlines",
    label: "Scanlines",
    settings: {
      dither: 0,
      grain: 0,
      intensity: 0.62,
      scanlines: 0.78,
      vignette: 0,
    } satisfies OverlayEffectSettings,
  },
] as const;

export const SCREEN_OVERLAY_TARGETS = [
  { id: "hero", label: "Hero screen" },
  { id: "viewport", label: "Full viewport" },
] as const;

export type CaptureEffectId = "off" | (typeof CAPTURE_EFFECTS)[number]["id"];
export type OverlayEffectId = "off" | (typeof OVERLAY_EFFECTS)[number]["id"];
export type ScreenOverlayTargetId = (typeof SCREEN_OVERLAY_TARGETS)[number]["id"];

export function parseCaptureEffectId(value: JsonValue | undefined): CaptureEffectId | null {
  if (value === "off") return value;
  return findCatalogId(CAPTURE_EFFECTS, value);
}

export function parseOverlayEffectId(value: JsonValue | undefined): OverlayEffectId | null {
  if (value === "off") return value;
  return findCatalogId(OVERLAY_EFFECTS, value);
}

export function parseScreenOverlayTargetId(
  value: JsonValue | undefined
): ScreenOverlayTargetId | null {
  return findCatalogId(SCREEN_OVERLAY_TARGETS, value);
}
