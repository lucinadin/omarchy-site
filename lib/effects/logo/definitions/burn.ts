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
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
import { clamp, hashUnit } from "@/lib/effects/logo/runtime/math";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  logoEffectField,
  type LogoEffectRuntimeValues,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { GlyphParticle, LogoEffectContext } from "@/lib/effects/logo/types";

const BURN_GLYPHS = ["'", ".", "▖", "▙", "█", "▜", "▀", "▝", "."] as const;
const SMOKE_GLYPHS = [".", ",", "'", "`", "#", "*"] as const;

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
      initialDelayMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 1_000, minimum: 0, step: 10 },
        label: "Initial delay",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      ignitionSpreadFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Ignition spread",
        tier: "identity",
        update: "live",
      }),
      burnFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Burn time",
        tier: "identity",
        update: "live",
      }),
      settleFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Settle time",
        tier: "identity",
        update: "live",
      }),
      smokeStartFraction: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 2, minimum: 0, step: 0.01 },
        label: "Smoke delay",
        tier: "advanced",
        update: "live",
      }),
      smokeStaggerFraction: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 2, minimum: 0, step: 0.01 },
        label: "Smoke stagger",
        tier: "advanced",
        update: "live",
      }),
      smokeLifetimeFraction: logoEffectField.number({
        constraint: { minimum: 0.01 },
        editor: { maximum: 3, minimum: 0.01, step: 0.01 },
        label: "Smoke lifetime",
        tier: "advanced",
        update: "live",
      }),
      emissionEndFraction: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 4, minimum: 0, step: 0.05 },
        label: "Emission cutoff",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  propagation: logoEffectField.group({
    fields: {
      rowWeight: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 8, minimum: 0, step: 0.1 },
        label: "Vertical distance weight",
        tier: "identity",
        update: "rebuild",
      }),
      randomJitter: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.1 },
        label: "Ignition jitter",
        tier: "identity",
        update: "rebuild",
      }),
    },
    label: "Propagation",
    tier: "identity",
  }),
  smoke: logoEffectField.group({
    fields: {
      countPerCell: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 6, minimum: 1, step: 1 },
        label: "Puffs per cell",
        tier: "identity",
        update: "rebuild",
      }),
      driftColumns: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 16, minimum: 0, step: 0.25 },
        label: "Drift width",
        tier: "identity",
        update: "live",
      }),
      riseRows: logoEffectField.range({
        constraint: { minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.25 },
        label: "Rise distance",
        tier: "identity",
        update: "live",
      }),
      startScale: logoEffectField.number({
        constraint: { minimum: 0.1 },
        editor: { maximum: 2, minimum: 0.1, step: 0.05 },
        label: "Start scale",
        tier: "advanced",
        update: "live",
      }),
      scaleGrowth: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 2, minimum: 0, step: 0.05 },
        label: "Scale growth",
        tier: "advanced",
        update: "live",
      }),
      brightMix: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Brightness",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Smoke",
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
      unlitMutedMix: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Unlit dimming",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
  glyphs: logoEffectField.group({
    fields: {
      burnSymbols: logoEffectField.symbols({
        constraint: { maximumItems: 32, minimumItems: 1 },
        label: "Burn symbols",
        tier: "identity",
        update: "live",
      }),
      smokeSymbols: logoEffectField.symbols({
        constraint: { maximumItems: 32, minimumItems: 1 },
        label: "Smoke symbols",
        tier: "identity",
        update: "live",
      }),
      restoreThreshold: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Restore threshold",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Glyphs",
    tier: "identity",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

function createRuntime({ cells, palette, seed }: LogoEffectContext, values: Values) {
  const bounds = getLogoBounds(cells);
  const originIndex = Math.floor(hashUnit(seed, 373) * cells.length);
  const origin = cells[originIndex];
  const order = cells
    .map((cell) => cell.index)
    .toSorted((left, right) => {
      const leftCell = cells[left];
      const rightCell = cells[right];
      const leftScore =
        Math.abs(leftCell.column - origin.column) +
        Math.abs(leftCell.row - origin.row) * values.propagation.rowWeight +
        hashUnit(seed, left * 379 + 11) * values.propagation.randomJitter;
      const rightScore =
        Math.abs(rightCell.column - origin.column) +
        Math.abs(rightCell.row - origin.row) * values.propagation.rowWeight +
        hashUnit(seed, right * 379 + 11) * values.propagation.randomJitter;
      return leftScore - rightScore;
    });
  const rank = new Uint32Array(cells.length);
  order.forEach((cellIndex, index) => {
    rank[cellIndex] = index;
  });
  const getFireColors = createLivePaletteColorStops(palette, (stops, currentPalette) => {
    stops[0] = currentPalette.bright;
    stops[1] = currentPalette.laser[0];
    stops[2] = currentPalette.laser[1];
    stops[3] = currentPalette.final;
    stops[4] = currentPalette.muted;
  });

  const timing = (cellIndex: number, current: Values) => {
    const start =
      current.timing.initialDelayMs +
      (rank[cellIndex] / Math.max(1, cells.length - 1)) *
        current.timing.durationMs *
        current.timing.ignitionSpreadFraction;
    return { burnDuration: current.timing.durationMs * current.timing.burnFraction, start };
  };

  return createSampledLogoEffectRuntime(cells, values, {
    extraInstanceCapacity: cells.length * values.smoke.countPerCell,
    particles(frame, current): GlyphParticle[] {
      const particles: GlyphParticle[] = [];
      for (const cell of cells) {
        const { burnDuration, start } = timing(cell.index, current);
        const age = frame.revealMs - start;
        if (
          age < burnDuration * current.timing.smokeStartFraction ||
          age > burnDuration * current.timing.emissionEndFraction
        )
          continue;
        for (let smokeIndex = 0; smokeIndex < current.smoke.countPerCell; smokeIndex += 1) {
          const smokeAge = clamp(
            (age -
              burnDuration *
                (current.timing.smokeStartFraction +
                  smokeIndex * current.timing.smokeStaggerFraction)) /
              (burnDuration * current.timing.smokeLifetimeFraction)
          );
          if (smokeAge <= 0 || smokeAge >= 1) continue;
          const drift = hashUnit(seed, cell.index * 383 + smokeIndex * 17) - 0.5;
          particles.push({
            alpha: 1 - smokeAge,
            channel: "particle",
            color: mixColor(palette.muted, palette.bright, smokeAge * current.smoke.brightMix),
            column: cell.column + drift * current.smoke.driftColumns * smokeAge,
            glyph:
              current.glyphs.smokeSymbols[
                (cell.index + smokeIndex) % current.glyphs.smokeSymbols.length
              ],
            row:
              cell.row -
              smokeAge *
                (current.smoke.riseRows[0] +
                  hashUnit(seed, cell.index * 389 + smokeIndex) *
                    (current.smoke.riseRows[1] - current.smoke.riseRows[0])),
            scale: current.smoke.startScale + smokeAge * current.smoke.scaleGrowth,
          });
        }
      }
      return particles;
    },
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const { burnDuration, start } = timing(cell.index, current);
      const age = frame.revealMs - start;
      const baseColor = logoCellColor(cell, palette, bounds.rows);
      if (age < 0)
        return {
          color: mixColor(baseColor, palette.muted, current.appearance.unlitMutedMix),
          glyph: cell.glyph,
        };
      const burn = clamp(age / burnDuration);
      const settle = clamp(
        (age - burnDuration) / (current.timing.durationMs * current.timing.settleFraction)
      );
      const glyphIndex = Math.min(
        current.glyphs.burnSymbols.length - 1,
        Math.floor(burn * current.glyphs.burnSymbols.length)
      );
      return {
        color:
          settle > 0
            ? mixColor(palette.muted, baseColor, settle)
            : sampleColorStops(getFireColors(), burn),
        glow: (1 - settle) * Math.sin(burn * Math.PI) * current.appearance.intensity,
        glyph:
          settle > current.glyphs.restoreThreshold
            ? cell.glyph
            : current.glyphs.burnSymbols[glyphIndex],
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
      appearance: { intensity: 0.75, unlitMutedMix: 0.45 },
      glyphs: { burnSymbols: BURN_GLYPHS, restoreThreshold: 0.7, smokeSymbols: SMOKE_GLYPHS },
      propagation: { randomJitter: 3, rowWeight: 2 },
      smoke: {
        brightMix: 0.5,
        countPerCell: 2,
        driftColumns: 5,
        riseRows: [3, 4],
        scaleGrowth: 0.35,
        startScale: 0.65,
      },
      timing: {
        burnFraction: 0.16,
        durationMs: 3_680,
        emissionEndFraction: 1.8,
        ignitionSpreadFraction: 0.7,
        initialDelayMs: 80,
        settleFraction: 0.12,
        smokeLifetimeFraction: 1,
        smokeStaggerFraction: 0.22,
        smokeStartFraction: 0.25,
      },
    },
  },
  id: "burn",
  label: "Burn",
  schema,
  source: createTtfxSourceReference("burn", "src/effects/burn.rs"),
});
