import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { easeInOutQuart, easeOutCirc, easeOutExpo } from "@/lib/effects/logo/runtime/easing";
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
import { clamp, hashUnit } from "@/lib/effects/logo/runtime/math";
import { interpolatePoint, quadraticBezier } from "@/lib/effects/logo/runtime/path";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  type LogoEffectRuntimeValues,
  logoEffectField,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { LogoEffectContext, LogoPoint } from "@/lib/effects/logo/types";

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
      launchSpreadFraction: logoEffectField.number({
        constraint: { maximum: 0.8, minimum: 0 },
        editor: { maximum: 0.8, minimum: 0, step: 0.01 },
        label: "Launch spread",
        tier: "identity",
        update: "live",
      }),
      travelFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.1 },
        editor: { maximum: 1, minimum: 0.1, step: 0.01 },
        label: "Shell travel time",
        tier: "identity",
        update: "live",
      }),
      ascentEndFraction: logoEffectField.number({
        constraint: { maximum: 0.5, minimum: 0.05 },
        editor: { maximum: 0.5, minimum: 0.05, step: 0.01 },
        label: "Ascent end",
        tier: "advanced",
        update: "live",
      }),
      bloomEndFraction: logoEffectField.number({
        constraint: { maximum: 0.8, minimum: 0.2 },
        editor: { maximum: 0.8, minimum: 0.2, step: 0.01 },
        label: "Bloom end",
        tier: "advanced",
        update: "live",
      }),
      finalColorStartFraction: logoEffectField.number({
        constraint: { maximum: 0.95, minimum: 0 },
        editor: { maximum: 0.95, minimum: 0, step: 0.01 },
        label: "Final color start",
        tier: "advanced",
        update: "live",
      }),
      finalColorFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Final color time",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  shells: logoEffectField.group({
    fields: {
      minimumShellSize: logoEffectField.number({
        constraint: { integer: true, maximum: 64, minimum: 1 },
        editor: { maximum: 64, minimum: 1, step: 1 },
        label: "Minimum shell size",
        tier: "identity",
        update: "rebuild",
      }),
      maximumShellFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Maximum shell share",
        tier: "advanced",
        update: "rebuild",
      }),
      shellSizeFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Shell size",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Shells",
    tier: "identity",
  }),
  motion: logoEffectField.group({
    fields: {
      apexTopOffsetRows: logoEffectField.number({
        constraint: { maximum: 8, minimum: 0 },
        editor: { maximum: 8, minimum: 0, step: 0.25 },
        label: "Apex top offset",
        tier: "advanced",
        update: "live",
      }),
      apexHeightFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Apex height range",
        tier: "identity",
        update: "live",
      }),
      originOverscanRows: logoEffectField.number({
        constraint: { maximum: 12, minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.25 },
        label: "Launch overscan",
        tier: "advanced",
        update: "live",
      }),
      angleJitterRadians: logoEffectField.number({
        constraint: { maximum: 3.14, minimum: 0 },
        editor: { maximum: 3.14, minimum: 0, step: 0.05 },
        label: "Burst angle jitter",
        tier: "advanced",
        unit: "radians",
        update: "live",
      }),
      burstRadius: logoEffectField.range({
        constraint: { maximum: 20, minimum: 0 },
        editor: { maximum: 20, minimum: 0, step: 0.25 },
        label: "Burst radius",
        tier: "identity",
        update: "live",
      }),
      verticalRadiusScale: logoEffectField.number({
        constraint: { maximum: 2, minimum: 0 },
        editor: { maximum: 2, minimum: 0, step: 0.05 },
        label: "Vertical radius scale",
        tier: "advanced",
        update: "live",
      }),
      returnControlOverscanRows: logoEffectField.number({
        constraint: { maximum: 12, minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.25 },
        label: "Return arc overscan",
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
      launchGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Launch glow",
        tier: "advanced",
        update: "live",
      }),
      bloomGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Bloom glow",
        tier: "advanced",
        update: "live",
      }),
      launchSymbol: logoEffectField.symbol({
        label: "Launch symbol",
        tier: "identity",
        update: "live",
      }),
      launchScale: logoEffectField.number({
        constraint: { maximum: 2, minimum: 0.1 },
        editor: { maximum: 2, minimum: 0.1, step: 0.01 },
        label: "Launch scale",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

type Shell = {
  apex: LogoPoint;
  colorIndex: number;
  index: number;
  origin: LogoPoint;
};

function createRuntime({ cells, palette, seed }: LogoEffectContext, values: Values) {
  const bounds = getLogoBounds(cells);
  const maximumShellSize = Math.max(
    values.shells.minimumShellSize,
    Math.ceil(cells.length * values.shells.maximumShellFraction)
  );
  const shuffled = cells
    .map((cell) => cell.index)
    .toSorted((left, right) => hashUnit(seed, left * 229 + 7) - hashUnit(seed, right * 229 + 7));
  const rank = new Uint32Array(cells.length);
  shuffled.forEach((cellIndex, index) => {
    rank[cellIndex] = index;
  });

  const shellFor = (cellIndex: number, shellSize: number, current: Values): Shell => {
    const shellIndex = Math.floor(rank[cellIndex] / shellSize);
    const originColumn = hashUnit(seed, shellIndex * 233 + 31) * bounds.maxColumn;
    return {
      apex: {
        column: originColumn,
        row:
          current.motion.apexTopOffsetRows +
          hashUnit(seed, shellIndex * 239 + 43) * bounds.maxRow * current.motion.apexHeightFraction,
      },
      colorIndex: shellIndex % palette.laser.length,
      index: shellIndex,
      origin: {
        column: originColumn,
        row: bounds.rows + current.motion.originOverscanRows,
      },
    };
  };

  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const duration = current.timing.durationMs;
      const shellSize = Math.max(
        current.shells.minimumShellSize,
        Math.min(maximumShellSize, Math.round(cells.length * current.shells.shellSizeFraction))
      );
      const shell = shellFor(cell.index, shellSize, current);
      const shellCount = Math.ceil(cells.length / shellSize);
      const launchAt =
        (shell.index / Math.max(1, shellCount - 1)) *
        duration *
        current.timing.launchSpreadFraction;
      const local = clamp((frame.revealMs - launchAt) / (duration * current.timing.travelFraction));
      if (frame.revealMs < launchAt) return null;

      const angle =
        ((rank[cell.index] % shellSize) / shellSize) * Math.PI * 2 +
        hashUnit(seed, cell.index * 241 + 61) * current.motion.angleJitterRadians;
      const radius =
        current.motion.burstRadius[0] +
        hashUnit(seed, cell.index * 251 + 67) *
          (current.motion.burstRadius[1] - current.motion.burstRadius[0]);
      const bloom = {
        column: shell.apex.column + Math.cos(angle) * radius,
        row: shell.apex.row + Math.sin(angle) * radius * current.motion.verticalRadiusScale,
      };
      let point: LogoPoint;
      let phaseColor = 0;
      if (local < current.timing.ascentEndFraction) {
        point = interpolatePoint(
          shell.origin,
          shell.apex,
          easeOutExpo(local / current.timing.ascentEndFraction)
        );
      } else if (local < current.timing.bloomEndFraction) {
        const bloomFraction = current.timing.bloomEndFraction - current.timing.ascentEndFraction;
        phaseColor = clamp((local - current.timing.ascentEndFraction) / bloomFraction);
        point = interpolatePoint(
          shell.apex,
          bloom,
          easeOutCirc((local - current.timing.ascentEndFraction) / bloomFraction)
        );
      } else {
        const homeProgress = easeInOutQuart(
          (local - current.timing.bloomEndFraction) / (1 - current.timing.bloomEndFraction)
        );
        const control = {
          column: bloom.column,
          row: bounds.rows + current.motion.returnControlOverscanRows,
        };
        point = quadraticBezier(bloom, control, cell, homeProgress);
        phaseColor = 1;
      }
      const finalProgress = clamp(
        (local - current.timing.finalColorStartFraction) / current.timing.finalColorFraction
      );
      const shellColor = palette.laser[shell.colorIndex];

      return {
        color: mixColor(
          mixColor(shellColor, palette.bright, 1 - Math.abs(phaseColor - 0.5) * 2),
          logoCellColor(cell, palette, bounds.rows),
          finalProgress
        ),
        glow:
          (1 - finalProgress) *
          current.appearance.intensity *
          (local < current.timing.ascentEndFraction
            ? current.appearance.launchGlow
            : current.appearance.bloomGlow),
        glyph:
          local < current.timing.ascentEndFraction ? current.appearance.launchSymbol : cell.glyph,
        offsetX: point.column - cell.column,
        offsetY: point.row - cell.row,
        scale: local < current.timing.ascentEndFraction ? current.appearance.launchScale : 1,
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
      appearance: {
        bloomGlow: 0.95,
        intensity: 0.75,
        launchGlow: 0.5,
        launchScale: 0.85,
        launchSymbol: "o",
      },
      motion: {
        angleJitterRadians: 0.3,
        apexHeightFraction: 0.52,
        apexTopOffsetRows: 0.5,
        burstRadius: [3, 10],
        originOverscanRows: 2,
        returnControlOverscanRows: 1,
        verticalRadiusScale: 0.5,
      },
      shells: {
        maximumShellFraction: 0.1,
        minimumShellSize: 3,
        shellSizeFraction: 0.071,
      },
      timing: {
        ascentEndFraction: 0.27,
        bloomEndFraction: 0.52,
        durationMs: 4_580,
        finalColorFraction: 0.42,
        finalColorStartFraction: 0.58,
        launchSpreadFraction: 0.356,
        travelFraction: 0.5,
      },
    },
  },
  id: "fireworks",
  label: "Fireworks",
  schema,
  source: createTtfxSourceReference("fireworks", "src/effects/fireworks.rs"),
});
