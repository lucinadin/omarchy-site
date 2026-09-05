import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import {
  createLivePaletteColorStops,
  logoCellColor,
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
import type { GlyphParticle, LogoEffectContext } from "@/lib/effects/logo/types";

const schema = defineLogoEffectSchema({
  timing: logoEffectField.group({
    fields: {
      durationMs: logoEffectField.number({
        constraint: { minimum: 500 },
        editor: { maximum: 12_000, minimum: 500, step: 50 },
        label: "Duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      completionFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.8 },
        editor: { maximum: 1, minimum: 0.8, step: 0.005 },
        label: "Completion point",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  motion: logoEffectField.group({
    fields: {
      cycleCount: logoEffectField.number({
        constraint: { integer: true, maximum: 4, minimum: 2 },
        editor: { maximum: 4, minimum: 2, step: 1 },
        label: "Overflow cycles",
        tier: "identity",
        update: "live",
      }),
      overscanRows: logoEffectField.number({
        constraint: { maximum: 4, minimum: 0 },
        editor: { maximum: 4, minimum: 0, step: 0.25 },
        label: "Vertical overscan",
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
    },
    label: "Appearance",
    tier: "identity",
  }),
});

function createRuntime(
  { cells, palette, seed }: LogoEffectContext,
  values: LogoEffectRuntimeValues<typeof schema>
) {
  const bounds = getLogoBounds(cells);
  const getOverflowColors = createLivePaletteColorStops(palette, (stops, currentPalette) => {
    stops[0] = currentPalette.bright;
    stops[1] = currentPalette.ciphertext[2];
    stops[2] = currentPalette.ciphertext[0];
    stops[3] = currentPalette.bright;
  });

  return createSampledLogoEffectRuntime(cells, values, {
    extraInstanceCapacity: cells.length * 5,
    particles(frame, current): GlyphParticle[] {
      const progress = clamp(frame.revealMs / current.timing.durationMs);
      if (progress >= current.timing.completionFraction) return [];

      const rowsPerStream = bounds.rows;
      const totalEvents = (current.motion.cycleCount + 1) * rowsPerStream;
      const currentEvent = progress * totalEvents;
      const particles: GlyphParticle[] = [];
      const overflowColors = getOverflowColors();

      for (let cycle = 0; cycle <= current.motion.cycleCount; cycle += 1) {
        const isFinal = cycle === current.motion.cycleCount;
        const rowOrder = Array.from({ length: bounds.rows }, (_, row) => row).toSorted(
          (left, right) =>
            isFinal
              ? left - right
              : hashUnit(seed, cycle * 409 + left * 17) - hashUnit(seed, cycle * 409 + right * 17)
        );
        const rowRank = new Uint16Array(bounds.rows);
        rowOrder.forEach((row, index) => {
          rowRank[row] = index;
        });

        for (const cell of cells) {
          const event = cycle * rowsPerStream + rowRank[cell.row];
          if (currentEvent < event) continue;
          const row = bounds.rows - (currentEvent - event);
          if (
            row < -current.motion.overscanRows ||
            row > bounds.rows + current.motion.overscanRows
          ) {
            continue;
          }
          particles.push({
            channel: "copiedText",
            color: isFinal
              ? logoCellColor(cell, palette, bounds.rows)
              : sampleColorStops(overflowColors, clamp((bounds.rows - row) / bounds.rows)),
            column: cell.column,
            glow: isFinal ? 0 : current.appearance.intensity * 0.32,
            glyph: cell.glyph,
            row,
          });
        }
      }
      return particles;
    },
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      if (frame.revealMs < current.timing.durationMs * current.timing.completionFraction) {
        return null;
      }
      return { color: logoCellColor(cell, palette, bounds.rows), glyph: cell.glyph };
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
      appearance: { intensity: 0.75 },
      motion: { cycleCount: 3, overscanRows: 1 },
      timing: { completionFraction: 0.985, durationMs: 6_300 },
    },
  },
  id: "overflow",
  label: "Overflow",
  schema,
  source: createTtfxSourceReference("overflow", "src/effects/overflow.rs"),
});
