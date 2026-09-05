import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { easeInOutSine } from "@/lib/effects/logo/runtime/easing";
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
import { clamp, hashUnit } from "@/lib/effects/logo/runtime/math";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  logoEffectField,
  type LogoEffectRuntimeValues,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { GlyphParticle, LogoEffectContext, LogoPoint } from "@/lib/effects/logo/types";

const schema = defineLogoEffectSchema({
  timing: logoEffectField.group({
    fields: {
      durationMs: logoEffectField.number({
        constraint: { minimum: 500 },
        editor: { maximum: 12_000, minimum: 500, step: 50 },
        label: "Duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      searchEndFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Search end",
        tier: "identity",
        update: "live",
      }),
      convergeFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Convergence time",
        tier: "identity",
        update: "live",
      }),
      markerEndFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Marker end",
        tier: "advanced",
        update: "live",
      }),
      expansionStartFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Expansion start",
        tier: "advanced",
        update: "live",
      }),
      expansionFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Expansion time",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  motion: logoEffectField.group({
    fields: {
      spotlightCount: logoEffectField.number({
        constraint: { integer: true, maximum: 5, minimum: 1 },
        editor: { maximum: 5, minimum: 1, step: 1 },
        label: "Spotlight count",
        tier: "identity",
        update: "live",
      }),
      columnFrequency: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.1 },
        label: "Horizontal frequency",
        tier: "identity",
        update: "live",
      }),
      columnFrequencyStep: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 3, minimum: 0, step: 0.05 },
        label: "Horizontal frequency step",
        tier: "advanced",
        update: "live",
      }),
      rowFrequency: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.1 },
        label: "Vertical frequency",
        tier: "identity",
        update: "live",
      }),
      rowFrequencyStep: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 3, minimum: 0, step: 0.05 },
        label: "Vertical frequency step",
        tier: "advanced",
        update: "live",
      }),
      phaseStepRadians: logoEffectField.number({
        editor: { maximum: 6.3, minimum: 0, step: 0.01 },
        label: "Phase step",
        tier: "advanced",
        unit: "radians",
        update: "live",
      }),
      columnAmplitude: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Horizontal amplitude",
        tier: "identity",
        update: "live",
      }),
      rowAmplitude: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Vertical amplitude",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Motion",
    tier: "identity",
  }),
  glyphs: logoEffectField.group({
    fields: {
      marker: logoEffectField.symbol({
        label: "Spotlight marker",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Glyphs",
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
      beamRadius: logoEffectField.number({
        constraint: { minimum: 0.1 },
        editor: { maximum: 16, minimum: 0.1, step: 0.1 },
        label: "Beam radius",
        tier: "identity",
        update: "live",
      }),
      rowDistanceScale: logoEffectField.number({
        constraint: { minimum: 0.1 },
        editor: { maximum: 6, minimum: 0.1, step: 0.1 },
        label: "Vertical distance scale",
        tier: "advanced",
        update: "live",
      }),
      markerScale: logoEffectField.number({
        constraint: { minimum: 0.25 },
        editor: { maximum: 2, minimum: 0.25, step: 0.01 },
        label: "Marker scale",
        tier: "advanced",
        update: "live",
      }),
      dimAlpha: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Dim alpha",
        tier: "advanced",
        update: "live",
      }),
      dimColorMix: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Dim color mix",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

function spotlightPosition(
  index: number,
  progress: number,
  centerColumn: number,
  centerRow: number,
  maxColumn: number,
  maxRow: number,
  seed: number,
  values: Values
): LogoPoint {
  if (progress < values.timing.searchEndFraction) {
    const phase =
      index * values.motion.phaseStepRadians + hashUnit(seed, index * 431 + 7) * Math.PI;
    return {
      column:
        centerColumn +
        Math.sin(
          progress *
            Math.PI *
            (values.motion.columnFrequency + index * values.motion.columnFrequencyStep) +
            phase
        ) *
          maxColumn *
          values.motion.columnAmplitude,
      row:
        centerRow +
        Math.cos(
          progress *
            Math.PI *
            (values.motion.rowFrequency + index * values.motion.rowFrequencyStep) +
            phase
        ) *
          maxRow *
          values.motion.rowAmplitude,
    };
  }
  const searchEnd = spotlightPosition(
    index,
    values.timing.searchEndFraction - 0.0001,
    centerColumn,
    centerRow,
    maxColumn,
    maxRow,
    seed,
    values
  );
  const converge = easeInOutSine(
    clamp((progress - values.timing.searchEndFraction) / values.timing.convergeFraction)
  );
  return {
    column: searchEnd.column + (centerColumn - searchEnd.column) * converge,
    row: searchEnd.row + (centerRow - searchEnd.row) * converge,
  };
}

function createRuntime({ cells, palette, seed }: LogoEffectContext, values: Values) {
  const bounds = getLogoBounds(cells);

  return createSampledLogoEffectRuntime(cells, values, {
    extraInstanceCapacity: 5,
    particles(frame, current): GlyphParticle[] {
      const duration = current.timing.durationMs;
      const progress = clamp(frame.revealMs / duration);
      if (progress >= current.timing.markerEndFraction) return [];
      return Array.from({ length: current.motion.spotlightCount }, (_, index) => {
        const point = spotlightPosition(
          index,
          progress,
          bounds.centerColumn,
          bounds.centerRow,
          bounds.maxColumn,
          bounds.maxRow,
          seed,
          current
        );
        return {
          channel: "helper",
          color: palette.bright,
          column: point.column,
          glow: current.appearance.intensity,
          glyph: current.glyphs.marker,
          row: point.row,
          scale: current.appearance.markerScale,
        };
      });
    },
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const duration = current.timing.durationMs;
      const progress = clamp(frame.revealMs / duration);
      let illumination = 0;
      for (let index = 0; index < current.motion.spotlightCount; index += 1) {
        const point = spotlightPosition(
          index,
          progress,
          bounds.centerColumn,
          bounds.centerRow,
          bounds.maxColumn,
          bounds.maxRow,
          seed,
          current
        );
        const distance = Math.hypot(
          cell.column - point.column,
          (cell.row - point.row) * current.appearance.rowDistanceScale
        );
        illumination = Math.max(illumination, clamp(1 - distance / current.appearance.beamRadius));
      }
      if (progress >= current.timing.expansionStartFraction) {
        const expandedRadius =
          current.appearance.beamRadius +
          ((progress - current.timing.expansionStartFraction) / current.timing.expansionFraction) *
            bounds.maxColumn;
        const distance = Math.hypot(
          cell.column - bounds.centerColumn,
          (cell.row - bounds.centerRow) * current.appearance.rowDistanceScale
        );
        illumination = Math.max(illumination, clamp(1 - distance / expandedRadius));
      }
      const baseColor = logoCellColor(cell, palette, bounds.rows);
      return {
        alpha: current.appearance.dimAlpha + illumination * (1 - current.appearance.dimAlpha),
        color: mixColor(
          palette.muted,
          baseColor,
          current.appearance.dimColorMix + illumination * (1 - current.appearance.dimColorMix)
        ),
        glow: illumination * current.appearance.intensity * 0.5,
        glyph: cell.glyph,
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
        beamRadius: 4.3,
        dimAlpha: 0.36,
        dimColorMix: 0.14,
        intensity: 0.75,
        markerScale: 1.12,
        rowDistanceScale: 2,
      },
      glyphs: { marker: "O" },
      motion: {
        columnAmplitude: 0.46,
        columnFrequency: 4.2,
        columnFrequencyStep: 0.4,
        phaseStepRadians: 2.13,
        rowAmplitude: 0.47,
        rowFrequency: 5.1,
        rowFrequencyStep: 0.3,
        spotlightCount: 4,
      },
      timing: {
        convergeFraction: 0.12,
        durationMs: 5_080,
        expansionFraction: 0.16,
        expansionStartFraction: 0.84,
        markerEndFraction: 0.86,
        searchEndFraction: 0.72,
      },
    },
  },
  id: "spotlights",
  label: "Spotlights",
  schema,
  source: createTtfxSourceReference("spotlights", "src/effects/spotlights.rs"),
});
