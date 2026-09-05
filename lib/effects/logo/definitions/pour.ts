import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { easeInQuad } from "@/lib/effects/logo/runtime/easing";
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
import { clamp } from "@/lib/effects/logo/runtime/math";
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
      rowStagger: logoEffectField.number({
        constraint: { maximum: 0.8, minimum: 0 },
        editor: { maximum: 0.8, minimum: 0, step: 0.01 },
        label: "Row stagger",
        tier: "identity",
        update: "live",
      }),
      columnStagger: logoEffectField.number({
        constraint: { maximum: 0.5, minimum: 0 },
        editor: { maximum: 0.5, minimum: 0, step: 0.01 },
        label: "Column stagger",
        tier: "identity",
        update: "live",
      }),
      travelFraction: logoEffectField.number({
        constraint: { maximum: 0.8, minimum: 0.05 },
        editor: { maximum: 0.8, minimum: 0.05, step: 0.01 },
        label: "Travel time",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  spawnOverscanRows: logoEffectField.number({
    constraint: { maximum: 12, minimum: 0 },
    editor: { maximum: 12, minimum: 0, step: 0.25 },
    label: "Spawn overscan",
    tier: "advanced",
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
  { cells, palette }: LogoEffectContext,
  values: LogoEffectRuntimeValues<typeof schema>
) {
  const bounds = getLogoBounds(cells);

  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const duration = current.timing.durationMs;
      const groupRank = bounds.maxRow - cell.row;
      const serpentineColumn = groupRank % 2 === 0 ? cell.column : bounds.maxColumn - cell.column;
      const delay =
        (groupRank / Math.max(1, bounds.maxRow)) * duration * current.timing.rowStagger +
        (serpentineColumn / Math.max(1, bounds.maxColumn)) *
          duration *
          current.timing.columnStagger;
      const progress = easeInQuad(
        clamp((frame.revealMs - delay) / (duration * current.timing.travelFraction))
      );
      if (frame.revealMs < delay) return null;

      return {
        color: mixColor(palette.bright, logoCellColor(cell, palette, bounds.rows), progress),
        glow: (1 - progress) * current.intensity * 0.58,
        glyph: cell.glyph,
        offsetY: interpolate(-current.spawnOverscanRows, cell.row, progress) - cell.row,
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
      spawnOverscanRows: 2,
      timing: { columnStagger: 0.14, durationMs: 2_660, rowStagger: 0.44, travelFraction: 0.42 },
    },
  },
  id: "pour",
  label: "Pour",
  schema,
  source: createTtfxSourceReference("pour", "src/effects/pour.rs"),
});
