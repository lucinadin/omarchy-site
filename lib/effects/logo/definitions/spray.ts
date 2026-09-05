import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { easeOutExpo } from "@/lib/effects/logo/runtime/easing";
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
import { clamp, hashUnit } from "@/lib/effects/logo/runtime/math";
import { interpolate } from "@/lib/effects/logo/runtime/path";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  logoEffectField,
  type LogoEffectRuntimeValues,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { LogoEffectContext } from "@/lib/effects/logo/types";

const schema = defineLogoEffectSchema({
  spawnSide: logoEffectField.choice({
    label: "Spawn side",
    options: ["right", "left", "top", "bottom", "center"] as const,
    tier: "identity",
    update: "live",
  }),
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
      emissionSpread: logoEffectField.number({
        constraint: { maximum: 0.9, minimum: 0 },
        editor: { maximum: 0.9, minimum: 0, step: 0.01 },
        label: "Emission spread",
        tier: "identity",
        update: "live",
      }),
      travelFraction: logoEffectField.range({
        constraint: { maximum: 1, minimum: 0.05 },
        editor: { maximum: 1, minimum: 0.05, step: 0.01 },
        label: "Travel time range",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  startScale: logoEffectField.number({
    constraint: { maximum: 1, minimum: 0.1 },
    editor: { maximum: 1, minimum: 0.1, step: 0.01 },
    label: "Start scale",
    tier: "identity",
    update: "live",
  }),
  intensity: logoEffectField.number({
    constraint: { maximum: 1, minimum: 0 },
    editor: { maximum: 1, minimum: 0, step: 0.05 },
    label: "Glow intensity",
    tier: "identity",
    update: "live",
  }),
});

function createRuntime(
  { cells, palette, seed }: LogoEffectContext,
  values: LogoEffectRuntimeValues<typeof schema>
) {
  const bounds = getLogoBounds(cells);
  const order = cells
    .map((cell) => cell.index)
    .toSorted((left, right) => hashUnit(seed, left * 131 + 5) - hashUnit(seed, right * 131 + 5));
  const rank = new Uint32Array(cells.length);
  order.forEach((cellIndex, index) => {
    rank[cellIndex] = index;
  });

  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const duration = current.timing.durationMs;
      const delay =
        (rank[cell.index] / Math.max(1, cells.length - 1)) *
        duration *
        current.timing.emissionSpread;
      const travelScale =
        current.timing.travelFraction[0] +
        hashUnit(seed, cell.index * 149 + 77) *
          (current.timing.travelFraction[1] - current.timing.travelFraction[0]);
      const progress = easeOutExpo(clamp((frame.revealMs - delay) / (duration * travelScale)));
      if (frame.revealMs < delay) return null;

      return {
        color: mixColor(
          palette.ciphertext[cell.index % palette.ciphertext.length],
          logoCellColor(cell, palette, bounds.rows),
          progress
        ),
        glow: (1 - progress) * current.intensity * 0.7,
        glyph: cell.glyph,
        offsetX:
          current.spawnSide === "left" || current.spawnSide === "right"
            ? interpolate(
                current.spawnSide === "left" ? -1 : bounds.columns + 1,
                cell.column,
                progress
              ) - cell.column
            : interpolate(bounds.centerColumn, cell.column, progress) - cell.column,
        offsetY:
          current.spawnSide === "top" || current.spawnSide === "bottom"
            ? interpolate(current.spawnSide === "top" ? -1 : bounds.rows + 1, cell.row, progress) -
              cell.row
            : interpolate(bounds.centerRow, cell.row, progress) - cell.row,
        scale: current.startScale + progress * (1 - current.startScale),
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
      intensity: 0.75,
      spawnSide: "right",
      startScale: 0.74,
      timing: { durationMs: 2_650, emissionSpread: 0.58, travelFraction: [0.28, 0.5] },
    },
  },
  id: "spray",
  label: "Spray",
  schema,
  source: createTtfxSourceReference("spray", "src/effects/spray.rs"),
});
