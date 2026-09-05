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
import { easeOutCubic } from "@/lib/effects/logo/runtime/easing";
import { pointerProximity } from "@/lib/effects/logo/runtime/grid";
import { clamp, hashUnit, positiveModulo } from "@/lib/effects/logo/runtime/math";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  type LogoEffectRuntimeValues,
  logoEffectField,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { GlyphParticle, LogoEffectContext, LogoEffectFrame } from "@/lib/effects/logo/types";

const GENERATION_GLYPHS = ["░", "▒", "▓"] as const;

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
      gridExpandMs: logoEffectField.number({
        constraint: { minimum: 1 },
        editor: { maximum: 4_000, minimum: 1, step: 25 },
        label: "Grid expansion",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      generationStartMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 4_000, minimum: 0, step: 25 },
        label: "Generation start",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      generationSpreadMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 3_000, minimum: 0, step: 25 },
        label: "Generation spread",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      generationDurationMs: logoEffectField.range({
        constraint: { minimum: 1 },
        editor: { maximum: 3_000, minimum: 1, step: 25 },
        label: "Generation duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      generationGlyphFrameMs: logoEffectField.number({
        constraint: { minimum: 1 },
        editor: { maximum: 250, minimum: 1, step: 1 },
        label: "Generation glyph interval",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      gridCollapseStartMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 6_000, minimum: 0, step: 25 },
        label: "Grid collapse start",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      gridCollapseEndMs: logoEffectField.number({
        constraint: { minimum: 1 },
        editor: { maximum: 8_000, minimum: 1, step: 25 },
        label: "Grid collapse end",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  grid: logoEffectField.group({
    fields: {
      spacing: logoEffectField.number({
        constraint: { integer: true, maximum: 18, minimum: 6 },
        editor: { maximum: 18, minimum: 6, step: 1 },
        label: "Column spacing",
        tier: "identity",
        unit: "columns",
        update: "live",
      }),
      horizontalStep: logoEffectField.number({
        constraint: { integer: true, maximum: 12, minimum: 1 },
        editor: { maximum: 12, minimum: 1, step: 1 },
        label: "Horizontal line step",
        tier: "advanced",
        unit: "columns",
        update: "live",
      }),
      idleHorizontalStep: logoEffectField.number({
        constraint: { integer: true, maximum: 12, minimum: 1 },
        editor: { maximum: 12, minimum: 1, step: 1 },
        label: "Idle horizontal step",
        tier: "advanced",
        unit: "columns",
        update: "live",
      }),
      verticalGlyph: logoEffectField.symbol({
        label: "Vertical glyph",
        tier: "identity",
        update: "live",
      }),
      horizontalGlyph: logoEffectField.symbol({
        label: "Horizontal glyph",
        tier: "identity",
        update: "live",
      }),
      intersectionGlyph: logoEffectField.symbol({
        label: "Intersection glyph",
        tier: "identity",
        update: "live",
      }),
      generationGlyphs: logoEffectField.symbols({
        constraint: { maximumItems: 32, minimumItems: 1 },
        label: "Generation glyphs",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Grid",
    tier: "identity",
  }),
  idle: logoEffectField.group({
    fields: {
      pulseRate: logoEffectField.number({
        constraint: { maximum: 3, minimum: 0.1 },
        editor: { maximum: 3, minimum: 0.1, step: 0.05 },
        label: "Pulse rate",
        tier: "identity",
        unit: "cycles per second",
        update: "live",
      }),
      columnSpeed: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 80, minimum: 0, step: 0.5 },
        label: "Column scan speed",
        tier: "advanced",
        unit: "columns per cycle",
        update: "live",
      }),
      rowSpeed: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 20, minimum: 0, step: 0.1 },
        label: "Row scan speed",
        tier: "advanced",
        unit: "rows per cycle",
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
        label: "Change rate",
        tier: "interaction",
        unit: "frames per second",
        update: "live",
      }),
      strength: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Strength",
        tier: "interaction",
        update: "live",
      }),
      colorMix: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Color shift",
        tier: "interaction",
        update: "live",
      }),
    },
    label: "Pointer",
    tier: "interaction",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

function gridProgress(revealMs: number, values: Values) {
  if (revealMs < values.timing.gridExpandMs) {
    return easeOutCubic(clamp(revealMs / values.timing.gridExpandMs));
  }
  if (revealMs < values.timing.gridCollapseStartMs) return 1;
  return (
    1 -
    clamp(
      (revealMs - values.timing.gridCollapseStartMs) /
        (values.timing.gridCollapseEndMs - values.timing.gridCollapseStartMs)
    )
  );
}

function createRuntime({ cells, palette, seed }: LogoEffectContext, values: Values) {
  const makeGrid = (frame: LogoEffectFrame, current: Values) => {
    const particles = new Map<string, GlyphParticle>();
    const add = (particle: GlyphParticle) => {
      const key = `${particle.column.toFixed(2)}:${particle.row.toFixed(2)}`;
      const existing = particles.get(key);
      particles.set(
        key,
        existing
          ? {
              ...particle,
              alpha: Math.max(existing.alpha ?? 1, particle.alpha ?? 1),
              glyph: current.grid.intersectionGlyph,
              glow: Math.max(existing.glow ?? 0, particle.glow ?? 0),
            }
          : particle
      );
    };

    const spacing = current.grid.spacing;
    const rowSpacing = Math.max(2, Math.round(spacing / 3));
    const progress = gridProgress(frame.revealMs, current);
    const isRevealGrid = frame.revealMs < current.timing.gridCollapseEndMs && progress > 0;

    if (isRevealGrid) {
      const visibleRows = Math.ceil(ROWS * progress);
      const visibleColumns = Math.ceil(COLUMNS * progress);
      for (let column = 0; column < COLUMNS; column += spacing) {
        for (let row = 0; row < visibleRows; row += 1) {
          add({
            alpha: 0.58,
            channel: "line",
            color: mixColor(palette.ciphertext[2], palette.final, column / COLUMNS),
            column,
            glow: 0.18,
            glyph: current.grid.verticalGlyph,
            row,
          });
        }
      }
      for (let row = 0; row < ROWS; row += rowSpacing) {
        for (let column = 0; column < visibleColumns; column += current.grid.horizontalStep) {
          add({
            alpha: 0.58,
            channel: "line",
            color: mixColor(palette.final, palette.bright, row / ROWS),
            column,
            glow: 0.18,
            glyph: current.grid.horizontalGlyph,
            row,
          });
        }
      }
    } else if (frame.idleMs > 0) {
      const pulse = (frame.idleMs / 1000) * current.idle.pulseRate;
      const column = positiveModulo(pulse * current.idle.columnSpeed, COLUMNS);
      const row = positiveModulo(pulse * current.idle.rowSpeed, ROWS);
      for (let lineRow = 0; lineRow < ROWS; lineRow += 1) {
        add({
          alpha: 0.18,
          channel: "line",
          color: palette.ciphertext[2],
          column,
          glyph: current.grid.verticalGlyph,
          row: lineRow,
        });
      }
      for (
        let lineColumn = 0;
        lineColumn < COLUMNS;
        lineColumn += current.grid.idleHorizontalStep
      ) {
        add({
          alpha: 0.14,
          channel: "line",
          color: palette.final,
          column: lineColumn,
          glyph: current.grid.horizontalGlyph,
          row,
        });
      }
    }

    if (current.pointer.enabled && frame.pointer) {
      const pointerColumn = frame.pointer.column;
      const pointerRow = frame.pointer.row;
      const pointerAccent = current.pointer.colorMix * current.pointer.strength;
      const pointerColor = mixColor(palette.final, palette.bright, pointerAccent);
      for (let row = 0; row < ROWS; row += 1) {
        add({
          alpha: 0.06 + current.pointer.strength * 0.18,
          channel: "line",
          color: pointerColor,
          column: pointerColumn,
          glow: current.pointer.strength * 0.18,
          glyph: current.grid.verticalGlyph,
          row,
        });
      }
      for (let column = 0; column < COLUMNS; column += current.grid.idleHorizontalStep) {
        add({
          alpha: 0.05 + current.pointer.strength * 0.15,
          channel: "line",
          color: pointerColor,
          column,
          glow: current.pointer.strength * 0.16,
          glyph: current.grid.horizontalGlyph,
          row: pointerRow,
        });
      }
    }

    return [...particles.values()];
  };

  return createSampledLogoEffectRuntime(cells, values, {
    usesIdle: true,
    extraInstanceCapacity: 384,
    particles: makeGrid,
    pointerEnabled: (current) => current.pointer.enabled,
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const spacing = current.grid.spacing;
      const rowSpacing = Math.max(2, Math.round(spacing / 3));
      const blockColumn = Math.floor(cell.column / spacing);
      const blockRow = Math.floor(cell.row / rowSpacing);
      const blockId = blockRow * 17 + blockColumn;
      const generationAt =
        current.timing.generationStartMs +
        hashUnit(seed, blockId * 97 + 11) * current.timing.generationSpreadMs;
      if (frame.revealMs < generationAt) return null;

      const generationAge = frame.revealMs - generationAt;
      const generationDuration =
        current.timing.generationDurationMs[0] +
        hashUnit(seed, cell.index * 61 + 29) *
          (current.timing.generationDurationMs[1] - current.timing.generationDurationMs[0]);
      const baseColor = mixColor(
        palette.final,
        palette.ciphertext[2],
        0.15 + (cell.row / (ROWS - 1)) * 0.3
      );

      if (generationAge < generationDuration) {
        const generationFrame = Math.floor(generationAge / current.timing.generationGlyphFrameMs);
        const glyphIndex = Math.floor(
          hashUnit(seed + generationFrame * 149, cell.index * 83 + blockId) *
            current.grid.generationGlyphs.length
        );
        return {
          color: mixColor(
            palette.ciphertext[glyphIndex % palette.ciphertext.length],
            palette.bright,
            clamp(generationAge / generationDuration) * 0.35
          ),
          glow: 0.22,
          glyph: current.grid.generationGlyphs[glyphIndex],
        };
      }

      const proximity = current.pointer.enabled
        ? pointerProximity(cell, frame, current.pointer.radius)
        : 0;
      const pulse =
        0.5 +
        0.5 *
          Math.sin(
            (frame.idleMs / 1000) * current.idle.pulseRate * Math.PI * 2 -
              cell.column * 0.12 -
              cell.row * 0.34
          );
      const settledColor = mixColor(baseColor, palette.bright, pulse * 0.18);
      const settledGlow = pulse * 0.14;
      const pointerFrame = Math.floor(
        ((frame.revealMs + frame.interactionMs) / 1000) * current.pointer.rate
      );
      const pointerSwap =
        proximity > 0 &&
        hashUnit(seed + pointerFrame * 257, cell.index * 109 + 17) <
          proximity * current.pointer.strength;

      if (pointerSwap) {
        const glyphIndex = Math.floor(
          hashUnit(seed + pointerFrame * 311, cell.index * 179) *
            current.grid.generationGlyphs.length
        );
        const pointerAccent = proximity * current.pointer.strength * current.pointer.colorMix;
        return {
          color: mixColor(settledColor, palette.bright, pointerAccent),
          glow: settledGlow + (0.08 + proximity * 0.34) * current.pointer.strength * pointerAccent,
          glyph: current.grid.generationGlyphs[glyphIndex],
          scale: 1 + proximity * current.pointer.strength * 0.05,
        };
      }

      return {
        color: settledColor,
        glow: settledGlow,
        glyph: cell.glyph,
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
      grid: {
        generationGlyphs: GENERATION_GLYPHS,
        horizontalGlyph: "-",
        horizontalStep: 3,
        idleHorizontalStep: 2,
        intersectionGlyph: "+",
        spacing: 9,
        verticalGlyph: "|",
      },
      idle: { columnSpeed: 22, pulseRate: 0.8, rowSpeed: 2.7 },
      pointer: {
        colorMix: 0.2,
        enabled: true,
        radius: 10,
        rate: 14,
        strength: 0.7,
      },
      timing: {
        durationMs: 3_600,
        generationDurationMs: [720, 1_080],
        generationGlyphFrameMs: 54,
        generationSpreadMs: 650,
        generationStartMs: 760,
        gridCollapseEndMs: 3_380,
        gridCollapseStartMs: 2_640,
        gridExpandMs: 900,
      },
    },
  },
  id: "synthgrid",
  label: "Synthgrid",
  schema,
  source: createTtfxSourceReference("synthgrid", "src/effects/synthgrid.rs"),
});
