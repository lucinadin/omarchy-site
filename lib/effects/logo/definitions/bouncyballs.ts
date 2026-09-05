import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { easeOutBounce } from "@/lib/effects/logo/runtime/easing";
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
      withinRowStagger: logoEffectField.number({
        constraint: { maximum: 0.5, minimum: 0 },
        editor: { maximum: 0.5, minimum: 0, step: 0.01 },
        label: "Within-row stagger",
        tier: "identity",
        update: "live",
      }),
      bounceFraction: logoEffectField.number({
        constraint: { maximum: 0.8, minimum: 0.05 },
        editor: { maximum: 0.8, minimum: 0.05, step: 0.01 },
        label: "Bounce time",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  launchHeightRows: logoEffectField.number({
    constraint: { maximum: 12, minimum: 0 },
    editor: { maximum: 12, minimum: 0, step: 0.25 },
    label: "Launch height",
    tier: "identity",
    update: "live",
  }),
  launchHeightJitter: logoEffectField.number({
    constraint: { maximum: 1, minimum: 0 },
    editor: { maximum: 1, minimum: 0, step: 0.01 },
    label: "Height jitter",
    tier: "advanced",
    update: "live",
  }),
  ballSymbols: logoEffectField.symbols({
    constraint: { maximumItems: 32, minimumItems: 1 },
    label: "Ball symbols",
    tier: "identity",
    update: "live",
  }),
  startScale: logoEffectField.number({
    constraint: { maximum: 1, minimum: 0.25 },
    editor: { maximum: 1, minimum: 0.25, step: 0.01 },
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
  const rowOrder = Array.from({ length: bounds.rows }, (_, index) => index);
  const rankWithinRow = new Uint32Array(cells.length);
  const rowSizes = new Uint32Array(bounds.rows);
  for (const row of rowOrder) {
    const rowCells = cells
      .filter((cell) => cell.row === row)
      .toSorted(
        (left, right) =>
          hashUnit(seed, left.index * 199 + 13) - hashUnit(seed, right.index * 199 + 13)
      );
    rowCells.forEach((cell, index) => {
      rankWithinRow[cell.index] = index;
    });
    rowSizes[row] = rowCells.length;
  }

  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const duration = current.timing.durationMs;
      const rowDelay =
        (cell.row / Math.max(1, bounds.maxRow)) * duration * current.timing.rowStagger;
      const dropDelay =
        (rankWithinRow[cell.index] / Math.max(1, rowSizes[cell.row] - 1)) *
        duration *
        current.timing.withinRowStagger;
      const start = rowDelay + dropDelay;
      const progress = easeOutBounce(
        clamp((frame.revealMs - start) / (duration * current.timing.bounceFraction))
      );
      if (frame.revealMs < start) return null;

      const settled = frame.revealMs >= start + duration * current.timing.bounceFraction;
      const ballColor = palette.ciphertext[cell.index % palette.ciphertext.length];
      const settleColor = clamp((frame.revealMs - start - duration * 0.31) / (duration * 0.08));
      return {
        color: mixColor(ballColor, logoCellColor(cell, palette, bounds.rows), settleColor),
        glow: (1 - settleColor) * current.intensity * 0.58,
        glyph: settled ? cell.glyph : current.ballSymbols[cell.index % current.ballSymbols.length],
        offsetY:
          interpolate(
            -current.launchHeightRows -
              hashUnit(seed, cell.index * 211 + 29) * bounds.rows * current.launchHeightJitter,
            cell.row,
            progress
          ) - cell.row,
        scale: settled ? 1 : current.startScale + progress * (1 - current.startScale),
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
      ballSymbols: ["*", "o", "O", "0", "."],
      intensity: 0.75,
      launchHeightJitter: 0.35,
      launchHeightRows: 3,
      startScale: 0.8,
      timing: { bounceFraction: 0.36, durationMs: 2_800, rowStagger: 0.42, withinRowStagger: 0.14 },
    },
  },
  id: "bouncyballs",
  label: "Bouncy Balls",
  schema,
  source: createTtfxSourceReference("bouncyballs", "src/effects/bouncyballs.rs"),
});
