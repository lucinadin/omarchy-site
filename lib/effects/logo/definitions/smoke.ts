import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import {
  createLivePaletteColorStops,
  logoCellColor,
  mixColor,
  sampleColorStops,
} from "@/lib/effects/logo/runtime/color";
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
import { clamp, hashUnit } from "@/lib/effects/logo/runtime/math";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  logoEffectField,
  type LogoEffectRuntimeValues,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { LogoEffectContext } from "@/lib/effects/logo/types";

const SMOKE_GLYPHS = ["░", "▒", "▓", "▒", "░"] as const;

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
      spreadFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Spread",
        tier: "identity",
        update: "live",
      }),
      smokeFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Smoke time",
        tier: "identity",
        update: "live",
      }),
      paintFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Paint time",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  propagation: logoEffectField.group({
    fields: {
      rowWeight: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 8, minimum: 0, step: 0.1 },
        label: "Vertical distance weight",
        tier: "identity",
        update: "rebuild",
      }),
    },
    label: "Propagation",
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
      unrevealedMutedMix: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Unrevealed dimming",
        tier: "advanced",
        update: "live",
      }),
      smokeGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Smoke glow",
        tier: "advanced",
        update: "live",
      }),
      paintGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Paint glow",
        tier: "advanced",
        update: "live",
      }),
      startScale: logoEffectField.number({
        constraint: { minimum: 0.1 },
        editor: { maximum: 2, minimum: 0.1, step: 0.05 },
        label: "Start scale",
        tier: "identity",
        update: "live",
      }),
      scalePulse: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Scale pulse",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
  glyphs: logoEffectField.group({
    fields: {
      smokeSymbols: logoEffectField.symbols({
        constraint: { maximumItems: 32, minimumItems: 1 },
        label: "Smoke symbols",
        tier: "identity",
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
  const start = cells[Math.floor(hashUnit(seed, 419) * cells.length)];
  const order = cells
    .map((cell) => cell.index)
    .toSorted((left, right) => {
      const leftCell = cells[left];
      const rightCell = cells[right];
      const leftDistance =
        Math.abs(leftCell.column - start.column) +
        Math.abs(leftCell.row - start.row) * values.propagation.rowWeight;
      const rightDistance =
        Math.abs(rightCell.column - start.column) +
        Math.abs(rightCell.row - start.row) * values.propagation.rowWeight;
      return leftDistance - rightDistance || left - right;
    });
  const rank = new Uint32Array(cells.length);
  order.forEach((cellIndex, index) => {
    rank[cellIndex] = index;
  });
  const getSmokeColors = createLivePaletteColorStops(palette, (stops, currentPalette) => {
    stops[0] = currentPalette.muted;
    stops[1] = currentPalette.bright;
    stops[2] = currentPalette.final;
    stops[3] = currentPalette.ciphertext[2];
  });

  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const duration = current.timing.durationMs;
      const spread = duration * current.timing.spreadFraction;
      const startAt = (rank[cell.index] / Math.max(1, cells.length - 1)) * spread;
      const age = frame.revealMs - startAt;
      const baseColor = logoCellColor(cell, palette, bounds.rows);
      if (age < 0)
        return {
          color: mixColor(baseColor, palette.muted, current.appearance.unrevealedMutedMix),
          glyph: cell.glyph,
        };

      const smokeDuration = duration * current.timing.smokeFraction;
      if (age < smokeDuration) {
        const smokeProgress = clamp(age / smokeDuration);
        const glyphIndex = Math.min(
          current.glyphs.smokeSymbols.length - 1,
          Math.floor(smokeProgress * current.glyphs.smokeSymbols.length)
        );
        return {
          color: sampleColorStops(getSmokeColors(), smokeProgress),
          glow:
            Math.sin(smokeProgress * Math.PI) *
            current.appearance.intensity *
            current.appearance.smokeGlow,
          glyph: current.glyphs.smokeSymbols[glyphIndex],
          scale:
            current.appearance.startScale +
            Math.sin(smokeProgress * Math.PI) * current.appearance.scalePulse,
        };
      }

      const paint = clamp((age - smokeDuration) / (duration * current.timing.paintFraction));
      return {
        color: mixColor(palette.ciphertext[2], baseColor, paint),
        glow: (1 - paint) * current.appearance.intensity * current.appearance.paintGlow,
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
      appearance: {
        intensity: 0.75,
        paintGlow: 0.35,
        scalePulse: 0.12,
        smokeGlow: 0.65,
        startScale: 0.9,
        unrevealedMutedMix: 0.68,
      },
      glyphs: { smokeSymbols: SMOKE_GLYPHS },
      propagation: { rowWeight: 2 },
      timing: { durationMs: 3_520, paintFraction: 0.1, smokeFraction: 0.18, spreadFraction: 0.588 },
    },
  },
  id: "smoke",
  label: "Smoke",
  schema,
  source: createTtfxSourceReference("smoke", "src/effects/smoke.rs"),
});
