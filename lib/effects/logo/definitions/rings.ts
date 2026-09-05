import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import {
  createLivePaletteColorStops,
  logoCellColor,
  mixColor,
} from "@/lib/effects/logo/runtime/color";
import { easeInOutSine, easeOutCubic } from "@/lib/effects/logo/runtime/easing";
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
import { clamp, hashUnit } from "@/lib/effects/logo/runtime/math";
import { interpolatePoint } from "@/lib/effects/logo/runtime/path";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  type LogoEffectRuntimeValues,
  logoEffectField,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { LogoEffectContext } from "@/lib/effects/logo/types";

const schema = defineLogoEffectSchema({
  timing: logoEffectField.group({
    fields: {
      baseDurationMs: logoEffectField.number({
        constraint: { minimum: 500 },
        editor: { maximum: 12_000, minimum: 500, step: 50 },
        label: "Base duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      extraCycleDurationMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 4_000, minimum: 0, step: 50 },
        label: "Time per extra cycle",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      entryEndFraction: logoEffectField.number({
        constraint: { maximum: 0.5, minimum: 0.01 },
        editor: { maximum: 0.5, minimum: 0.01, step: 0.01 },
        label: "Ring entry end",
        tier: "identity",
        update: "live",
      }),
      orbitEndFraction: logoEffectField.number({
        constraint: { maximum: 0.99, minimum: 0.2 },
        editor: { maximum: 0.99, minimum: 0.2, step: 0.01 },
        label: "Orbit end",
        tier: "identity",
        update: "live",
      }),
      disperseStartFraction: logoEffectField.number({
        constraint: { maximum: 0.95, minimum: 0 },
        editor: { maximum: 0.95, minimum: 0, step: 0.01 },
        label: "Cycle disperse start",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  rings: logoEffectField.group({
    fields: {
      count: logoEffectField.number({
        constraint: { integer: true, maximum: 12, minimum: 1 },
        editor: { maximum: 12, minimum: 1, step: 1 },
        label: "Ring count",
        tier: "identity",
        update: "live",
      }),
      cycles: logoEffectField.number({
        constraint: { integer: true, maximum: 12, minimum: 1 },
        editor: { maximum: 12, minimum: 1, step: 1 },
        label: "Cycles",
        tier: "identity",
        update: "live",
      }),
      baseRadiusRows: logoEffectField.number({
        constraint: { maximum: 12, minimum: 0.1 },
        editor: { maximum: 12, minimum: 0.1, step: 0.1 },
        label: "Inner radius",
        tier: "identity",
        update: "live",
      }),
      radiusStepRows: logoEffectField.number({
        constraint: { maximum: 8, minimum: 0 },
        editor: { maximum: 8, minimum: 0, step: 0.05 },
        label: "Radius step",
        tier: "identity",
        update: "live",
      }),
      columnRadiusScale: logoEffectField.number({
        constraint: { maximum: 4, minimum: 0.1 },
        editor: { maximum: 4, minimum: 0.1, step: 0.05 },
        label: "Horizontal radius scale",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Rings",
    tier: "identity",
  }),
  motion: logoEffectField.group({
    fields: {
      slotAngleRadians: logoEffectField.number({
        constraint: { maximum: 6.2832, minimum: 0 },
        editor: { maximum: 6.2832, minimum: 0, step: 0.01 },
        label: "Slot angle",
        tier: "advanced",
        unit: "radians",
        update: "live",
      }),
      cycleStepRadians: logoEffectField.number({
        constraint: { maximum: 12.5664, minimum: 0 },
        editor: { maximum: 12.5664, minimum: 0, step: 0.05 },
        label: "Cycle rotation step",
        tier: "identity",
        unit: "radians",
        update: "live",
      }),
      orbitSweepRadians: logoEffectField.number({
        constraint: { maximum: 12.5664, minimum: 0 },
        editor: { maximum: 12.5664, minimum: 0, step: 0.05 },
        label: "Cycle orbit sweep",
        tier: "identity",
        unit: "radians",
        update: "live",
      }),
      columnJitterScale: logoEffectField.number({
        constraint: { maximum: 8, minimum: 0 },
        editor: { maximum: 8, minimum: 0, step: 0.1 },
        label: "Horizontal jitter",
        tier: "identity",
        update: "live",
      }),
      rowJitterScale: logoEffectField.number({
        constraint: { maximum: 8, minimum: 0 },
        editor: { maximum: 8, minimum: 0, step: 0.1 },
        label: "Vertical jitter",
        tier: "identity",
        update: "live",
      }),
      disperseFade: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Disperse fade",
        tier: "advanced",
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
      ringGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Ring glow",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

function durationFor(values: Values) {
  return (
    values.timing.baseDurationMs + (values.rings.cycles - 1) * values.timing.extraCycleDurationMs
  );
}

function createRuntime({ cells, palette, seed }: LogoEffectContext, values: Values) {
  const bounds = getLogoBounds(cells);
  const shuffled = cells
    .map((cell) => cell.index)
    .toSorted((left, right) => hashUnit(seed, left * 257 + 3) - hashUnit(seed, right * 257 + 3));
  const rank = new Uint32Array(cells.length);
  shuffled.forEach((cellIndex, index) => {
    rank[cellIndex] = index;
  });
  const getRingColors = createLivePaletteColorStops(palette, (stops, currentPalette) => {
    stops[0] = currentPalette.ciphertext[0];
    stops[1] = currentPalette.laser[1];
    stops[2] = currentPalette.bright;
  });

  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: durationFor,
    sample(cell, frame, current) {
      const cycles = current.rings.cycles;
      const duration = durationFor(current);
      const progress = clamp(frame.revealMs / duration);
      const ringCount = current.rings.count;
      const ringIndex = rank[cell.index] % ringCount;
      const slot = Math.floor(rank[cell.index] / ringCount);
      const radius = current.rings.baseRadiusRows + ringIndex * current.rings.radiusStepRows;
      const direction = ringIndex % 2 === 0 ? 1 : -1;
      const baseAngle = slot * current.motion.slotAngleRadians;
      const ringPoint = (angle: number) => ({
        column: bounds.centerColumn + Math.cos(angle) * radius * current.rings.columnRadiusScale,
        row: bounds.centerRow + Math.sin(angle) * radius,
      });

      let point = { column: cell.column, row: cell.row };
      let ringAmount = 0;
      if (progress < current.timing.entryEndFraction) {
        ringAmount = easeOutCubic(progress / current.timing.entryEndFraction);
        point = interpolatePoint(cell, ringPoint(baseAngle), ringAmount);
      } else if (progress < current.timing.orbitEndFraction) {
        const cycleProgress =
          ((progress - current.timing.entryEndFraction) /
            (current.timing.orbitEndFraction - current.timing.entryEndFraction)) *
          cycles;
        const cycleFraction = cycleProgress % 1;
        const angle =
          baseAngle +
          direction *
            (Math.floor(cycleProgress) * current.motion.cycleStepRadians +
              cycleFraction * current.motion.orbitSweepRadians);
        const onRing = ringPoint(angle);
        const disperse = easeInOutSine(
          clamp(
            (cycleFraction - current.timing.disperseStartFraction) /
              (1 - current.timing.disperseStartFraction)
          )
        );
        const jitter = {
          column:
            onRing.column +
            (hashUnit(seed, cell.index * 263 + Math.floor(cycleProgress) * 17) - 0.5) *
              radius *
              current.motion.columnJitterScale,
          row:
            onRing.row +
            (hashUnit(seed, cell.index * 269 + Math.floor(cycleProgress) * 19) - 0.5) *
              radius *
              current.motion.rowJitterScale,
        };
        point = interpolatePoint(onRing, jitter, disperse);
        ringAmount = 1 - disperse * current.motion.disperseFade;
      } else {
        const home = easeOutCubic(
          (progress - current.timing.orbitEndFraction) / (1 - current.timing.orbitEndFraction)
        );
        const lastAngle = baseAngle + direction * cycles * current.motion.cycleStepRadians;
        point = interpolatePoint(ringPoint(lastAngle), cell, home);
        ringAmount = 1 - home;
      }

      const baseColor = logoCellColor(cell, palette, bounds.rows);
      const ringColors = getRingColors();
      return {
        color: mixColor(baseColor, ringColors[ringIndex % ringColors.length], ringAmount),
        glow: ringAmount * current.appearance.intensity * current.appearance.ringGlow,
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
      appearance: { intensity: 0.75, ringGlow: 0.52 },
      motion: {
        columnJitterScale: 2.8,
        cycleStepRadians: Math.PI * 1.3,
        disperseFade: 0.55,
        orbitSweepRadians: Math.PI * 2.2,
        rowJitterScale: 1.4,
        slotAngleRadians: 2.399963229728653,
      },
      rings: {
        baseRadiusRows: 1.4,
        columnRadiusScale: 2.05,
        count: 4,
        cycles: 2,
        radiusStepRows: 1.35,
      },
      timing: {
        baseDurationMs: 5_400,
        disperseStartFraction: 0.5,
        entryEndFraction: 0.1,
        extraCycleDurationMs: 900,
        orbitEndFraction: 0.84,
      },
    },
  },
  id: "rings",
  label: "Rings",
  schema,
  source: createTtfxSourceReference("rings", "src/effects/rings.rs"),
});
