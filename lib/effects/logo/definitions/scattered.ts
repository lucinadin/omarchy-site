import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { easeInOutBack } from "@/lib/effects/logo/runtime/easing";
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
  spawnRegion: logoEffectField.choice({
    label: "Spawn region",
    options: ["canvas", "edges", "center"] as const,
    tier: "identity",
    update: "live",
  }),
  durationMs: logoEffectField.number({
    constraint: { minimum: 500 },
    editor: { maximum: 10_000, minimum: 500, step: 50 },
    label: "Duration",
    tier: "identity",
    unit: "milliseconds",
    update: "live",
  }),
  holdFraction: logoEffectField.number({
    constraint: { maximum: 0.7, minimum: 0 },
    editor: { maximum: 0.7, minimum: 0, step: 0.01 },
    label: "Hold",
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

  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: (current) => current.durationMs,
    sample(cell, frame, current) {
      const duration = current.durationMs;
      const hold = duration * current.holdFraction;
      const progress = easeInOutBack(clamp((frame.revealMs - hold) / (duration - hold)));
      const randomColumn = hashUnit(seed, cell.index * 97 + 31) * bounds.maxColumn;
      const randomRow = hashUnit(seed, cell.index * 101 + 47) * bounds.maxRow;
      const edge = Math.floor(hashUnit(seed, cell.index * 109 + 71) * 4);
      const start =
        current.spawnRegion === "center"
          ? { column: bounds.centerColumn, row: bounds.centerRow }
          : current.spawnRegion === "edges"
            ? {
                column: edge < 2 ? (edge === 0 ? 0 : bounds.maxColumn) : randomColumn,
                row: edge >= 2 ? (edge === 2 ? 0 : bounds.maxRow) : randomRow,
              }
            : { column: randomColumn, row: randomRow };
      const colorProgress = clamp((frame.revealMs - hold) / (duration - hold));

      return {
        color: mixColor(
          palette.laser[cell.index % palette.laser.length],
          logoCellColor(cell, palette, bounds.rows),
          colorProgress
        ),
        glow: (1 - colorProgress) * current.intensity * 0.55,
        glyph: cell.glyph,
        offsetX: interpolate(start.column, cell.column, progress) - cell.column,
        offsetY: interpolate(start.row, cell.row, progress) - cell.row,
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
    values: { durationMs: 2_550, holdFraction: 0.188, intensity: 0.75, spawnRegion: "canvas" },
  },
  id: "scattered",
  label: "Scattered",
  schema,
  source: createTtfxSourceReference("scattered", "src/effects/scattered.rs"),
});
