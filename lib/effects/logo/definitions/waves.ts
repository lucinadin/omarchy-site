import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import {
  OMARCHY_MARK_COLUMNS as COLUMNS,
  OMARCHY_MARK_ROWS as ROWS,
} from "@/lib/effects/logo/mark";
import {
  createLivePaletteColorStops,
  logoCellColor,
  mixColor,
  sampleColorStops,
} from "@/lib/effects/logo/runtime/color";
import { easeInOutSine } from "@/lib/effects/logo/runtime/easing";
import { clamp } from "@/lib/effects/logo/runtime/math";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  logoEffectField,
  type LogoEffectRuntimeValues,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { LogoEffectContext } from "@/lib/effects/logo/types";

const schema = defineLogoEffectSchema({
  timing: logoEffectField.group({
    fields: {
      initialDelayMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 2_000, minimum: 0, step: 10 },
        label: "Initial delay",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      travelDurationMs: logoEffectField.number({
        constraint: { minimum: 100 },
        editor: { maximum: 5_000, minimum: 100, step: 50 },
        label: "Wave travel",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      glyphFrameMs: logoEffectField.number({
        constraint: { minimum: 5 },
        editor: { maximum: 250, minimum: 5, step: 1 },
        label: "Glyph frame",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      settleFrames: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 64, minimum: 1, step: 1 },
        label: "Settle frames",
        tier: "advanced",
        update: "live",
      }),
      endHoldMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 5_000, minimum: 0, step: 50 },
        label: "End hold",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  motion: logoEffectField.group({
    fields: {
      waveCount: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 12, minimum: 1, step: 1 },
        label: "Wave count",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Motion",
    tier: "identity",
  }),
  glyphs: logoEffectField.group({
    fields: {
      wave: logoEffectField.symbols({
        constraint: { maximumItems: 32, minimumItems: 1 },
        label: "Wave symbols",
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
      baseScale: logoEffectField.number({
        constraint: { minimum: 0.25 },
        editor: { maximum: 2, minimum: 0.25, step: 0.01 },
        label: "Base scale",
        tier: "identity",
        update: "live",
      }),
      pulseScale: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Pulse scale",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

function revealDurationMs(values: Values) {
  return (
    values.timing.initialDelayMs +
    values.timing.travelDurationMs +
    (values.glyphs.wave.length * values.motion.waveCount + values.timing.settleFrames) *
      values.timing.glyphFrameMs +
    values.timing.endHoldMs
  );
}

function createRuntime({ cells, palette }: LogoEffectContext, values: Values) {
  const getWaveColors = createLivePaletteColorStops(palette, (stops, currentPalette) => {
    stops[0] = currentPalette.laser[0];
    stops[1] = currentPalette.laser[1];
    stops[2] = currentPalette.ciphertext[2];
    stops[3] = currentPalette.laser[1];
    stops[4] = currentPalette.laser[0];
  });

  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs,
    sample(cell, frame, current) {
      const columnProgress = cell.column / (COLUMNS - 1);
      const activationAt =
        current.timing.initialDelayMs +
        easeInOutSine(columnProgress) * current.timing.travelDurationMs;
      const age = frame.revealMs - activationAt;
      if (age < 0) return null;

      const frameMs = current.timing.glyphFrameMs;
      const waveFrame = Math.floor(age / frameMs);
      const totalFrames = current.glyphs.wave.length * current.motion.waveCount;
      const baseColor = logoCellColor(cell, palette, ROWS);
      if (waveFrame < totalFrames) {
        const glyphIndex = waveFrame % current.glyphs.wave.length;
        const waveProgress =
          current.glyphs.wave.length === 1 ? 1 : glyphIndex / (current.glyphs.wave.length - 1);
        return {
          color: sampleColorStops(getWaveColors(), waveProgress),
          glow: Math.sin(waveProgress * Math.PI) * current.appearance.intensity * 0.72,
          glyph: current.glyphs.wave[glyphIndex],
          scale:
            current.appearance.baseScale +
            Math.sin(waveProgress * Math.PI) * current.appearance.pulseScale,
        };
      }

      const settle = clamp((waveFrame - totalFrames) / current.timing.settleFrames);
      return {
        color: mixColor(palette.laser[0], baseColor, settle),
        glow: (1 - settle) * current.appearance.intensity * 0.35,
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
      appearance: { baseScale: 0.9, intensity: 0.75, pulseScale: 0.14 },
      glyphs: {
        wave: ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃", "▂", "▁"],
      },
      motion: { waveCount: 4 },
      timing: {
        endHoldMs: 1_100,
        glyphFrameMs: 40.5,
        initialDelayMs: 100,
        settleFrames: 8,
        travelDurationMs: 1_250,
      },
    },
  },
  id: "waves",
  label: "Waves",
  schema,
  source: createTtfxSourceReference("waves", "src/effects/waves.rs"),
});
