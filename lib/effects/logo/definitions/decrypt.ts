import {
  DEFAULT_LOGO_EFFECT_PLAYBACK,
  DEFAULT_LOGO_EFFECT_PRESENTATION,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { OMARCHY_MARK_COLUMNS as COLUMNS } from "@/lib/effects/logo/mark";
import { mixColor } from "@/lib/effects/logo/runtime/color";
import { pointerProximity } from "@/lib/effects/logo/runtime/grid";
import { clamp, hashUnit } from "@/lib/effects/logo/runtime/math";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  type LogoEffectRuntimeValues,
  logoEffectField,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { LogoEffectContext } from "@/lib/effects/logo/types";

const CIPHER_GLYPHS = Array.from("01<>[]{}#@$%&*+-=/\\|░▒▓");
const TYPING_GLYPHS = ["█", "▓", "▒", "░"] as const;

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
      typingStartMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 2_000, minimum: 0, step: 10 },
        label: "Typing start",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      typingCellStaggerMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 20, minimum: 0, step: 0.1 },
        label: "Typing cell stagger",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      typingJitterMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 1_000, minimum: 0, step: 10 },
        label: "Typing jitter",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      typingDurationMs: logoEffectField.number({
        constraint: { minimum: 1 },
        editor: { maximum: 1_000, minimum: 1, step: 10 },
        label: "Typing duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      resolveStartMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 5_000, minimum: 0, step: 10 },
        label: "Resolve start",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      resolveJitterMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 3_000, minimum: 0, step: 10 },
        label: "Resolve jitter",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      resolveColumnStaggerMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 2_000, minimum: 0, step: 10 },
        label: "Resolve column stagger",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      slowWindowMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 2_000, minimum: 0, step: 10 },
        label: "Slow decrypt window",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      discoveryMs: logoEffectField.number({
        constraint: { minimum: 1 },
        editor: { maximum: 2_000, minimum: 1, step: 10 },
        label: "Discovery duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  cipher: logoEffectField.group({
    fields: {
      glyphs: logoEffectField.symbols({
        constraint: { maximumItems: 128, minimumItems: 1 },
        label: "Cipher glyphs",
        tier: "identity",
        update: "live",
      }),
      typingGlyphs: logoEffectField.symbols({
        constraint: { maximumItems: 16, minimumItems: 1 },
        label: "Typing glyphs",
        tier: "identity",
        update: "live",
      }),
      revealRate: logoEffectField.number({
        constraint: { maximum: 40, minimum: 4 },
        editor: { maximum: 40, minimum: 4, step: 1 },
        label: "Reveal cipher rate",
        tier: "identity",
        unit: "frames per second",
        update: "live",
      }),
      slowRateMultiplier: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Slow rate",
        tier: "advanced",
        unit: "multiplier",
        update: "live",
      }),
    },
    label: "Cipher",
    tier: "identity",
  }),
  idle: logoEffectField.group({
    fields: {
      amount: logoEffectField.number({
        constraint: { integer: true, maximum: 48, minimum: 0 },
        editor: { maximum: 48, minimum: 0, step: 1 },
        label: "Idle characters",
        tier: "identity",
        update: "live",
      }),
      rate: logoEffectField.number({
        constraint: { maximum: 16, minimum: 0.5 },
        editor: { maximum: 16, minimum: 0.5, step: 0.5 },
        label: "Idle cipher rate",
        tier: "identity",
        unit: "frames per second",
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
        label: "Cipher rate",
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
    },
    label: "Pointer",
    tier: "interaction",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

function cipherGlyph(
  seed: number,
  cellIndex: number,
  cipherFrame: number,
  glyphs: Values["cipher"]["glyphs"]
) {
  const glyphIndex = Math.floor(
    hashUnit(seed + cipherFrame * 97, cellIndex * 43 + cipherFrame) * glyphs.length
  );
  return glyphs[glyphIndex];
}

function createRuntime({ cells, palette, seed }: LogoEffectContext, values: Values) {
  const cellCount = Math.max(1, cells.length);

  return createSampledLogoEffectRuntime(cells, values, {
    usesIdle: true,
    pointerEnabled: (current) => current.pointer.enabled,
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const elapsedMs = frame.revealMs;
      const typeAt =
        current.timing.typingStartMs +
        cell.index * current.timing.typingCellStaggerMs +
        hashUnit(seed, cell.index * 17) * current.timing.typingJitterMs;
      if (elapsedMs < typeAt) return null;

      const typingAge = elapsedMs - typeAt;
      const colorIndex = Math.floor(
        hashUnit(seed, cell.index * 13 + 5) * palette.ciphertext.length
      );
      if (typingAge < current.timing.typingDurationMs) {
        const blockIndex = Math.min(
          current.cipher.typingGlyphs.length - 1,
          Math.floor(
            (typingAge / current.timing.typingDurationMs) * current.cipher.typingGlyphs.length
          )
        );
        return {
          color: palette.ciphertext[(colorIndex + blockIndex) % palette.ciphertext.length],
          glow: clamp(1 - typingAge / 300) * 0.55,
          glyph: current.cipher.typingGlyphs[blockIndex],
        };
      }

      const resolveAt =
        current.timing.resolveStartMs +
        hashUnit(seed, cell.index * 31 + 7) * current.timing.resolveJitterMs +
        (cell.column / COLUMNS) * current.timing.resolveColumnStaggerMs;
      if (elapsedMs < resolveAt) {
        const isSlowDecrypt = elapsedMs > resolveAt - current.timing.slowWindowMs;
        const rate =
          current.cipher.revealRate * (isSlowDecrypt ? current.cipher.slowRateMultiplier : 1);
        const cipherFrame = Math.floor((elapsedMs / 1000) * rate);
        return {
          color: palette.ciphertext[colorIndex],
          glow: isSlowDecrypt ? 0.18 : 0.34,
          glyph: cipherGlyph(seed, cell.index, cipherFrame, current.cipher.glyphs),
        };
      }

      const baseColor = mixColor(
        palette.final,
        palette.ciphertext[cell.row % palette.ciphertext.length],
        0.12 + (cell.row / 9) * 0.18
      );
      const discovery = clamp((elapsedMs - resolveAt) / current.timing.discoveryMs);
      if (discovery < 1) {
        return {
          color: mixColor(palette.bright, baseColor, discovery),
          glow: 1 - discovery,
          glyph: cell.glyph,
          scale: 1 + (1 - discovery) * 0.08,
        };
      }

      const idleFrame = Math.floor((frame.idleMs / 1000) * current.idle.rate);
      const idleSwap =
        frame.idleMs > 0 &&
        hashUnit(seed + idleFrame * 193, cell.index * 107 + 11) < current.idle.amount / cellCount;
      const proximity = current.pointer.enabled
        ? pointerProximity(cell, frame, current.pointer.radius)
        : 0;
      const pointerFrame = Math.floor(
        ((frame.revealMs + frame.interactionMs) / 1000) * current.pointer.rate
      );
      const pointerSwap =
        proximity > 0 &&
        hashUnit(seed + pointerFrame * 229, cell.index * 137 + 23) <
          proximity * current.pointer.strength;

      if (!idleSwap && !pointerSwap) return { color: baseColor, glyph: cell.glyph };

      const mutationFrame = pointerSwap ? pointerFrame : idleFrame;
      return {
        color: mixColor(palette.ciphertext[colorIndex], palette.bright, proximity * 0.72),
        glow: 0.25 + proximity * 0.8,
        glyph: cipherGlyph(seed + 0x4445_4352, cell.index, mutationFrame, current.cipher.glyphs),
        scale: 1 + proximity * 0.08,
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
      cipher: {
        glyphs: CIPHER_GLYPHS,
        revealRate: 18,
        slowRateMultiplier: 0.32,
        typingGlyphs: TYPING_GLYPHS,
      },
      idle: { amount: 6, rate: 3 },
      pointer: { enabled: true, radius: 10, rate: 14, strength: 0.7 },
      timing: {
        discoveryMs: 380,
        durationMs: 3_600,
        resolveColumnStaggerMs: 260,
        resolveJitterMs: 1_020,
        resolveStartMs: 1_540,
        slowWindowMs: 520,
        typingCellStaggerMs: 2.2,
        typingDurationMs: 220,
        typingJitterMs: 150,
        typingStartMs: 70,
      },
    },
  },
  id: "decrypt",
  label: "Decrypt",
  schema,
  source: createTtfxSourceReference("decrypt", "src/effects/decrypt.rs"),
});
