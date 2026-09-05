import type { JsonObject } from "@/lib/json";
import type { ColorAdjustmentSettings } from "@/lib/rendering/types";
import { numberInRange } from "@/lib/settings/readers";

export type ScreenPatternSettings = {
  dither: number;
  grain: number;
  intensity: number;
  scanlines: number;
  vignette: number;
};

export type CaptureEffectSettings = ColorAdjustmentSettings &
  ScreenPatternSettings & {
    bayerMatrixSize: 2 | 4 | 8;
    chromaticAberration: number;
    curvature: number;
    ditherPattern: "bayer" | "halftone";
    halftoneAngle: number;
    halftoneDotSize: number;
    paletteLevels: number;
    patternScale: number;
    scanlineSpacing: number;
    scanlineThickness: number;
  };

export type OverlayEffectSettings = ScreenPatternSettings;

export const DEFAULT_CAPTURE_EFFECT_SETTINGS: CaptureEffectSettings = {
  bayerMatrixSize: 4,
  chromaticAberration: 0.35,
  contrast: 1,
  curvature: 0.22,
  dither: 0.45,
  ditherPattern: "bayer",
  grain: 0.28,
  grayscale: 0,
  halftoneAngle: 45,
  halftoneDotSize: 1,
  intensity: 0.8,
  paletteLevels: 8,
  patternScale: 1,
  saturation: 1,
  scanlineSpacing: 2,
  scanlineThickness: 0.5,
  scanlines: 0.48,
  vignette: 0.42,
};

export const DEFAULT_OVERLAY_EFFECT_SETTINGS: OverlayEffectSettings = {
  dither: 0.18,
  grain: 0.28,
  intensity: 0.65,
  scanlines: 0.5,
  vignette: 0.36,
};

function normalizePatternSettings(
  input: JsonObject,
  defaults: ScreenPatternSettings
): ScreenPatternSettings {
  return {
    dither: numberInRange(input.dither, defaults.dither),
    grain: numberInRange(input.grain, defaults.grain),
    intensity: numberInRange(input.intensity, defaults.intensity),
    scanlines: numberInRange(input.scanlines, defaults.scanlines),
    vignette: numberInRange(input.vignette, defaults.vignette),
  };
}

export function normalizeCaptureEffectSettings(input: JsonObject): CaptureEffectSettings {
  const bayerMatrixSize = input.bayerMatrixSize;
  const ditherPattern = input.ditherPattern;
  return {
    ...normalizePatternSettings(input, DEFAULT_CAPTURE_EFFECT_SETTINGS),
    bayerMatrixSize:
      bayerMatrixSize === 2 || bayerMatrixSize === 4 || bayerMatrixSize === 8
        ? bayerMatrixSize
        : DEFAULT_CAPTURE_EFFECT_SETTINGS.bayerMatrixSize,
    chromaticAberration: numberInRange(
      input.chromaticAberration,
      DEFAULT_CAPTURE_EFFECT_SETTINGS.chromaticAberration
    ),
    contrast: numberInRange(input.contrast, DEFAULT_CAPTURE_EFFECT_SETTINGS.contrast, 0.5, 1.5),
    curvature: numberInRange(input.curvature, DEFAULT_CAPTURE_EFFECT_SETTINGS.curvature),
    ditherPattern:
      ditherPattern === "bayer" || ditherPattern === "halftone"
        ? ditherPattern
        : DEFAULT_CAPTURE_EFFECT_SETTINGS.ditherPattern,
    grayscale: numberInRange(input.grayscale, DEFAULT_CAPTURE_EFFECT_SETTINGS.grayscale),
    halftoneAngle: numberInRange(
      input.halftoneAngle,
      DEFAULT_CAPTURE_EFFECT_SETTINGS.halftoneAngle,
      0,
      180
    ),
    halftoneDotSize: numberInRange(
      input.halftoneDotSize,
      DEFAULT_CAPTURE_EFFECT_SETTINGS.halftoneDotSize,
      0.25,
      1.5
    ),
    paletteLevels: Math.round(
      numberInRange(input.paletteLevels, DEFAULT_CAPTURE_EFFECT_SETTINGS.paletteLevels, 2, 16)
    ),
    patternScale: numberInRange(
      input.patternScale,
      DEFAULT_CAPTURE_EFFECT_SETTINGS.patternScale,
      1,
      8
    ),
    saturation: numberInRange(input.saturation, DEFAULT_CAPTURE_EFFECT_SETTINGS.saturation, 0, 2),
    scanlineSpacing: numberInRange(
      input.scanlineSpacing,
      DEFAULT_CAPTURE_EFFECT_SETTINGS.scanlineSpacing,
      1,
      8
    ),
    scanlineThickness: numberInRange(
      input.scanlineThickness,
      DEFAULT_CAPTURE_EFFECT_SETTINGS.scanlineThickness,
      0.1,
      0.9
    ),
  };
}

export function normalizeOverlayEffectSettings(input: JsonObject): OverlayEffectSettings {
  return normalizePatternSettings(input, DEFAULT_OVERLAY_EFFECT_SETTINGS);
}
