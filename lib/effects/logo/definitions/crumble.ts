import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { easeInOutSine, easeOutBounce, easeOutCubic } from "@/lib/effects/logo/runtime/easing";
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
import { clamp, hashUnit } from "@/lib/effects/logo/runtime/math";
import { interpolatePoint, quadraticBezier } from "@/lib/effects/logo/runtime/path";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  logoEffectField,
  type LogoEffectRuntimeValues,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { LogoEffectContext } from "@/lib/effects/logo/types";

const DUST_GLYPHS = ["*", ".", ","] as const;

const schema = defineLogoEffectSchema({
  timing: logoEffectField.group({
    fields: {
      durationMs: logoEffectField.number({
        constraint: { minimum: 500 },
        editor: { maximum: 10_000, minimum: 500, step: 50 },
        label: "Duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      fallSpreadFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Fall spread",
        tier: "identity",
        update: "live",
      }),
      fallDurationFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Fall time",
        tier: "identity",
        update: "live",
      }),
      vacuumStartFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Vacuum start",
        tier: "advanced",
        update: "live",
      }),
      vacuumDurationFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Vacuum time",
        tier: "identity",
        update: "live",
      }),
      resetStartFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Reset start",
        tier: "advanced",
        update: "live",
      }),
      resetDurationFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Reset time",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  motion: logoEffectField.group({
    fields: {
      bottomOverscanRows: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.25 },
        label: "Bottom overscan",
        tier: "advanced",
        update: "live",
      }),
      topOverscanRows: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.25 },
        label: "Top overscan",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Motion",
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
      resetGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Reset glow",
        tier: "advanced",
        update: "live",
      }),
      initialMutedMix: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Initial dimming",
        tier: "advanced",
        update: "live",
      }),
      fallenMutedMix: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Fallen dimming",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
  glyphs: logoEffectField.group({
    fields: {
      dustSymbols: logoEffectField.symbols({
        constraint: { maximumItems: 32, minimumItems: 1 },
        label: "Dust symbols",
        tier: "identity",
        update: "live",
      }),
      dustStartProgress: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Dust transition",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Glyphs",
    tier: "identity",
  }),
});

function createRuntime(
  { cells, palette, seed }: LogoEffectContext,
  values: LogoEffectRuntimeValues<typeof schema>
) {
  const bounds = getLogoBounds(cells);
  const shuffled = cells
    .map((cell) => cell.index)
    .toSorted((left, right) => hashUnit(seed, left * 397 + 3) - hashUnit(seed, right * 397 + 3));
  const rank = new Uint32Array(cells.length);
  shuffled.forEach((cellIndex, index) => {
    rank[cellIndex] = index;
  });

  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const progress = clamp(frame.revealMs / current.timing.durationMs);
      const fallAt =
        (rank[cell.index] / Math.max(1, cells.length - 1)) * current.timing.fallSpreadFraction;
      const bottom = { column: cell.column, row: bounds.rows + current.motion.bottomOverscanRows };
      const top = { column: cell.column, row: -current.motion.topOverscanRows };
      let point = { column: cell.column, row: cell.row };
      let glyph: string = cell.glyph;
      let color = mixColor(
        logoCellColor(cell, palette, bounds.rows),
        palette.muted,
        current.appearance.initialMutedMix
      );
      let glow = 0;

      if (progress < current.timing.vacuumStartFraction) {
        const fall = easeOutBounce(
          clamp((progress - fallAt) / current.timing.fallDurationFraction)
        );
        point = interpolatePoint(cell, bottom, fall);
        if (fall > current.glyphs.dustStartProgress)
          glyph = current.glyphs.dustSymbols[cell.index % current.glyphs.dustSymbols.length];
        color = mixColor(color, palette.muted, fall * current.appearance.fallenMutedMix);
      } else if (progress < current.timing.resetStartFraction) {
        const vacuum = easeOutCubic(
          (progress - current.timing.vacuumStartFraction) / current.timing.vacuumDurationFraction
        );
        point = quadraticBezier(
          bottom,
          { column: bounds.centerColumn, row: bounds.centerRow },
          top,
          vacuum
        );
        glyph = current.glyphs.dustSymbols[cell.index % current.glyphs.dustSymbols.length];
      } else {
        const reset = easeInOutSine(
          (progress - current.timing.resetStartFraction) / current.timing.resetDurationFraction
        );
        point = interpolatePoint(top, cell, reset);
        color = mixColor(palette.bright, logoCellColor(cell, palette, bounds.rows), reset);
        glow = (1 - reset) * current.appearance.resetGlow;
        glyph = cell.glyph;
      }

      return {
        color,
        glow: glow * current.appearance.intensity,
        glyph,
        offsetX: point.column - cell.column,
        offsetY: point.row - cell.row,
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
      appearance: { fallenMutedMix: 0.45, initialMutedMix: 0.35, intensity: 0.75, resetGlow: 0.75 },
      glyphs: { dustStartProgress: 0.08, dustSymbols: DUST_GLYPHS },
      motion: { bottomOverscanRows: 1, topOverscanRows: 2 },
      timing: {
        durationMs: 5_080,
        fallDurationFraction: 0.14,
        fallSpreadFraction: 0.34,
        resetDurationFraction: 0.28,
        resetStartFraction: 0.72,
        vacuumDurationFraction: 0.24,
        vacuumStartFraction: 0.48,
      },
    },
  },
  id: "crumble",
  label: "Crumble",
  schema,
  source: createTtfxSourceReference("crumble", "src/effects/crumble.rs"),
});
