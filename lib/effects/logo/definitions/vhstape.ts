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
import type {
  GlyphParticle,
  LogoCell,
  LogoEffectContext,
  LogoPalette,
} from "@/lib/effects/logo/types";

const SNOW_GLYPHS = ["#", "*", ".", ":"] as const;

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
      glitchEndFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Glitch end",
        tier: "identity",
        update: "live",
      }),
      staticEndFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Static end",
        tier: "identity",
        update: "live",
      }),
      redrawFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Redraw time",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  glitch: logoEffectField.group({
    fields: {
      waveCycles: logoEffectField.number({
        constraint: { minimum: 0.1 },
        editor: { maximum: 12, minimum: 0.1, step: 0.1 },
        label: "Wave cycles",
        tier: "identity",
        update: "live",
      }),
      waveWidthRows: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 8, minimum: 0, step: 0.25 },
        label: "Wave width",
        tier: "identity",
        update: "live",
      }),
      blockCount: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 240, minimum: 1, step: 1 },
        label: "Glitch blocks",
        tier: "advanced",
        update: "live",
      }),
      isolatedChance: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.001 },
        label: "Isolated glitch chance",
        tier: "identity",
        update: "live",
      }),
      waveOffsetColumns: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 32, minimum: 0, step: 0.25 },
        label: "Wave offset",
        tier: "identity",
        update: "live",
      }),
      waveCenterBoostColumns: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 32, minimum: 0, step: 0.25 },
        label: "Wave center boost",
        tier: "advanced",
        update: "live",
      }),
      isolatedOffsetColumns: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 32, minimum: 0, step: 0.25 },
        label: "Isolated offset",
        tier: "identity",
        update: "live",
      }),
      frameCount: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 1_200, minimum: 1, step: 1 },
        label: "Noise frames",
        tier: "advanced",
        update: "live",
      }),
      noiseChance: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.001 },
        label: "Snow chance",
        tier: "identity",
        update: "live",
      }),
      colorCycles: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 40, minimum: 0, step: 0.25 },
        label: "Color cycles",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Glitch",
    tier: "identity",
  }),
  ghosts: logoEffectField.group({
    fields: {
      alpha: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Ghost opacity",
        tier: "identity",
        update: "live",
      }),
      separationColumns: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 8, minimum: 0, step: 0.1 },
        label: "Color separation",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Ghosts",
    tier: "identity",
  }),
  redraw: logoEffectField.group({
    fields: {
      staticFrameCount: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 1_200, minimum: 1, step: 1 },
        label: "Static frames",
        tier: "advanced",
        update: "live",
      }),
      glyphFrameCount: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 1_200, minimum: 1, step: 1 },
        label: "Redraw glyph frames",
        tier: "advanced",
        update: "live",
      }),
      rowSpeed: logoEffectField.number({
        constraint: { minimum: 0.1 },
        editor: { maximum: 12, minimum: 0.1, step: 0.1 },
        label: "Row speed",
        tier: "identity",
        update: "live",
      }),
      blockGlyphThreshold: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Block glyph threshold",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Redraw",
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
      glitchGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Glitch glow",
        tier: "advanced",
        update: "live",
      }),
      staticGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Static glow",
        tier: "advanced",
        update: "live",
      }),
      redrawGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Redraw glow",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
  glyphs: logoEffectField.group({
    fields: {
      snowSymbols: logoEffectField.symbols({
        constraint: { maximumItems: 32, minimumItems: 1 },
        label: "Snow symbols",
        tier: "identity",
        update: "live",
      }),
      redrawBlockSymbol: logoEffectField.symbol({
        label: "Redraw block",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Glyphs",
    tier: "identity",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

function glitchOffset(
  row: number,
  progress: number,
  values: Values,
  seed: number,
  rowCount: number
) {
  const wave = Math.floor((1 - ((progress * values.glitch.waveCycles) % 1)) * rowCount);
  const waveActive = Math.abs(row - wave) <= values.glitch.waveWidthRows;
  const block = Math.floor(progress * values.glitch.blockCount);
  const isolated = hashUnit(seed, row * 461 + block * 17) < values.glitch.isolatedChance;
  if (!waveActive && !isolated) return 0;
  const direction = hashUnit(seed, row * 463 + block * 19) > 0.5 ? 1 : -1;
  const amount = waveActive
    ? values.glitch.waveOffsetColumns +
      (1 - Math.abs(row - wave)) * values.glitch.waveCenterBoostColumns
    : values.glitch.isolatedOffsetColumns;
  return direction * amount;
}

function glitchGhosts(
  cells: readonly LogoCell[],
  progress: number,
  values: Values,
  seed: number,
  rowCount: number,
  palette: LogoPalette
): GlyphParticle[] {
  if (progress >= values.timing.glitchEndFraction) return [];
  const particles: GlyphParticle[] = [];
  for (const cell of cells) {
    const offset = glitchOffset(cell.row, progress, values, seed, rowCount);
    if (offset === 0) continue;
    particles.push(
      {
        alpha: values.ghosts.alpha,
        channel: "copiedText",
        color: palette.laser[1],
        column: cell.column + offset - values.ghosts.separationColumns,
        glyph: cell.glyph,
        row: cell.row,
      },
      {
        alpha: values.ghosts.alpha,
        channel: "copiedText",
        color: palette.ciphertext[2],
        column: cell.column + offset + values.ghosts.separationColumns,
        glyph: cell.glyph,
        row: cell.row,
      }
    );
  }
  return particles;
}

function createRuntime({ cells, palette, seed }: LogoEffectContext, values: Values) {
  const bounds = getLogoBounds(cells);
  const getGlitchColors = createLivePaletteColorStops(palette, (stops, currentPalette) => {
    stops[0] = currentPalette.bright;
    stops[1] = currentPalette.laser[1];
    stops[2] = currentPalette.ciphertext[0];
    stops[3] = currentPalette.final;
    stops[4] = currentPalette.bright;
  });

  return createSampledLogoEffectRuntime(cells, values, {
    extraInstanceCapacity: cells.length * 2,
    particles(frame, current) {
      const duration = current.timing.durationMs;
      return glitchGhosts(
        cells,
        clamp(frame.revealMs / duration),
        current,
        seed,
        bounds.rows,
        palette
      );
    },
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const duration = current.timing.durationMs;
      const progress = clamp(frame.revealMs / duration);
      const baseColor = logoCellColor(cell, palette, bounds.rows);
      if (progress < current.timing.glitchEndFraction) {
        const offset = glitchOffset(cell.row, progress, current, seed, bounds.rows);
        const frameIndex = Math.floor(progress * current.glitch.frameCount);
        const noise = hashUnit(seed, cell.index * 467 + frameIndex) < current.glitch.noiseChance;
        return {
          color:
            offset === 0
              ? baseColor
              : sampleColorStops(getGlitchColors(), progress * current.glitch.colorCycles, true),
          glow: offset === 0 ? 0 : current.appearance.intensity * current.appearance.glitchGlow,
          glyph: noise
            ? current.glyphs.snowSymbols[
                (cell.index + frameIndex) % current.glyphs.snowSymbols.length
              ]
            : cell.glyph,
          offsetX: offset,
        };
      }
      if (progress < current.timing.staticEndFraction) {
        const noiseFrame = Math.floor(progress * current.redraw.staticFrameCount);
        return {
          color: mixColor(
            palette.muted,
            palette.bright,
            hashUnit(seed, cell.index * 479 + noiseFrame)
          ),
          glow: current.appearance.intensity * current.appearance.staticGlow,
          glyph:
            current.glyphs.snowSymbols[
              (cell.index + noiseFrame) % current.glyphs.snowSymbols.length
            ],
        };
      }

      const redraw = clamp(
        (progress - current.timing.staticEndFraction) / current.timing.redrawFraction
      );
      const rowThreshold = (bounds.maxRow - cell.row) / Math.max(1, bounds.maxRow);
      if (redraw < rowThreshold) {
        return {
          color: palette.muted,
          glyph:
            current.glyphs.snowSymbols[
              (cell.index + Math.floor(redraw * current.redraw.glyphFrameCount)) %
                current.glyphs.snowSymbols.length
            ],
        };
      }
      const rowAge = clamp((redraw - rowThreshold) * bounds.rows * current.redraw.rowSpeed);
      return {
        color: mixColor(palette.bright, baseColor, rowAge),
        glow: (1 - rowAge) * current.appearance.intensity * current.appearance.redrawGlow,
        glyph:
          rowAge < current.redraw.blockGlyphThreshold
            ? current.glyphs.redrawBlockSymbol
            : cell.glyph,
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
      appearance: { glitchGlow: 0.5, intensity: 0.75, redrawGlow: 0.65, staticGlow: 0.24 },
      ghosts: { alpha: 0.58, separationColumns: 0.8 },
      glitch: {
        blockCount: 62,
        colorCycles: 12,
        frameCount: 420,
        isolatedChance: 0.132,
        isolatedOffsetColumns: 12.4,
        noiseChance: 0.01,
        waveCenterBoostColumns: 6,
        waveCycles: 3.8,
        waveOffsetColumns: 8,
        waveWidthRows: 1,
      },
      glyphs: { redrawBlockSymbol: "█", snowSymbols: SNOW_GLYPHS },
      redraw: {
        blockGlyphThreshold: 0.4,
        glyphFrameCount: 100,
        rowSpeed: 3,
        staticFrameCount: 300,
      },
      timing: {
        durationMs: 5_480,
        glitchEndFraction: 0.72,
        redrawFraction: 0.16,
        staticEndFraction: 0.84,
      },
    },
  },
  id: "vhstape",
  label: "VHS Tape",
  schema,
  source: createTtfxSourceReference("vhstape", "src/effects/vhstape.rs"),
});
