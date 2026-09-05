import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { easeInOutExpo } from "@/lib/effects/logo/runtime/easing";
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
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
  direction: logoEffectField.choice({
    label: "Direction",
    options: ["opposing-vertical", "top", "bottom", "opposing-horizontal"] as const,
    tier: "identity",
    update: "live",
  }),
  durationMs: logoEffectField.number({
    constraint: { minimum: 250 },
    editor: { maximum: 8_000, minimum: 250, step: 50 },
    label: "Duration",
    tier: "identity",
    unit: "milliseconds",
    update: "live",
  }),
  overscanCells: logoEffectField.number({
    constraint: { maximum: 12, minimum: 0 },
    editor: { maximum: 12, minimum: 0, step: 0.25 },
    label: "Overscan",
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
    revealDurationMs: (current) => current.durationMs,
    sample(cell, frame, current) {
      const duration = current.durationMs;
      const progress = easeInOutExpo(frame.revealMs / duration);
      const before = -current.overscanCells;
      const afterColumn = bounds.maxColumn + current.overscanCells;
      const afterRow = bounds.maxRow + current.overscanCells;
      const fromColumn =
        current.direction === "opposing-horizontal"
          ? cell.row <= bounds.centerRow
            ? before
            : afterColumn
          : cell.column;
      const fromRow =
        current.direction === "top"
          ? before
          : current.direction === "bottom"
            ? afterRow
            : current.direction === "opposing-vertical"
              ? cell.column <= bounds.centerColumn
                ? before
                : afterRow
              : cell.row;

      return {
        color: mixColor(
          palette.ciphertext[cell.index % palette.ciphertext.length],
          logoCellColor(cell, palette, bounds.rows),
          progress
        ),
        glow: (1 - progress) * current.intensity * 0.42,
        glyph: cell.glyph,
        offsetX: interpolate(fromColumn, cell.column, progress) - cell.column,
        offsetY: interpolate(fromRow, cell.row, progress) - cell.row,
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
      direction: "opposing-vertical",
      durationMs: 2_200,
      intensity: 0.75,
      overscanCells: 2,
    },
  },
  id: "slice",
  label: "Slice",
  schema,
  source: createTtfxSourceReference("slice", "src/effects/slice.rs"),
});
