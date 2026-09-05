import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { easeInOutQuart } from "@/lib/effects/logo/runtime/easing";
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
        constraint: { minimum: 250 },
        editor: { maximum: 8_000, minimum: 250, step: 50 },
        label: "Duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  appearance: logoEffectField.group({
    fields: {
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
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const duration = current.timing.durationMs;
      const progress = easeInOutQuart(frame.revealMs / duration);
      const baseColor = logoCellColor(cell, palette, bounds.rows);
      return {
        color: mixColor(palette.bright, baseColor, clamp(progress)),
        glow: (1 - clamp(progress)) * current.appearance.intensity,
        glyph: cell.glyph,
        offsetX: interpolate(bounds.centerColumn, cell.column, progress) - cell.column,
        offsetY: interpolate(bounds.centerRow, cell.row, progress) - cell.row,
        scale:
          current.appearance.startScale + clamp(progress) * (1 - current.appearance.startScale),
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
    values: { appearance: { intensity: 0.75, startScale: 0.82 }, timing: { durationMs: 1_800 } },
  },
  id: "expand",
  label: "Expand",
  schema,
  source: createTtfxSourceReference("expand", "src/effects/expand.rs"),
});
