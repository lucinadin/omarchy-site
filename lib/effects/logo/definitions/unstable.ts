import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { easeOutExpo } from "@/lib/effects/logo/runtime/easing";
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
import { clamp, hashUnit } from "@/lib/effects/logo/runtime/math";
import { interpolatePoint } from "@/lib/effects/logo/runtime/path";
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
      rumbleStartFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Rumble ramp start",
        tier: "advanced",
        update: "live",
      }),
      rumbleRampFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Rumble ramp",
        tier: "identity",
        update: "live",
      }),
      rumbleEndFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Rumble end",
        tier: "advanced",
        update: "live",
      }),
      explosionDurationFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Explosion time",
        tier: "identity",
        update: "live",
      }),
      reassemblyStartFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Reassembly start",
        tier: "identity",
        update: "live",
      }),
      reassemblyDurationFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Reassembly time",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  motion: logoEffectField.group({
    fields: {
      edgeOverscanCells: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.25 },
        label: "Edge overscan",
        tier: "identity",
        update: "rebuild",
      }),
      rumbleSteps: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 600, minimum: 1, step: 1 },
        label: "Rumble steps",
        tier: "advanced",
        update: "live",
      }),
      rumbleMagnitude: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 4, minimum: 0, step: 0.05 },
        label: "Rumble magnitude",
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
        label: "Glow intensity",
        tier: "identity",
        update: "live",
      }),
      unstableGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Unstable glow",
        tier: "advanced",
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
  const shuffled = cells
    .map((cell) => cell.index)
    .toSorted((left, right) => hashUnit(seed, left * 433 + 13) - hashUnit(seed, right * 433 + 13));
  const jumbled = cells.map((_, index) => cells[shuffled[index]]);
  const edgeTargets = cells.map((cell) => {
    const edge = Math.floor(hashUnit(seed, cell.index * 439 + 17) * 4);
    const position = hashUnit(seed, cell.index * 443 + 23);
    return edge === 0
      ? { column: -values.motion.edgeOverscanCells, row: position * bounds.maxRow }
      : edge === 1
        ? {
            column: bounds.maxColumn + values.motion.edgeOverscanCells,
            row: position * bounds.maxRow,
          }
        : edge === 2
          ? { column: position * bounds.maxColumn, row: -values.motion.edgeOverscanCells }
          : {
              column: position * bounds.maxColumn,
              row: bounds.maxRow + values.motion.edgeOverscanCells,
            };
  });

  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const progress = clamp(frame.revealMs / current.timing.durationMs);
      const start = jumbled[cell.index];
      const edge = edgeTargets[cell.index];
      let point = { column: start.column, row: start.row };
      let unstable = 0;

      if (progress < current.timing.rumbleEndFraction) {
        const rumbleStep = Math.floor(progress * current.motion.rumbleSteps);
        const magnitude =
          clamp(
            (progress - current.timing.rumbleStartFraction) / current.timing.rumbleRampFraction
          ) * current.motion.rumbleMagnitude;
        point = {
          column:
            start.column +
            Math.round((hashUnit(seed, rumbleStep * 449 + 29) - 0.5) * 2) * magnitude,
          row:
            start.row + Math.round((hashUnit(seed, rumbleStep * 457 + 31) - 0.5) * 2) * magnitude,
        };
        unstable = clamp(progress / current.timing.rumbleEndFraction);
      } else if (
        progress <
        current.timing.rumbleEndFraction + current.timing.explosionDurationFraction
      ) {
        const explosion = easeOutExpo(
          (progress - current.timing.rumbleEndFraction) / current.timing.explosionDurationFraction
        );
        point = interpolatePoint(start, edge, explosion);
        unstable = 1;
      } else if (progress < current.timing.reassemblyStartFraction) {
        point = edge;
        unstable = 1;
      } else {
        const reassembly = easeOutExpo(
          (progress - current.timing.reassemblyStartFraction) /
            current.timing.reassemblyDurationFraction
        );
        point = interpolatePoint(edge, cell, reassembly);
        unstable = 1 - reassembly;
      }

      return {
        color: mixColor(logoCellColor(cell, palette, bounds.rows), palette.laser[1], unstable),
        glow: unstable * current.appearance.intensity * current.appearance.unstableGlow,
        glyph: cell.glyph,
        offsetX: point.column - cell.column,
        offsetY: point.row - cell.row,
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
      appearance: { intensity: 0.75, unstableGlow: 0.72 },
      motion: { edgeOverscanCells: 2, rumbleMagnitude: 0.75, rumbleSteps: 190 },
      timing: {
        durationMs: 4_460,
        explosionDurationFraction: 0.2,
        reassemblyDurationFraction: 0.36,
        reassemblyStartFraction: 0.64,
        rumbleEndFraction: 0.38,
        rumbleRampFraction: 0.3,
        rumbleStartFraction: 0.08,
      },
    },
  },
  id: "unstable",
  label: "Unstable",
  schema,
  source: createTtfxSourceReference("unstable", "src/effects/unstable.rs"),
});
