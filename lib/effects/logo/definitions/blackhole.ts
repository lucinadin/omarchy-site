import { literalLogoColor } from "@/lib/effects/logo/color-bindings";
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
import {
  easeInCubic,
  easeInExpo,
  easeInOutSine,
  easeOutExpo,
} from "@/lib/effects/logo/runtime/easing";
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
      durationMs: logoEffectField.number({
        constraint: { minimum: 500 },
        editor: { maximum: 12_000, minimum: 500, step: 50 },
        label: "Duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      gatherEndFraction: logoEffectField.number({
        constraint: { maximum: 0.5, minimum: 0.01 },
        editor: { maximum: 0.5, minimum: 0.01, step: 0.01 },
        label: "Gather end",
        tier: "identity",
        update: "live",
      }),
      orbitEndFraction: logoEffectField.number({
        constraint: { maximum: 0.8, minimum: 0.1 },
        editor: { maximum: 0.8, minimum: 0.1, step: 0.01 },
        label: "Orbit end",
        tier: "identity",
        update: "live",
      }),
      collapseEndFraction: logoEffectField.number({
        constraint: { maximum: 0.9, minimum: 0.2 },
        editor: { maximum: 0.9, minimum: 0.2, step: 0.01 },
        label: "Collapse end",
        tier: "identity",
        update: "live",
      }),
      explosionEndFraction: logoEffectField.number({
        constraint: { maximum: 0.99, minimum: 0.3 },
        editor: { maximum: 0.99, minimum: 0.3, step: 0.01 },
        label: "Explosion end",
        tier: "identity",
        update: "live",
      }),
      consumeSpreadFraction: logoEffectField.number({
        constraint: { maximum: 0.6, minimum: 0 },
        editor: { maximum: 0.6, minimum: 0, step: 0.01 },
        label: "Consumption spread",
        tier: "advanced",
        update: "live",
      }),
      consumeDurationFraction: logoEffectField.number({
        constraint: { maximum: 0.5, minimum: 0.01 },
        editor: { maximum: 0.5, minimum: 0.01, step: 0.01 },
        label: "Consumption time",
        tier: "advanced",
        update: "live",
      }),
      expansionPeakFraction: logoEffectField.number({
        constraint: { maximum: 0.9, minimum: 0.05 },
        editor: { maximum: 0.9, minimum: 0.05, step: 0.01 },
        label: "Expansion peak",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  ring: logoEffectField.group({
    fields: {
      minimumCellCount: logoEffectField.number({
        constraint: { integer: true, maximum: 128, minimum: 1 },
        editor: { maximum: 128, minimum: 1, step: 1 },
        label: "Minimum ring cells",
        tier: "identity",
        update: "live",
      }),
      cellFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Ring cell share",
        tier: "identity",
        update: "live",
      }),
      radiusRows: logoEffectField.number({
        constraint: { maximum: 12, minimum: 0.1 },
        editor: { maximum: 12, minimum: 0.1, step: 0.1 },
        label: "Ring radius",
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
      gatherTurnsPerProgress: logoEffectField.number({
        constraint: { maximum: 12, minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.25 },
        label: "Gather rotation",
        tier: "advanced",
        update: "live",
      }),
      orbitTurnsPerProgress: logoEffectField.number({
        constraint: { maximum: 20, minimum: 0 },
        editor: { maximum: 20, minimum: 0, step: 0.25 },
        label: "Orbit rotation",
        tier: "identity",
        update: "live",
      }),
      collapseTurns: logoEffectField.number({
        constraint: { maximum: 8, minimum: 0 },
        editor: { maximum: 8, minimum: 0, step: 0.25 },
        label: "Collapse rotation",
        tier: "advanced",
        update: "live",
      }),
      expansionScale: logoEffectField.number({
        constraint: { maximum: 2, minimum: 0 },
        editor: { maximum: 2, minimum: 0, step: 0.05 },
        label: "Collapse expansion",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Singularity ring",
    tier: "identity",
  }),
  burst: logoEffectField.group({
    fields: {
      columnDistance: logoEffectField.range({
        constraint: { maximum: 20, minimum: 0 },
        editor: { maximum: 20, minimum: 0, step: 0.25 },
        label: "Horizontal distance",
        tier: "identity",
        update: "live",
      }),
      rowDistance: logoEffectField.range({
        constraint: { maximum: 12, minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.25 },
        label: "Vertical distance",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Explosion",
    tier: "identity",
  }),
  glyphs: logoEffectField.group({
    fields: {
      starSymbols: logoEffectField.symbols({
        constraint: { maximumItems: 32, minimumItems: 1 },
        label: "Star symbols",
        tier: "identity",
        update: "live",
      }),
      singularitySymbols: logoEffectField.symbols({
        constraint: { maximumItems: 32, minimumItems: 1 },
        label: "Singularity symbols",
        tier: "identity",
        update: "live",
      }),
      ringSymbol: logoEffectField.symbol({
        label: "Ring symbol",
        tier: "advanced",
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
      starGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Star glow",
        tier: "advanced",
        update: "live",
      }),
      gatherGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Gather glow",
        tier: "advanced",
        update: "live",
      }),
      orbitGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Orbit glow",
        tier: "advanced",
        update: "live",
      }),
      singularityGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Singularity glow",
        tier: "advanced",
        update: "live",
      }),
      explosionGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Explosion glow",
        tier: "advanced",
        update: "live",
      }),
      consumedColor: logoEffectField.color({
        label: "Consumed color",
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
  const order = cells
    .map((cell) => cell.index)
    .toSorted((left, right) => hashUnit(seed, left * 317 + 7) - hashUnit(seed, right * 317 + 7));
  const rank = new Uint32Array(cells.length);
  order.forEach((cellIndex, index) => {
    rank[cellIndex] = index;
  });
  const starfield = cells.map((cell) => ({
    column: hashUnit(seed, cell.index * 331 + 19) * bounds.maxColumn,
    row: hashUnit(seed, cell.index * 337 + 23) * bounds.maxRow,
  }));
  const getStarColors = createLivePaletteColorStops(palette, (stops, currentPalette) => {
    stops[0] = currentPalette.laser[0];
    stops[1] = currentPalette.laser[1];
    stops[2] = currentPalette.ciphertext[0];
    stops[3] = currentPalette.ciphertext[2];
    stops[4] = currentPalette.final;
  });

  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const duration = current.timing.durationMs;
      const progress = clamp(frame.revealMs / duration);
      const ringCount = Math.max(
        current.ring.minimumCellCount,
        Math.min(cells.length, Math.round(cells.length * current.ring.cellFraction))
      );
      const isRing = rank[cell.index] < ringCount;
      const ringSlot = rank[cell.index] / ringCount;
      const radius = current.ring.radiusRows;
      const ringPoint = (angleOffset = 0, radiusScale = 1) => ({
        column:
          bounds.centerColumn +
          Math.cos(ringSlot * Math.PI * 2 + angleOffset) *
            radius *
            current.ring.columnRadiusScale *
            radiusScale,
        row:
          bounds.centerRow + Math.sin(ringSlot * Math.PI * 2 + angleOffset) * radius * radiusScale,
      });
      const center = { column: bounds.centerColumn, row: bounds.centerRow };
      let point = starfield[cell.index];
      let glyph: string =
        current.glyphs.starSymbols[cell.index % current.glyphs.starSymbols.length];
      let color = mixColor(palette.muted, palette.bright, hashUnit(seed, cell.index * 347 + 31));
      let glow = current.appearance.starGlow;

      if (progress < current.timing.gatherEndFraction) {
        if (isRing) {
          point = interpolatePoint(
            starfield[cell.index],
            ringPoint(progress * Math.PI * 2 * current.ring.gatherTurnsPerProgress),
            easeInOutSine(progress / current.timing.gatherEndFraction)
          );
          glyph = current.glyphs.ringSymbol;
          color = palette.bright;
          glow = current.appearance.gatherGlow;
        }
      } else if (progress < current.timing.orbitEndFraction) {
        if (isRing) {
          point = ringPoint(
            (progress - current.timing.gatherEndFraction) *
              Math.PI *
              2 *
              current.ring.orbitTurnsPerProgress
          );
          glyph = current.glyphs.ringSymbol;
          color = palette.bright;
          glow = current.appearance.orbitGlow;
        } else {
          const consumeRank =
            (rank[cell.index] - ringCount) / Math.max(1, cells.length - ringCount - 1);
          const consumeAt =
            current.timing.gatherEndFraction + consumeRank * current.timing.consumeSpreadFraction;
          const consume = easeInExpo(
            clamp((progress - consumeAt) / current.timing.consumeDurationFraction)
          );
          point = interpolatePoint(starfield[cell.index], center, consume);
          color = mixColor(color, current.appearance.consumedColor, consume);
          if (consume >= 1) return null;
        }
      } else if (progress < current.timing.collapseEndFraction) {
        if (!isRing) return null;
        const collapse = clamp(
          (progress - current.timing.orbitEndFraction) /
            (current.timing.collapseEndFraction - current.timing.orbitEndFraction)
        );
        const expansion =
          collapse < current.timing.expansionPeakFraction
            ? easeInExpo(collapse / current.timing.expansionPeakFraction) *
              current.ring.expansionScale
            : 0;
        const inward = easeInExpo(
          clamp(
            (collapse - current.timing.expansionPeakFraction) /
              (1 - current.timing.expansionPeakFraction)
          )
        );
        point = interpolatePoint(
          ringPoint(collapse * Math.PI * 2 * current.ring.collapseTurns, 1 + expansion),
          center,
          inward
        );
        glyph =
          current.glyphs.singularitySymbols[
            Math.min(
              current.glyphs.singularitySymbols.length - 1,
              Math.floor(collapse * current.glyphs.singularitySymbols.length)
            )
          ];
        color = sampleColorStops(getStarColors(), collapse, true);
        glow = current.appearance.singularityGlow;
      } else {
        const explosion = clamp(
          (progress - current.timing.collapseEndFraction) /
            (current.timing.explosionEndFraction - current.timing.collapseEndFraction)
        );
        const returnProgress = easeInCubic(
          clamp(
            (progress - current.timing.explosionEndFraction) /
              (1 - current.timing.explosionEndFraction)
          )
        );
        const angle = hashUnit(seed, cell.index * 349 + 43) * Math.PI * 2;
        const columnDistance =
          current.burst.columnDistance[0] +
          hashUnit(seed, cell.index * 353 + 47) *
            (current.burst.columnDistance[1] - current.burst.columnDistance[0]);
        const rowDistance =
          current.burst.rowDistance[0] +
          hashUnit(seed, cell.index * 359 + 53) *
            (current.burst.rowDistance[1] - current.burst.rowDistance[0]);
        const burst = {
          column: cell.column + Math.cos(angle) * columnDistance,
          row: cell.row + Math.sin(angle) * rowDistance,
        };
        const exploded = interpolatePoint(center, burst, easeOutExpo(explosion));
        point = interpolatePoint(exploded, cell, returnProgress);
        glyph = cell.glyph;
        color = mixColor(
          sampleColorStops(getStarColors(), hashUnit(seed, cell.index * 367 + 61), true),
          logoCellColor(cell, palette, bounds.rows),
          returnProgress
        );
        glow = (1 - returnProgress) * current.appearance.explosionGlow;
      }

      return {
        color,
        glow: glow * current.appearance.intensity,
        glyph,
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
      appearance: {
        consumedColor: literalLogoColor([0, 0, 0], "Black-hole consumption target"),
        explosionGlow: 0.9,
        gatherGlow: 0.72,
        intensity: 0.75,
        orbitGlow: 0.85,
        singularityGlow: 1,
        starGlow: 0.12,
      },
      burst: { columnDistance: [3, 9], rowDistance: [1.5, 4.5] },
      glyphs: {
        ringSymbol: "*",
        singularitySymbols: ["◦", "◎", "◉", "●", "◉", "◎", "◦"],
        starSymbols: ["*", "'", "`", "¤", "•", "°", "·"],
      },
      ring: {
        cellFraction: 0.152,
        collapseTurns: 1.5,
        columnRadiusScale: 2,
        expansionScale: 0.55,
        gatherTurnsPerProgress: 1,
        minimumCellCount: 12,
        orbitTurnsPerProgress: 5,
        radiusRows: 3.58,
      },
      timing: {
        collapseEndFraction: 0.68,
        consumeDurationFraction: 0.1,
        consumeSpreadFraction: 0.28,
        durationMs: 5_980,
        expansionPeakFraction: 0.36,
        explosionEndFraction: 0.8,
        gatherEndFraction: 0.18,
        orbitEndFraction: 0.56,
      },
    },
  },
  id: "blackhole",
  label: "Black Hole",
  schema,
  source: createTtfxSourceReference("blackhole", "src/effects/blackhole.rs"),
});
