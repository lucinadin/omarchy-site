import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
import { clamp } from "@/lib/effects/logo/runtime/math";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  logoEffectField,
  type LogoEffectRuntimeValues,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { GlyphParticle, LogoEffectContext } from "@/lib/effects/logo/types";

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
      printHeadEndFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.5 },
        editor: { maximum: 1, minimum: 0.5, step: 0.01 },
        label: "Print-head end",
        tier: "advanced",
        update: "live",
      }),
      glyphMorphRows: logoEffectField.number({
        constraint: { minimum: 0.01 },
        editor: { maximum: 2, minimum: 0.01, step: 0.01 },
        label: "Glyph morph distance",
        tier: "identity",
        unit: "rows",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  motion: logoEffectField.group({
    fields: {
      typeWidth: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Row typing width",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Motion",
    tier: "identity",
  }),
  glyphs: logoEffectField.group({
    fields: {
      printHead: logoEffectField.symbol({
        label: "Print-head symbol",
        tier: "identity",
        update: "live",
      }),
      transition: logoEffectField.symbols({
        constraint: { maximumItems: 16, minimumItems: 1 },
        label: "Transition symbols",
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
      printHeadScale: logoEffectField.number({
        constraint: { minimum: 0.25 },
        editor: { maximum: 2, minimum: 0.25, step: 0.01 },
        label: "Print-head scale",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
});

function createRuntime(
  { cells, palette }: LogoEffectContext,
  values: LogoEffectRuntimeValues<typeof schema>
) {
  const bounds = getLogoBounds(cells);

  return createSampledLogoEffectRuntime(cells, values, {
    extraInstanceCapacity: 1,
    particles(frame, current): GlyphParticle[] {
      const duration = current.timing.durationMs;
      const progress = clamp(frame.revealMs / duration);
      if (progress >= current.timing.printHeadEndFraction) return [];
      const rowProgress = progress * bounds.rows;
      const row = Math.min(bounds.maxRow, Math.floor(rowProgress));
      const withinRow = rowProgress - row;
      return [
        {
          channel: "helper",
          color: palette.bright,
          column: withinRow * bounds.maxColumn,
          glow: current.appearance.intensity * 0.8,
          glyph: current.glyphs.printHead,
          row,
          scale: current.appearance.printHeadScale,
        },
      ];
    },
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const duration = current.timing.durationMs;
      const progress = clamp(frame.revealMs / duration);
      const rowProgress = progress * bounds.rows;
      const currentRow = Math.min(bounds.maxRow, Math.floor(rowProgress));
      const activation =
        (cell.row + (cell.column / Math.max(1, bounds.maxColumn)) * current.motion.typeWidth) /
        bounds.rows;
      if (progress < activation) return null;

      const age = (progress - activation) * bounds.rows;
      const glyphProgress = clamp(age / current.timing.glyphMorphRows);
      const glyphIndex = Math.min(
        current.glyphs.transition.length - 1,
        Math.floor(glyphProgress * current.glyphs.transition.length)
      );
      const displayRow = Math.max(cell.row, bounds.maxRow - (currentRow - cell.row));
      return {
        color: mixColor(palette.bright, logoCellColor(cell, palette, bounds.rows), glyphProgress),
        glow: (1 - glyphProgress) * current.appearance.intensity * 0.72,
        glyph: glyphProgress >= 1 ? cell.glyph : current.glyphs.transition[glyphIndex],
        offsetY: displayRow - cell.row,
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
      appearance: { intensity: 0.75, printHeadScale: 1.08 },
      glyphs: { printHead: "█", transition: ["█", "▓", "▒", "░"] },
      motion: { typeWidth: 0.54 },
      timing: { durationMs: 3_420, glyphMorphRows: 0.2, printHeadEndFraction: 0.96 },
    },
  },
  id: "print",
  label: "Print",
  schema,
  source: createTtfxSourceReference("print", "src/effects/print_effect.rs"),
});
