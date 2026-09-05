import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { easeInOutQuad } from "@/lib/effects/logo/runtime/easing";
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
import { clamp, hashUnit } from "@/lib/effects/logo/runtime/math";
import { interpolate } from "@/lib/effects/logo/runtime/path";
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
        editor: { maximum: 10_000, minimum: 500, step: 50 },
        label: "Base duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      perPairDurationMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 200, minimum: 0, step: 1 },
        label: "Time per pair",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      initialDelayMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 1_000, minimum: 0, step: 10 },
        label: "Initial delay",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      sequenceFraction: logoEffectField.number({
        constraint: { maximum: 0.8, minimum: 0 },
        editor: { maximum: 0.8, minimum: 0, step: 0.01 },
        label: "Pair sequence spread",
        tier: "identity",
        update: "live",
      }),
      blinkFraction: logoEffectField.number({
        constraint: { maximum: 0.5, minimum: 0.01 },
        editor: { maximum: 0.5, minimum: 0.01, step: 0.01 },
        label: "Block wipe time",
        tier: "identity",
        update: "live",
      }),
      moveFraction: logoEffectField.number({
        constraint: { maximum: 0.7, minimum: 0.01 },
        editor: { maximum: 0.7, minimum: 0.01, step: 0.01 },
        label: "Correction move time",
        tier: "identity",
        update: "live",
      }),
      blinkIntervalMs: logoEffectField.number({
        constraint: { minimum: 10 },
        editor: { maximum: 500, minimum: 10, step: 10 },
        label: "Pre-correction blink",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      blinkCycleSteps: logoEffectField.number({
        constraint: { integer: true, maximum: 16, minimum: 1 },
        editor: { maximum: 16, minimum: 1, step: 1 },
        label: "Blink cycle steps",
        tier: "advanced",
        update: "live",
      }),
      colorTransitionMoveFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Color transition delay",
        tier: "advanced",
        update: "live",
      }),
      colorTransitionFraction: logoEffectField.number({
        constraint: { maximum: 0.5, minimum: 0.01 },
        editor: { maximum: 0.5, minimum: 0.01, step: 0.01 },
        label: "Color transition time",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  pairs: logoEffectField.group({
    fields: {
      maximumPairFraction: logoEffectField.number({
        constraint: { maximum: 0.5, minimum: 0.01 },
        editor: { maximum: 0.5, minimum: 0.01, step: 0.01 },
        label: "Maximum pair share",
        tier: "advanced",
        update: "rebuild",
      }),
      activePairFraction: logoEffectField.number({
        constraint: { maximum: 0.5, minimum: 0.01 },
        editor: { maximum: 0.5, minimum: 0.01, step: 0.01 },
        label: "Active pair share",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Correction pairs",
    tier: "identity",
  }),
  glyphs: logoEffectField.group({
    fields: {
      wipeSymbols: logoEffectField.symbols({
        constraint: { maximumItems: 32, minimumItems: 1 },
        label: "Block wipe symbols",
        tier: "identity",
        update: "live",
      }),
      preCorrectionSymbol: logoEffectField.symbol({
        label: "Pre-correction symbol",
        tier: "advanced",
        update: "live",
      }),
      movingSymbol: logoEffectField.symbol({
        label: "Moving symbol",
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
      primaryBlinkGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Primary blink glow",
        tier: "advanced",
        update: "live",
      }),
      secondaryBlinkGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Secondary blink glow",
        tier: "advanced",
        update: "live",
      }),
      wipeGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Block wipe glow",
        tier: "advanced",
        update: "live",
      }),
      correctionGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Correction glow",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

function createRuntime({ cells, palette, seed }: LogoEffectContext, values: Values) {
  const bounds = getLogoBounds(cells);
  const shuffled = cells
    .map((cell) => cell.index)
    .toSorted((left, right) => hashUnit(seed, left * 157 + 11) - hashUnit(seed, right * 157 + 11));
  const pairIndexByCell = new Int32Array(cells.length).fill(-1);
  const partnerByCell = new Int32Array(cells.length).fill(-1);
  const maximumPairCount = Math.min(
    Math.floor(cells.length / 2),
    Math.ceil(cells.length * values.pairs.maximumPairFraction)
  );

  for (let pairIndex = 0; pairIndex < maximumPairCount; pairIndex += 1) {
    const left = shuffled[pairIndex * 2];
    const right = shuffled[pairIndex * 2 + 1];
    pairIndexByCell[left] = pairIndex;
    pairIndexByCell[right] = pairIndex;
    partnerByCell[left] = right;
    partnerByCell[right] = left;
  }

  const activePairCount = (current: Values) =>
    Math.max(
      1,
      Math.min(maximumPairCount, Math.round(cells.length * current.pairs.activePairFraction))
    );
  const durationFor = (current: Values) =>
    current.timing.baseDurationMs + activePairCount(current) * current.timing.perPairDurationMs;

  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: durationFor,
    sample(cell, frame, current) {
      const baseColor = logoCellColor(cell, palette, bounds.rows);
      const pairIndex = pairIndexByCell[cell.index];
      const pairCount = activePairCount(current);
      if (pairIndex < 0 || pairIndex >= pairCount) {
        return { color: baseColor, glyph: cell.glyph };
      }

      const duration = durationFor(current);
      const correctionStart =
        current.timing.initialDelayMs +
        (pairIndex / Math.max(1, pairCount - 1)) * duration * current.timing.sequenceFraction;
      const blinkDuration = duration * current.timing.blinkFraction;
      const moveDuration = duration * current.timing.moveFraction;
      const age = frame.revealMs - correctionStart;
      const partner = cells[partnerByCell[cell.index]];

      if (age < 0) {
        const blink =
          Math.floor(frame.revealMs / current.timing.blinkIntervalMs) %
          current.timing.blinkCycleSteps;
        return {
          color: blink === 0 ? palette.bright : palette.laser[1],
          glow:
            current.appearance.intensity *
            (blink === 0
              ? current.appearance.primaryBlinkGlow
              : current.appearance.secondaryBlinkGlow),
          glyph: blink === 0 ? current.glyphs.preCorrectionSymbol : cell.glyph,
          offsetX: partner.column - cell.column,
          offsetY: partner.row - cell.row,
        };
      }

      if (age < blinkDuration) {
        const blockIndex = Math.min(
          current.glyphs.wipeSymbols.length - 1,
          Math.floor((age / blinkDuration) * current.glyphs.wipeSymbols.length)
        );
        return {
          color: palette.laser[1],
          glow: current.appearance.intensity * current.appearance.wipeGlow,
          glyph: current.glyphs.wipeSymbols[blockIndex],
          offsetX: partner.column - cell.column,
          offsetY: partner.row - cell.row,
        };
      }

      const moveProgress = easeInOutQuad(clamp((age - blinkDuration) / moveDuration));
      const corrected = age >= blinkDuration + moveDuration;
      const colorProgress = clamp(
        (age - blinkDuration - moveDuration * current.timing.colorTransitionMoveFraction) /
          (duration * current.timing.colorTransitionFraction)
      );
      return {
        color: mixColor(palette.ciphertext[0], baseColor, colorProgress),
        glow:
          (1 - colorProgress) * current.appearance.intensity * current.appearance.correctionGlow,
        glyph: corrected ? cell.glyph : current.glyphs.movingSymbol,
        offsetX: interpolate(partner.column, cell.column, moveProgress) - cell.column,
        offsetY: interpolate(partner.row, cell.row, moveProgress) - cell.row,
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
        correctionGlow: 0.55,
        intensity: 0.75,
        primaryBlinkGlow: 0.8,
        secondaryBlinkGlow: 0.35,
        wipeGlow: 0.9,
      },
      glyphs: {
        movingSymbol: "█",
        preCorrectionSymbol: "▓",
        wipeSymbols: ["▁", "▃", "▅", "▇", "█", "▇", "▅", "▃", "▁"],
      },
      pairs: { activePairFraction: 0.112, maximumPairFraction: 0.16 },
      timing: {
        baseDurationMs: 2_100,
        blinkCycleSteps: 4,
        blinkFraction: 0.12,
        blinkIntervalMs: 70,
        colorTransitionFraction: 0.16,
        colorTransitionMoveFraction: 0.7,
        initialDelayMs: 180,
        moveFraction: 0.22,
        perPairDurationMs: 28,
        sequenceFraction: 0.48,
      },
    },
  },
  id: "errorcorrect",
  label: "Error Correct",
  schema,
  source: createTtfxSourceReference("errorcorrect", "src/effects/errorcorrect.rs"),
});
