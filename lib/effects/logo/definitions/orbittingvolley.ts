import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import {
  createLivePaletteColorStops,
  logoCellColor,
  mixColor,
  sampleColorStops,
} from "@/lib/effects/logo/runtime/color";
import { easeOutSine } from "@/lib/effects/logo/runtime/easing";
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
import { clamp } from "@/lib/effects/logo/runtime/math";
import { interpolatePoint } from "@/lib/effects/logo/runtime/path";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  type LogoEffectRuntimeValues,
  logoEffectField,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { GlyphParticle, LogoEffectContext, LogoPoint } from "@/lib/effects/logo/types";

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
      orbitFraction: logoEffectField.number({
        constraint: { maximum: 0.9, minimum: 0.1 },
        editor: { maximum: 0.9, minimum: 0.1, step: 0.01 },
        label: "Orbit and launch spread",
        tier: "identity",
        update: "live",
      }),
      projectileTravelFraction: logoEffectField.number({
        constraint: { maximum: 0.8, minimum: 0.01 },
        editor: { maximum: 0.8, minimum: 0.01, step: 0.01 },
        label: "Projectile travel time",
        tier: "identity",
        update: "live",
      }),
      launcherEndFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.1 },
        editor: { maximum: 1, minimum: 0.1, step: 0.01 },
        label: "Launcher visibility",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  launchers: logoEffectField.group({
    fields: {
      count: logoEffectField.number({
        constraint: { integer: true, maximum: 4, minimum: 1 },
        editor: { maximum: 4, minimum: 1, step: 1 },
        label: "Launcher count",
        tier: "identity",
        update: "rebuild",
      }),
      volleySize: logoEffectField.number({
        constraint: { integer: true, maximum: 16, minimum: 1 },
        editor: { maximum: 16, minimum: 1, step: 1 },
        label: "Volley size",
        tier: "identity",
        update: "live",
      }),
      symbol: logoEffectField.symbol({
        label: "Launcher symbol",
        tier: "identity",
        update: "live",
      }),
      scale: logoEffectField.number({
        constraint: { maximum: 2, minimum: 0.1 },
        editor: { maximum: 2, minimum: 0.1, step: 0.01 },
        label: "Launcher scale",
        tier: "identity",
        update: "live",
      }),
      glow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Launcher glow",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Launchers",
    tier: "identity",
  }),
  motion: logoEffectField.group({
    fields: {
      perimeterOverscanCells: logoEffectField.number({
        constraint: { maximum: 12, minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.25 },
        label: "Perimeter overscan",
        tier: "identity",
        update: "live",
      }),
      rowDistanceScale: logoEffectField.number({
        constraint: { maximum: 6, minimum: 0.1 },
        editor: { maximum: 6, minimum: 0.1, step: 0.1 },
        label: "Center-sort row weight",
        tier: "advanced",
        update: "rebuild",
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
      projectileGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Projectile glow",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
});

function perimeterPoint(
  progress: number,
  maxColumn: number,
  maxRow: number,
  overscan: number
): LogoPoint {
  const width = maxColumn + overscan * 2;
  const height = maxRow + overscan * 2;
  const perimeter = 2 * width + 2 * height;
  let distance = (((progress % 1) + 1) % 1) * perimeter;

  if (distance <= width) return { column: distance - overscan, row: -overscan };
  distance -= width;
  if (distance <= height) {
    return { column: maxColumn + overscan, row: distance - overscan };
  }
  distance -= height;
  if (distance <= width) {
    return { column: maxColumn + overscan - distance, row: maxRow + overscan };
  }
  distance -= width;
  return { column: -overscan, row: maxRow + overscan - distance };
}

function createRuntime(
  { cells, palette }: LogoEffectContext,
  values: LogoEffectRuntimeValues<typeof schema>
) {
  const bounds = getLogoBounds(cells);
  const centered = cells.toSorted((left, right) => {
    const leftDistance = Math.hypot(
      left.column - bounds.centerColumn,
      (left.row - bounds.centerRow) * values.motion.rowDistanceScale
    );
    const rightDistance = Math.hypot(
      right.column - bounds.centerColumn,
      (right.row - bounds.centerRow) * values.motion.rowDistanceScale
    );
    return leftDistance - rightDistance || left.index - right.index;
  });
  const rank = new Uint32Array(cells.length);
  centered.forEach((cell, index) => {
    rank[cell.index] = index;
  });
  const getLauncherColors = createLivePaletteColorStops(palette, (stops, currentPalette) => {
    stops[0] = currentPalette.laser[0];
    stops[1] = currentPalette.laser[1];
    stops[2] = currentPalette.ciphertext[2];
    stops[3] = currentPalette.final;
  });

  return createSampledLogoEffectRuntime(cells, values, {
    extraInstanceCapacity: values.launchers.count,
    particles(frame, current): GlyphParticle[] {
      const duration = current.timing.durationMs;
      if (frame.revealMs >= duration * current.timing.launcherEndFraction) return [];
      const orbit = frame.revealMs / (duration * current.timing.orbitFraction);
      const launcherColors = getLauncherColors();
      return Array.from({ length: current.launchers.count }, (_, launcherIndex) => {
        const point = perimeterPoint(
          orbit + launcherIndex / current.launchers.count,
          bounds.maxColumn,
          bounds.maxRow,
          current.motion.perimeterOverscanCells
        );
        return {
          channel: "shell",
          color: launcherColors[launcherIndex],
          column: point.column,
          glow: current.appearance.intensity * current.launchers.glow,
          glyph: current.launchers.symbol,
          row: point.row,
          scale: current.launchers.scale,
        };
      });
    },
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const duration = current.timing.durationMs;
      const launcherIndex = rank[cell.index] % current.launchers.count;
      const magazineRank = Math.floor(rank[cell.index] / current.launchers.count);
      const magazineSize = Math.ceil(cells.length / current.launchers.count);
      const volley = current.launchers.volleySize;
      const volleyIndex = Math.floor(magazineRank / volley);
      const volleyCount = Math.ceil(magazineSize / volley);
      const launchAt =
        (volleyIndex / Math.max(1, volleyCount - 1)) * duration * current.timing.orbitFraction;
      if (frame.revealMs < launchAt) return null;

      const launchOrbit = launchAt / (duration * current.timing.orbitFraction);
      const start = perimeterPoint(
        launchOrbit + launcherIndex / current.launchers.count,
        bounds.maxColumn,
        bounds.maxRow,
        current.motion.perimeterOverscanCells
      );
      const progress = easeOutSine(
        clamp((frame.revealMs - launchAt) / (duration * current.timing.projectileTravelFraction))
      );
      const point = interpolatePoint(start, cell, progress);
      const baseColor = logoCellColor(cell, palette, bounds.rows);
      const launcherColors = getLauncherColors();
      return {
        color: mixColor(
          sampleColorStops(launcherColors, launcherIndex / current.launchers.count, true),
          baseColor,
          progress
        ),
        glow: (1 - progress) * current.appearance.intensity * current.appearance.projectileGlow,
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
      appearance: { intensity: 0.75, projectileGlow: 0.64 },
      launchers: {
        count: 4,
        glow: 0.8,
        scale: 1.12,
        symbol: "█",
        volleySize: 3,
      },
      motion: { perimeterOverscanCells: 1, rowDistanceScale: 2 },
      timing: {
        durationMs: 4_100,
        launcherEndFraction: 0.92,
        orbitFraction: 0.62,
        projectileTravelFraction: 0.24,
      },
    },
  },
  id: "orbittingvolley",
  label: "Orbiting Volley",
  schema,
  source: createTtfxSourceReference("orbittingvolley", "src/effects/orbittingvolley.rs"),
});
