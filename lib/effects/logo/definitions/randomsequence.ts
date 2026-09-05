import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { OMARCHY_MARK_ROWS as ROWS } from "@/lib/effects/logo/mark";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { clamp, hashUnit } from "@/lib/effects/logo/runtime/math";
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
        editor: { maximum: 1_000, minimum: 0, step: 10 },
        label: "Initial delay",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      spreadMs: logoEffectField.number({
        constraint: { minimum: 100 },
        editor: { maximum: 8_000, minimum: 100, step: 50 },
        label: "Sequence spread",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      morphMs: logoEffectField.number({
        constraint: { minimum: 20 },
        editor: { maximum: 2_000, minimum: 20, step: 20 },
        label: "Glyph morph",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      endHoldMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 5_000, minimum: 0, step: 50 },
        label: "End hold",
        tier: "advanced",
        unit: "milliseconds",
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
  const order = cells
    .map((cell) => cell.index)
    .toSorted((left, right) => hashUnit(seed, left * 83 + 17) - hashUnit(seed, right * 83 + 17));
  const rank = new Uint32Array(cells.length);
  order.forEach((cellIndex, index) => {
    rank[cellIndex] = index;
  });

  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: (current) =>
      current.timing.initialDelayMs +
      current.timing.spreadMs +
      current.timing.morphMs +
      current.timing.endHoldMs,
    sample(cell, frame, current) {
      const revealAt =
        current.timing.initialDelayMs +
        (rank[cell.index] / Math.max(1, cells.length - 1)) * current.timing.spreadMs;
      const age = frame.revealMs - revealAt;
      if (age < 0) return null;

      const progress = clamp(age / current.timing.morphMs);
      const baseColor = logoCellColor(cell, palette, ROWS);
      return {
        alpha: progress,
        color: mixColor(palette.muted, baseColor, progress),
        glow: (1 - progress) * current.intensity * 0.72,
        glyph: cell.glyph,
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
      startScale: 0.82,
      timing: { endHoldMs: 720, initialDelayMs: 100, morphMs: 420, spreadMs: 1_960 },
    },
  },
  id: "randomsequence",
  label: "Random Sequence",
  schema,
  source: createTtfxSourceReference("randomsequence", "src/effects/random_sequence.rs"),
});
