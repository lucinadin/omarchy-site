import {
  DEFAULT_LOGO_EFFECT_PLAYBACK,
  DEFAULT_LOGO_EFFECT_PRESENTATION,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import {
  OMARCHY_MARK_COLUMNS as COLUMNS,
  OMARCHY_MARK_ROWS as ROWS,
} from "@/lib/effects/logo/mark";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { easeInOutCirc } from "@/lib/effects/logo/runtime/easing";
import { clamp } from "@/lib/effects/logo/runtime/math";
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
      initialDelayMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 2_000, minimum: 0, step: 10 },
        label: "Initial delay",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      travelDurationMs: logoEffectField.number({
        constraint: { minimum: 100 },
        editor: { maximum: 5_000, minimum: 100, step: 50 },
        label: "Highlight travel",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      revealHoldMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 5_000, minimum: 0, step: 20 },
        label: "Reveal hold",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      idlePauseMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 5_000, minimum: 0, step: 50 },
        label: "Idle pause",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  motion: logoEffectField.group({
    fields: {
      bandWidth: logoEffectField.number({
        constraint: { maximum: 0.5, minimum: 0.005 },
        editor: { maximum: 0.5, minimum: 0.005, step: 0.005 },
        label: "Highlight width",
        tier: "identity",
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
        label: "Highlight intensity",
        tier: "identity",
        update: "live",
      }),
      scaleBoost: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Scale boost",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

function revealDurationMs(values: Values) {
  return values.timing.initialDelayMs + values.timing.travelDurationMs + values.timing.revealHoldMs;
}

function createRuntime({ cells, palette }: LogoEffectContext, values: Values) {
  return createSampledLogoEffectRuntime(cells, values, {
    usesIdle: true,
    revealDurationMs,
    sample(cell, frame, current) {
      const baseColor = logoCellColor(cell, palette, ROWS);
      const direction = (cell.column / (COLUMNS - 1) + (ROWS - 1 - cell.row) / (ROWS - 1)) / 2;
      const travelMs = current.timing.travelDurationMs;
      const cycleMs = travelMs + current.timing.idlePauseMs;
      const revealing = frame.revealMs < revealDurationMs(current);
      const idleCycleMs = frame.idleMs % cycleMs;
      const idlePause = !revealing && idleCycleMs < current.timing.idlePauseMs;
      const elapsedMs = revealing
        ? frame.revealMs
        : current.timing.initialDelayMs + idleCycleMs - current.timing.idlePauseMs;
      const center = easeInOutCirc(clamp((elapsedMs - current.timing.initialDelayMs) / travelMs));
      const distance = Math.abs(direction - center);
      const highlight = idlePause ? 0 : clamp(1 - distance / current.motion.bandWidth);

      return {
        color: mixColor(baseColor, palette.bright, highlight * current.appearance.intensity),
        glow: highlight * current.appearance.intensity,
        glyph: cell.glyph,
        scale: 1 + highlight * current.appearance.scaleBoost,
      };
    },
  });
}

export const logoEffect = defineLogoEffect({
  createRuntime,
  defaults: {
    playback: DEFAULT_LOGO_EFFECT_PLAYBACK,
    presentation: DEFAULT_LOGO_EFFECT_PRESENTATION,
    values: {
      appearance: { intensity: 0.75, scaleBoost: 0.06 },
      motion: { bandWidth: 0.095 },
      timing: {
        idlePauseMs: 900,
        initialDelayMs: 120,
        revealHoldMs: 880,
        travelDurationMs: 1_800,
      },
    },
  },
  id: "highlight",
  label: "Highlight",
  schema,
  source: createTtfxSourceReference("highlight", "src/effects/highlight.rs"),
});
