import {
  DEFAULT_LOGO_EFFECT_PLAYBACK,
  DEFAULT_LOGO_EFFECT_PRESENTATION,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import {
  OMARCHY_MARK_COLUMNS as COLUMNS,
  OMARCHY_MARK_ROWS as ROWS,
} from "@/lib/effects/logo/mark";
import { mixColor } from "@/lib/effects/logo/runtime/color";
import { pointerProximity } from "@/lib/effects/logo/runtime/grid";
import { clamp, hashUnit, positiveModulo } from "@/lib/effects/logo/runtime/math";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  type LogoEffectRuntimeValues,
  logoEffectField,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type {
  GlyphParticle,
  LogoCell,
  LogoEffectContext,
  LogoEffectFrame,
} from "@/lib/effects/logo/types";

const schema = defineLogoEffectSchema({
  timing: logoEffectField.group({
    fields: {
      durationMs: logoEffectField.number({
        constraint: { minimum: 500 },
        editor: { maximum: 8_000, minimum: 500, step: 50 },
        label: "Reveal duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      rowCycleMs: logoEffectField.number({
        constraint: { minimum: 1 },
        editor: { maximum: 5_000, minimum: 1, step: 10 },
        label: "Row beam cycle",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      columnCycleMs: logoEffectField.number({
        constraint: { minimum: 1 },
        editor: { maximum: 5_000, minimum: 1, step: 10 },
        label: "Column beam cycle",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  hit: logoEffectField.group({
    fields: {
      rowStartMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 2_000, minimum: 0, step: 10 },
        label: "Row hit start",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      rowBeamStaggerMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 1_000, minimum: 0, step: 5 },
        label: "Row beam stagger",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      rowJitterMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 2_000, minimum: 0, step: 10 },
        label: "Row hit jitter",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      rowTravelMs: logoEffectField.range({
        constraint: { minimum: 1 },
        editor: { maximum: 3_000, minimum: 1, step: 10 },
        label: "Row travel range",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      columnStartMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 2_000, minimum: 0, step: 10 },
        label: "Column hit start",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      columnBeamStaggerMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 1_000, minimum: 0, step: 5 },
        label: "Column beam stagger",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      columnJitterMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 2_000, minimum: 0, step: 10 },
        label: "Column hit jitter",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      columnTravelMs: logoEffectField.range({
        constraint: { minimum: 1 },
        editor: { maximum: 3_000, minimum: 1, step: 10 },
        label: "Column travel range",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      flashDurationMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 1_000, minimum: 0, step: 10 },
        label: "Hit flash",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      colorTransitionMs: logoEffectField.number({
        constraint: { minimum: 1 },
        editor: { maximum: 1_000, minimum: 1, step: 10 },
        label: "Hit color transition",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      glowDecayMs: logoEffectField.number({
        constraint: { minimum: 1 },
        editor: { maximum: 1_000, minimum: 1, step: 10 },
        label: "Hit glow decay",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
    },
    label: "Beam hits",
    tier: "advanced",
  }),
  wipe: logoEffectField.group({
    fields: {
      startMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 6_000, minimum: 0, step: 25 },
        label: "Final wipe start",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      particleDurationMs: logoEffectField.number({
        constraint: { minimum: 1 },
        editor: { maximum: 3_000, minimum: 1, step: 25 },
        label: "Particle sweep duration",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      cellSpreadMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 3_000, minimum: 0, step: 25 },
        label: "Cell wipe spread",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      cellDurationMs: logoEffectField.number({
        constraint: { minimum: 1 },
        editor: { maximum: 2_000, minimum: 1, step: 10 },
        label: "Cell wipe duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
    },
    label: "Final wipe",
    tier: "identity",
  }),
  beams: logoEffectField.group({
    fields: {
      count: logoEffectField.number({
        constraint: { integer: true, maximum: 6, minimum: 1 },
        editor: { maximum: 6, minimum: 1, step: 1 },
        label: "Beam groups",
        tier: "identity",
        update: "live",
      }),
      width: logoEffectField.number({
        constraint: { maximum: 2.4, minimum: 0.6 },
        editor: { maximum: 2.4, minimum: 0.6, step: 0.05 },
        label: "Beam width",
        tier: "identity",
        unit: "multiplier",
        update: "live",
      }),
    },
    label: "Beams",
    tier: "identity",
  }),
  trails: logoEffectField.group({
    fields: {
      wipeLength: logoEffectField.number({
        constraint: { integer: true, maximum: 14, minimum: 1 },
        editor: { maximum: 14, minimum: 1, step: 1 },
        label: "Wipe trail length",
        tier: "identity",
        unit: "glyphs",
        update: "live",
      }),
      wipeSpacing: logoEffectField.number({
        constraint: { maximum: 4, minimum: 0.1 },
        editor: { maximum: 4, minimum: 0.1, step: 0.05 },
        label: "Wipe trail spacing",
        tier: "advanced",
        unit: "columns",
        update: "live",
      }),
      rowLength: logoEffectField.number({
        constraint: { integer: true, maximum: 15, minimum: 1 },
        editor: { maximum: 15, minimum: 1, step: 1 },
        label: "Row trail length",
        tier: "identity",
        unit: "glyphs",
        update: "live",
      }),
      rowSpacing: logoEffectField.number({
        constraint: { maximum: 4, minimum: 0.1 },
        editor: { maximum: 4, minimum: 0.1, step: 0.05 },
        label: "Row trail spacing",
        tier: "advanced",
        unit: "columns",
        update: "live",
      }),
      columnLength: logoEffectField.number({
        constraint: { integer: true, maximum: 8, minimum: 1 },
        editor: { maximum: 8, minimum: 1, step: 1 },
        label: "Column trail length",
        tier: "identity",
        unit: "glyphs",
        update: "live",
      }),
      columnSpacing: logoEffectField.number({
        constraint: { maximum: 3, minimum: 0.1 },
        editor: { maximum: 3, minimum: 0.1, step: 0.05 },
        label: "Column trail spacing",
        tier: "advanced",
        unit: "rows",
        update: "live",
      }),
    },
    label: "Trails",
    tier: "identity",
  }),
  glyphs: logoEffectField.group({
    fields: {
      head: logoEffectField.symbol({
        label: "Beam head",
        tier: "identity",
        update: "live",
      }),
      row: logoEffectField.symbol({
        label: "Row trail",
        tier: "identity",
        update: "live",
      }),
      column: logoEffectField.symbol({
        label: "Column trail",
        tier: "identity",
        update: "live",
      }),
      wipe: logoEffectField.symbol({
        label: "Wipe trail",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Glyphs",
    tier: "identity",
  }),
  idle: logoEffectField.group({
    fields: {
      cycleMs: logoEffectField.number({
        constraint: { minimum: 1 },
        editor: { maximum: 20_000, minimum: 1, step: 50 },
        label: "Scan cycle",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      width: logoEffectField.number({
        constraint: { maximum: 24, minimum: 0.1 },
        editor: { maximum: 24, minimum: 0.1, step: 0.1 },
        label: "Scan width",
        tier: "identity",
        unit: "columns",
        update: "live",
      }),
    },
    label: "Idle",
    tier: "identity",
  }),
  pointer: logoEffectField.group({
    fields: {
      enabled: logoEffectField.boolean({
        label: "Enabled",
        tier: "interaction",
        update: "live",
      }),
      radius: logoEffectField.number({
        constraint: { maximum: 24, minimum: 2 },
        editor: { maximum: 24, minimum: 2, step: 0.5 },
        label: "Radius",
        tier: "interaction",
        unit: "cells",
        update: "live",
      }),
      rate: logoEffectField.number({
        constraint: { maximum: 30, minimum: 1 },
        editor: { maximum: 30, minimum: 1, step: 1 },
        label: "Pulse rate",
        tier: "interaction",
        unit: "cycles per second",
        update: "live",
      }),
      strength: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Strength",
        tier: "interaction",
        update: "live",
      }),
      crosshairColumnStep: logoEffectField.number({
        constraint: { integer: true, maximum: 12, minimum: 2 },
        editor: { maximum: 12, minimum: 2, step: 1 },
        label: "Crosshair column step",
        tier: "advanced",
        unit: "columns",
        update: "live",
      }),
    },
    label: "Pointer",
    tier: "interaction",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

type BeamHit = {
  at: number;
  direction: "column" | "row";
};

function firstBeamHit(cell: LogoCell, seed: number, values: Values): BeamHit {
  let first: BeamHit = { at: Number.POSITIVE_INFINITY, direction: "row" };

  for (let beam = 0; beam < values.beams.count; beam += 1) {
    const rowDirection = hashUnit(seed, cell.row * 101 + beam * 17) > 0.5 ? 1 : -1;
    const rowPosition = rowDirection > 0 ? cell.column / COLUMNS : 1 - cell.column / COLUMNS;
    const rowAt =
      values.hit.rowStartMs +
      beam * values.hit.rowBeamStaggerMs +
      hashUnit(seed, cell.row * 193 + beam * 31) * values.hit.rowJitterMs +
      rowPosition *
        (values.hit.rowTravelMs[0] +
          hashUnit(seed, cell.row * 43 + beam * 71) *
            (values.hit.rowTravelMs[1] - values.hit.rowTravelMs[0]));
    if (rowAt < first.at) first = { at: rowAt, direction: "row" };

    const columnDirection = hashUnit(seed, cell.column * 59 + beam * 23) > 0.5 ? 1 : -1;
    const columnPosition = columnDirection > 0 ? cell.row / ROWS : 1 - cell.row / ROWS;
    const columnAt =
      values.hit.columnStartMs +
      beam * values.hit.columnBeamStaggerMs +
      hashUnit(seed, cell.column * 131 + beam * 47) * values.hit.columnJitterMs +
      columnPosition *
        (values.hit.columnTravelMs[0] +
          hashUnit(seed, cell.column * 79 + beam * 53) *
            (values.hit.columnTravelMs[1] - values.hit.columnTravelMs[0]));
    if (columnAt < first.at) first = { at: columnAt, direction: "column" };
  }

  return first;
}

function createRuntime({ cells, palette, seed }: LogoEffectContext, values: Values) {
  // oxlint-disable-next-line eslint/complexity -- Row, column, and wipe particles share one source-faithful timing pass whose ordering is significant.
  const movingBeams = (frame: LogoEffectFrame, current: Values) => {
    const particles: GlyphParticle[] = [];
    const isIdle = frame.revealMs >= current.timing.durationMs;
    if (isIdle && frame.idleMs <= 0) return particles;
    const elapsedMs = isIdle ? frame.idleMs : frame.revealMs;

    if (!isIdle && elapsedMs >= current.wipe.startMs) {
      const wipe = clamp((elapsedMs - current.wipe.startMs) / current.wipe.particleDurationMs);
      const diagonal = wipe * (COLUMNS + ROWS * 2.4);
      const wipeLength = current.trails.wipeLength;
      for (let row = 0; row < ROWS; row += 1) {
        const head = diagonal - row * 2.4;
        for (let trail = 0; trail < wipeLength; trail += 1) {
          const column = head - trail * current.trails.wipeSpacing;
          if (column < -1 || column > COLUMNS) continue;
          particles.push({
            alpha: (1 - trail / wipeLength) * 0.78,
            channel: "line",
            color: mixColor(palette.bright, palette.final, trail / wipeLength),
            column,
            glow: 0.72 * (1 - trail / wipeLength),
            glyph: trail < 2 ? current.glyphs.head : current.glyphs.wipe,
            row,
            scale: current.beams.width,
          });
        }
      }
    } else {
      const rowCycleMs = current.timing.rowCycleMs;
      const rowLength = current.trails.rowLength;
      const columnCycleMs = current.timing.columnCycleMs;
      const columnLength = current.trails.columnLength;
      for (let beam = 0; beam < current.beams.count; beam += 1) {
        const rowClock = elapsedMs + (beam / current.beams.count) * rowCycleMs;
        const rowCycle = Math.floor(rowClock / rowCycleMs);
        const rowProgress = positiveModulo(rowClock, rowCycleMs) / rowCycleMs;
        const row = Math.floor(hashUnit(seed, beam * 113 + rowCycle * 191 + 7) * ROWS);
        const rowDirection = hashUnit(seed, beam * 127 + rowCycle * 211 + 19) > 0.5 ? 1 : -1;
        const rowHead = (rowDirection > 0 ? rowProgress : 1 - rowProgress) * COLUMNS;
        for (let trail = 0; trail < rowLength; trail += 1) {
          const column = rowHead - rowDirection * trail * current.trails.rowSpacing;
          if (column < -1 || column > COLUMNS) continue;
          particles.push({
            alpha: (1 - trail / rowLength) * 0.88,
            channel: "line",
            color: mixColor(palette.bright, palette.ciphertext[2], trail / rowLength),
            column,
            glow: 0.7 * (1 - trail / rowLength),
            glyph: trail < 2 ? current.glyphs.head : current.glyphs.row,
            row,
            scale: current.beams.width * (trail < 2 ? 1.08 : 0.9),
          });
        }

        const columnClock = elapsedMs + (beam / current.beams.count) * columnCycleMs;
        const columnCycle = Math.floor(columnClock / columnCycleMs);
        const columnProgress = positiveModulo(columnClock, columnCycleMs) / columnCycleMs;
        const column = Math.floor(hashUnit(seed, beam * 157 + columnCycle * 223 + 43) * COLUMNS);
        const columnDirection = hashUnit(seed, beam * 167 + columnCycle * 227 + 59) > 0.5 ? 1 : -1;
        const columnHead = (columnDirection > 0 ? columnProgress : 1 - columnProgress) * ROWS;
        for (let trail = 0; trail < columnLength; trail += 1) {
          const rowPosition = columnHead - columnDirection * trail * current.trails.columnSpacing;
          if (rowPosition < -1 || rowPosition > ROWS) continue;
          particles.push({
            alpha: (1 - trail / columnLength) * 0.82,
            channel: "line",
            color: mixColor(palette.bright, palette.final, trail / columnLength),
            column,
            glow: 0.65 * (1 - trail / columnLength),
            glyph: trail < 2 ? current.glyphs.head : current.glyphs.column,
            row: rowPosition,
            scale: current.beams.width * (trail < 2 ? 1.04 : 0.88),
          });
        }
      }
    }

    if (current.pointer.enabled && frame.pointer) {
      for (let row = 0; row < ROWS; row += 1) {
        particles.push({
          alpha: 0.08 + current.pointer.strength * 0.22,
          channel: "line",
          color: palette.bright,
          column: frame.pointer.column,
          glow: current.pointer.strength * 0.35,
          glyph: current.glyphs.column,
          row,
          scale: current.beams.width * 0.8,
        });
      }
      for (let column = 0; column < COLUMNS; column += current.pointer.crosshairColumnStep) {
        particles.push({
          alpha: 0.07 + current.pointer.strength * 0.18,
          channel: "line",
          color: palette.bright,
          column,
          glow: current.pointer.strength * 0.3,
          glyph: current.glyphs.row,
          row: frame.pointer.row,
          scale: current.beams.width * 0.8,
        });
      }
    }

    return particles;
  };

  return createSampledLogoEffectRuntime(cells, values, {
    usesIdle: true,
    extraInstanceCapacity: 192,
    particles: movingBeams,
    pointerEnabled: (current) => current.pointer.enabled,
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const hit = firstBeamHit(cell, seed, current);
      if (frame.revealMs < hit.at) return null;

      const beamAge = frame.revealMs - hit.at;
      const fadedColor = mixColor(
        palette.final,
        palette.muted,
        0.5 + hashUnit(seed, cell.index * 83 + 5) * 0.18
      );
      if (beamAge < current.hit.flashDurationMs) {
        return {
          color: mixColor(
            palette.bright,
            palette.ciphertext[2],
            beamAge / current.hit.colorTransitionMs
          ),
          glow: 1 - beamAge / current.hit.glowDecayMs,
          glyph: hit.direction === "row" ? current.glyphs.row : current.glyphs.column,
          scale: current.beams.width,
        };
      }

      const wipeAt =
        current.wipe.startMs +
        ((cell.column + cell.row * 2.4) / (COLUMNS + ROWS * 2.4)) * current.wipe.cellSpreadMs;
      const wipe = clamp((frame.revealMs - wipeAt) / current.wipe.cellDurationMs);
      const baseColor = mixColor(
        palette.final,
        palette.ciphertext[cell.row % palette.ciphertext.length],
        0.1 + (cell.row / (ROWS - 1)) * 0.17
      );
      if (wipe < 1) {
        return {
          alpha: 0.72 + wipe * 0.28,
          color: mixColor(fadedColor, baseColor, wipe),
          glow: Math.sin(wipe * Math.PI) * 0.78,
          glyph: cell.glyph,
        };
      }

      const proximity = current.pointer.enabled
        ? pointerProximity(cell, frame, current.pointer.radius)
        : 0;
      const idlePosition = positiveModulo((frame.idleMs / current.idle.cycleMs) * COLUMNS, COLUMNS);
      const idleDistance = Math.abs(cell.column - idlePosition);
      const idleGlow = clamp(1 - idleDistance / current.idle.width);
      const pointerPulse =
        proximity *
        current.pointer.strength *
        (0.72 +
          Math.sin(
            ((frame.revealMs + frame.interactionMs) / 1000) * current.pointer.rate * Math.PI
          ) *
            0.28);
      return {
        color: mixColor(baseColor, palette.bright, Math.max(idleGlow * 0.32, pointerPulse * 0.62)),
        glow: idleGlow * 0.3 + pointerPulse * 0.7,
        glyph: cell.glyph,
        scale: 1 + pointerPulse * 0.06,
      };
    },
    usesPointer: true,
  });
}

export const logoEffect = defineLogoEffect({
  createRuntime,
  defaults: {
    playback: DEFAULT_LOGO_EFFECT_PLAYBACK,
    presentation: DEFAULT_LOGO_EFFECT_PRESENTATION,
    values: {
      beams: { count: 3, width: 1.15 },
      glyphs: { column: "|", head: "█", row: "-", wipe: "/" },
      hit: {
        colorTransitionMs: 260,
        columnBeamStaggerMs: 145,
        columnJitterMs: 680,
        columnStartMs: 320,
        columnTravelMs: [430, 690],
        flashDurationMs: 190,
        glowDecayMs: 230,
        rowBeamStaggerMs: 125,
        rowJitterMs: 520,
        rowStartMs: 100,
        rowTravelMs: [780, 1_120],
      },
      idle: { cycleMs: 4_700, width: 8 },
      pointer: {
        crosshairColumnStep: 2,
        enabled: true,
        radius: 10,
        rate: 14,
        strength: 0.7,
      },
      timing: { columnCycleMs: 760, durationMs: 3_600, rowCycleMs: 1_120 },
      trails: {
        columnLength: 8,
        columnSpacing: 0.72,
        rowLength: 13,
        rowSpacing: 1.35,
        wipeLength: 9,
        wipeSpacing: 1.15,
      },
      wipe: {
        cellDurationMs: 420,
        cellSpreadMs: 720,
        particleDurationMs: 900,
        startMs: 2_320,
      },
    },
  },
  id: "beams",
  label: "Beams",
  schema,
  source: createTtfxSourceReference("beams", "src/effects/beams.rs"),
});
