import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { easeInOutSine } from "@/lib/effects/logo/runtime/easing";
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
      centerCollapseFraction: logoEffectField.number({
        constraint: { maximum: 0.9, minimum: 0.05 },
        editor: { maximum: 0.9, minimum: 0.05, step: 0.01 },
        label: "Center collapse",
        tier: "identity",
        update: "live",
      }),
      colorTransitionStart: logoEffectField.number({
        constraint: { maximum: 0.9, minimum: 0 },
        editor: { maximum: 0.9, minimum: 0, step: 0.01 },
        label: "Color transition start",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
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
      const phase = clamp(frame.revealMs / duration);
      const centerCollapse = current.timing.centerCollapseFraction;
      const centerProgress = easeInOutSine(clamp(phase / centerCollapse));
      const fullProgress = easeInOutSine(clamp((phase - centerCollapse) / (1 - centerCollapse)));
      const lineColumn = interpolate(bounds.centerColumn, cell.column, centerProgress);
      const column = interpolate(lineColumn, cell.column, fullProgress);
      const row = interpolate(bounds.centerRow, cell.row, fullProgress);
      const colorStart = current.timing.colorTransitionStart;
      const colorProgress = clamp((phase - colorStart) / (1 - colorStart));

      return {
        color: mixColor(palette.bright, logoCellColor(cell, palette, bounds.rows), colorProgress),
        glow: (1 - colorProgress) * current.intensity * 0.62,
        glyph: cell.glyph,
        offsetX: column - cell.column,
        offsetY: row - cell.row,
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
      timing: { centerCollapseFraction: 0.46, colorTransitionStart: 0.32, durationMs: 2_800 },
    },
  },
  id: "middleout",
  label: "Middle Out",
  schema,
  source: createTtfxSourceReference("middleout", "src/effects/middleout.rs"),
});
