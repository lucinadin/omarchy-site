import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import {
  OMARCHY_MARK_COLUMNS as COLUMNS,
  OMARCHY_MARK_ROWS as ROWS,
} from "@/lib/effects/logo/mark";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { easeInOutCirc } from "@/lib/effects/logo/runtime/easing";
import { clamp, hashUnit } from "@/lib/effects/logo/runtime/math";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  logoEffectField,
  type LogoEffectRuntimeValues,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { LogoEffectContext } from "@/lib/effects/logo/types";

const schema = defineLogoEffectSchema({
  timing: logoEffectField.group({
    fields: {
      initialDelayMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 2_000, minimum: 0, step: 10 },
        label: "Initial delay",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      phaseDurationMs: logoEffectField.number({
        constraint: { minimum: 100 },
        editor: { maximum: 5_000, minimum: 100, step: 50 },
        label: "Sweep duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      betweenSweepsMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 3_000, minimum: 0, step: 20 },
        label: "Between sweeps",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      shimmerFrameMs: logoEffectField.number({
        constraint: { minimum: 5 },
        editor: { maximum: 250, minimum: 5, step: 1 },
        label: "Shimmer frame",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      settleDurationMs: logoEffectField.number({
        constraint: { minimum: 1 },
        editor: { maximum: 2_000, minimum: 1, step: 10 },
        label: "Settle duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      endHoldMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 3_000, minimum: 0, step: 25 },
        label: "End hold",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  glyphs: logoEffectField.group({
    fields: {
      shimmer: logoEffectField.symbols({
        constraint: { maximumItems: 16, minimumItems: 1 },
        label: "Shimmer symbols",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Glyphs",
    tier: "identity",
  }),
  appearance: logoEffectField.group({
    fields: {
      intensity: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Glow intensity",
        tier: "identity",
        update: "live",
      }),
      grayBrightness: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Gray brightness",
        tier: "advanced",
        update: "live",
      }),
      firstPassFlash: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "First-pass flash",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

function revealDurationMs(values: Values) {
  return (
    values.timing.phaseDurationMs * 2 +
    values.timing.betweenSweepsMs +
    values.glyphs.shimmer.length * values.timing.shimmerFrameMs +
    values.timing.settleDurationMs +
    values.timing.endHoldMs
  );
}

function createRuntime({ cells, palette, seed }: LogoEffectContext, values: Values) {
  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs,
    sample(cell, frame, current) {
      const position = cell.column / (COLUMNS - 1);
      const phaseMs = current.timing.phaseDurationMs;
      const firstAt = current.timing.initialDelayMs + easeInOutCirc(1 - position) * phaseMs;
      const firstAge = frame.revealMs - firstAt;
      if (firstAge < 0) return null;

      const shimmerFrameMs = current.timing.shimmerFrameMs;
      const firstFrame = Math.floor(firstAge / shimmerFrameMs);
      const gray = mixColor(palette.muted, palette.bright, current.appearance.grayBrightness);
      if (firstFrame < current.glyphs.shimmer.length) {
        return {
          color: mixColor(
            gray,
            palette.bright,
            (1 - firstFrame / current.glyphs.shimmer.length) * current.appearance.firstPassFlash
          ),
          glow:
            (1 - firstFrame / current.glyphs.shimmer.length) * current.appearance.intensity * 0.5,
          glyph: current.glyphs.shimmer[firstFrame],
        };
      }

      const secondStart = phaseMs + current.timing.betweenSweepsMs;
      const secondAt = secondStart + easeInOutCirc(position) * phaseMs;
      const secondAge = frame.revealMs - secondAt;
      if (secondAge < 0) return { color: gray, glyph: cell.glyph };

      const secondFrame = Math.floor(secondAge / shimmerFrameMs);
      const baseColor = logoCellColor(cell, palette, ROWS);
      if (secondFrame < current.glyphs.shimmer.length) {
        const accent =
          palette.ciphertext[
            Math.floor(hashUnit(seed, cell.index * 71 + secondFrame) * palette.ciphertext.length)
          ];
        return {
          color: mixColor(accent, palette.bright, 1 - secondFrame / current.glyphs.shimmer.length),
          glow: (1 - secondFrame / current.glyphs.shimmer.length) * current.appearance.intensity,
          glyph: current.glyphs.shimmer[secondFrame],
        };
      }

      const settle = clamp(
        (secondAge - current.glyphs.shimmer.length * shimmerFrameMs) /
          current.timing.settleDurationMs
      );
      return {
        color: mixColor(palette.bright, baseColor, settle),
        glow: (1 - settle) * current.appearance.intensity * 0.5,
        glyph: cell.glyph,
      };
    },
  });
}

export const logoEffect = defineLogoEffect({
  createRuntime,
  defaults: {
    capabilities: { ambient: false },
    playback: ONCE_LOGO_EFFECT_PLAYBACK,
    presentation: DEFAULT_LOGO_EFFECT_PRESENTATION,
    values: {
      appearance: { firstPassFlash: 0.35, grayBrightness: 0.18, intensity: 0.75 },
      glyphs: { shimmer: ["█", "▓", "▒", "░"] },
      timing: {
        betweenSweepsMs: 580,
        endHoldMs: 125,
        initialDelayMs: 120,
        phaseDurationMs: 1_350,
        settleDurationMs: 260,
        shimmerFrameMs: 58.8,
      },
    },
  },
  id: "sweep",
  label: "Sweep",
  schema,
  source: createTtfxSourceReference("sweep", "src/effects/sweep.rs"),
});
