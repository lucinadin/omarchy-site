import type { LogoEffectPlayback, LogoEffectPresentation } from "@/lib/effects/logo/definition";

export const LOGO_GRADIENT_DIRECTIONS = ["horizontal", "vertical", "diagonal", "radial"] as const;

export const DEFAULT_LOGO_EFFECT_PRESENTATION = {
  contrast: 1,
  glow: 1,
  grayscale: 0,
  glyphs: { default: { kind: "source" }, overrides: {} },
  pixelSize: 1,
  saturation: 1,
  scanlines: 0,
} as const satisfies LogoEffectPresentation;

export const DEFAULT_LOGO_EFFECT_PLAYBACK = {
  ambientRate: 1,
  mode: "ambient",
  revealRate: 1,
} as const satisfies LogoEffectPlayback;

export const ONCE_LOGO_EFFECT_PLAYBACK = {
  mode: "once",
  revealRate: 1,
} as const satisfies LogoEffectPlayback;
