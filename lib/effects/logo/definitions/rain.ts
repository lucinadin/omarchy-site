import {
  DEFAULT_LOGO_EFFECT_PLAYBACK,
  DEFAULT_LOGO_EFFECT_PRESENTATION,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { OMARCHY_MARK_ROWS as ROWS } from "@/lib/effects/logo/mark";
import { mixColor } from "@/lib/effects/logo/runtime/color";
import { easeOutCubic } from "@/lib/effects/logo/runtime/easing";
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
  LogoPoint,
} from "@/lib/effects/logo/types";

const RAIN_GLYPHS = [
  "0",
  "1",
  "|",
  "/",
  "\\",
  "░",
  "▒",
  "▓",
  "[",
  "]",
  "<",
  ">",
  "+",
  "*",
  "#",
  "@",
] as const;

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
      startDelayMs: logoEffectField.range({
        constraint: { minimum: 0 },
        editor: { maximum: 2_000, minimum: 0, step: 10 },
        label: "Start delay range",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      fallDurationMs: logoEffectField.range({
        constraint: { minimum: 1 },
        editor: { maximum: 4_000, minimum: 1, step: 10 },
        label: "Fall duration range",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      rowStaggerMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 1_000, minimum: 0, step: 10 },
        label: "Row stagger",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      revealGlyphFrameMs: logoEffectField.number({
        constraint: { minimum: 1 },
        editor: { maximum: 250, minimum: 1, step: 1 },
        label: "Reveal glyph interval",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      streamTravelMs: logoEffectField.range({
        constraint: { minimum: 1 },
        editor: { maximum: 8_000, minimum: 1, step: 50 },
        label: "Stream travel range",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      streamPauseMs: logoEffectField.range({
        constraint: { minimum: 0 },
        editor: { maximum: 5_000, minimum: 0, step: 50 },
        label: "Stream pause range",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      streamOffsetJitterMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 2_000, minimum: 0, step: 10 },
        label: "Stream offset jitter",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  streams: logoEffectField.group({
    fields: {
      count: logoEffectField.number({
        constraint: { integer: true, maximum: 5, minimum: 1 },
        editor: { maximum: 5, minimum: 1, step: 1 },
        label: "Stream count",
        tier: "identity",
        update: "live",
      }),
      fallSpeed: logoEffectField.number({
        constraint: { maximum: 2.5, minimum: 0.35 },
        editor: { maximum: 2.5, minimum: 0.35, step: 0.05 },
        label: "Fall speed",
        tier: "identity",
        unit: "multiplier",
        update: "live",
      }),
      trailLength: logoEffectField.number({
        constraint: { maximum: 8, minimum: 2 },
        editor: { maximum: 8, minimum: 2, step: 0.25 },
        label: "Trail length",
        tier: "identity",
        unit: "rows",
        update: "live",
      }),
      width: logoEffectField.number({
        constraint: { maximum: 4, minimum: 0.1 },
        editor: { maximum: 4, minimum: 0.1, step: 0.05 },
        label: "Stream width",
        tier: "advanced",
        unit: "columns",
        update: "live",
      }),
      resolveRows: logoEffectField.number({
        constraint: { maximum: 8, minimum: 0.1 },
        editor: { maximum: 8, minimum: 0.1, step: 0.1 },
        label: "Resolve trail",
        tier: "advanced",
        unit: "rows",
        update: "live",
      }),
      glyphs: logoEffectField.symbols({
        constraint: { maximumItems: 64, minimumItems: 1 },
        label: "Rain glyphs",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Streams",
    tier: "identity",
  }),
  reveal: logoEffectField.group({
    fields: {
      fallDistanceRows: logoEffectField.range({
        constraint: { minimum: 0 },
        editor: { maximum: 30, minimum: 0, step: 0.5 },
        label: "Fall distance",
        tier: "identity",
        unit: "rows",
        update: "live",
      }),
    },
    label: "Reveal",
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
        label: "Influence radius",
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
        label: "Pull strength",
        tier: "interaction",
        update: "live",
      }),
      trailMs: logoEffectField.number({
        constraint: { integer: true, maximum: 1_400, minimum: 200 },
        editor: { maximum: 1_400, minimum: 200, step: 50 },
        label: "Wake decay",
        tier: "interaction",
        unit: "milliseconds",
        update: "live",
      }),
    },
    label: "Pointer",
    tier: "interaction",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

type RainStream = {
  colorIndex: number;
  column: number;
  cycle: number;
  headRow: number;
  id: number;
  trailLength: number;
};

type RainMutation = {
  cipher: boolean;
  colorIndex: number;
  glyphFrame: number;
  head: boolean;
  resolve: number;
  strength: number;
};

function glyphFor(
  seed: number,
  cellIndex: number,
  frame: number,
  glyphs: Values["streams"]["glyphs"]
) {
  const index = Math.floor(hashUnit(seed + frame * 211, cellIndex * 67 + 29) * glyphs.length);
  return glyphs[index];
}

function curvedColumn(stream: RainStream, row: number, pointer: LogoPoint | null, values: Values) {
  if (!pointer || !values.pointer.enabled) return stream.column;

  const delta = pointer.column - stream.column;
  const horizontalInfluence = clamp(1 - Math.abs(delta) / values.pointer.radius);
  const verticalRadius = Math.max(2.25, values.pointer.radius / 3.5);
  const verticalInfluence = clamp(1 - Math.abs(row - pointer.row) / verticalRadius);
  const pull = horizontalInfluence * verticalInfluence * values.pointer.strength * 0.78;
  return stream.column + delta * pull;
}

function strongerMutation(current: RainMutation | null, candidate: RainMutation | null) {
  if (!candidate) return current;
  return !current || candidate.strength > current.strength ? candidate : current;
}

function createRuntime({ cells, palette, seed }: LogoEffectContext, values: Values) {
  const occupiedColumns = [...new Set(cells.map((cell) => cell.column))].toSorted(
    (left, right) => left - right
  );
  const occupiedPositions = new Set(cells.map((cell) => `${cell.column}:${cell.row}`));

  const idleStreams = (frame: LogoEffectFrame, current: Values) => {
    if (frame.idleMs <= 0) return [];

    const streams: RainStream[] = [];
    for (let id = 0; id < current.streams.count; id += 1) {
      const travelMs =
        (current.timing.streamTravelMs[0] +
          hashUnit(seed, id * 101 + 13) *
            (current.timing.streamTravelMs[1] - current.timing.streamTravelMs[0])) /
        current.streams.fallSpeed;
      const pauseMs =
        current.timing.streamPauseMs[0] +
        hashUnit(seed, id * 139 + 41) *
          (current.timing.streamPauseMs[1] - current.timing.streamPauseMs[0]);
      const cycleMs = travelMs + pauseMs;
      const offset =
        (id / current.streams.count) * cycleMs +
        hashUnit(seed, id * 173 + 59) * current.timing.streamOffsetJitterMs;
      const clock = frame.idleMs + offset;
      const cycle = Math.floor(clock / cycleMs);
      const localMs = positiveModulo(clock, cycleMs);
      if (localMs >= travelMs) continue;

      const columnIndex = Math.floor(
        hashUnit(seed + cycle * 269, id * 197 + 71) * occupiedColumns.length
      );
      const trailLength =
        current.streams.trailLength * (0.82 + hashUnit(seed + cycle * 313, id * 223 + 83) * 0.36);
      streams.push({
        colorIndex: Math.floor(
          hashUnit(seed + cycle * 347, id * 239 + 97) * palette.ciphertext.length
        ),
        column: occupiedColumns[columnIndex],
        cycle,
        headRow: -1.25 + (localMs / travelMs) * (ROWS + trailLength + 2.5),
        id,
        trailLength,
      });
    }
    return streams;
  };

  const mutationFromStreams = (cell: LogoCell, frame: LogoEffectFrame, current: Values) => {
    let mutation: RainMutation | null = null;
    for (const stream of idleStreams(frame, current)) {
      const streamColumn = curvedColumn(stream, cell.row, frame.pointer, current);
      const columnDistance = Math.abs(cell.column - streamColumn);
      const columnStrength = clamp(1 - columnDistance / current.streams.width);
      if (columnStrength <= 0) continue;

      const depth = stream.headRow - cell.row;
      if (depth < -0.7 || depth > stream.trailLength + current.streams.resolveRows) continue;
      const glyphFrame =
        Math.floor((frame.idleMs / 1000) * current.pointer.rate) +
        stream.cycle * 37 +
        stream.id * 17;

      if (depth <= stream.trailLength) {
        const trailProgress = clamp(Math.max(0, depth) / stream.trailLength);
        const head = Math.abs(depth) < 0.9;
        mutation = strongerMutation(mutation, {
          cipher: true,
          colorIndex: stream.colorIndex,
          glyphFrame,
          head,
          resolve: 0,
          strength: columnStrength * (head ? 1 : 0.82 - trailProgress * 0.52),
        });
      } else {
        const resolve = clamp((depth - stream.trailLength) / current.streams.resolveRows);
        mutation = strongerMutation(mutation, {
          cipher: false,
          colorIndex: stream.colorIndex,
          glyphFrame,
          head: false,
          resolve,
          strength: columnStrength * (1 - resolve) * 0.42,
        });
      }
    }
    return mutation;
  };

  const mutationFromPointerWake = (cell: LogoCell, frame: LogoEffectFrame, current: Values) => {
    if (!current.pointer.enabled || frame.pointerTrail.length === 0) return null;

    let mutation: RainMutation | null = null;
    const wakeWidth = 0.68 + (current.pointer.radius / 24) * 0.42;
    const fallRowsPerSecond = 3.2 + current.streams.fallSpeed * 2.8;

    frame.pointerTrail.forEach((point, pointIndex) => {
      if (point.ageMs > current.pointer.trailMs) return;
      const life = 1 - point.ageMs / current.pointer.trailMs;
      const projectedRow = point.row + (point.ageMs / 1000) * fallRowsPerSecond;
      const distance = Math.hypot(
        cell.column + 0.5 - point.column,
        (cell.row + 0.5 - projectedRow) * 1.45
      );
      if (distance >= wakeWidth) return;

      const resolve = life < 0.3 ? 1 - life / 0.3 : 0;
      const strength =
        (1 - distance / wakeWidth) * (0.3 + life * 0.7) * (0.35 + current.pointer.strength * 0.65);
      mutation = strongerMutation(mutation, {
        cipher: resolve === 0,
        colorIndex: pointIndex % palette.ciphertext.length,
        glyphFrame:
          Math.floor(
            ((frame.revealMs + frame.interactionMs + point.ageMs) / 1000) * current.pointer.rate
          ) +
          pointIndex * 11,
        head: point.ageMs < 110,
        resolve,
        strength,
      });
    });

    return mutation;
  };

  const particles = (frame: LogoEffectFrame, current: Values) => {
    if (frame.revealMs < current.timing.durationMs) return [];
    const output: GlyphParticle[] = [];

    for (const stream of idleStreams(frame, current)) {
      const segments = Math.ceil(stream.trailLength);
      for (let segment = 0; segment <= segments; segment += 1) {
        const row = stream.headRow - segment;
        if (row < -0.75 || row > ROWS + 0.75) continue;
        const column = curvedColumn(stream, row, frame.pointer, current);
        const roundedColumn = Math.round(column);
        const roundedRow = Math.round(row);
        if (
          Math.abs(column - roundedColumn) < 0.18 &&
          Math.abs(row - roundedRow) < 0.18 &&
          occupiedPositions.has(`${roundedColumn}:${roundedRow}`)
        ) {
          continue;
        }
        const progress = segment / Math.max(1, segments);
        output.push({
          alpha: 0.24 + (1 - progress) * 0.56,
          channel: "particle",
          color: mixColor(
            palette.ciphertext[stream.colorIndex],
            palette.bright,
            segment === 0 ? 0.78 : 0.08
          ),
          column,
          glow: segment === 0 ? 0.82 : (1 - progress) * 0.24,
          glyph: glyphFor(
            seed + stream.cycle * 401,
            stream.id * 47 + segment,
            segment,
            current.streams.glyphs
          ),
          row,
          scale: segment === 0 ? 1.08 : 0.94,
        });
      }
    }

    if (current.pointer.enabled) {
      frame.pointerTrail.forEach((point, pointIndex) => {
        if (point.ageMs > current.pointer.trailMs) return;
        const life = 1 - point.ageMs / current.pointer.trailMs;
        const row = point.row + (point.ageMs / 1000) * (3.2 + current.streams.fallSpeed * 2.8);
        if (row < -0.75 || row > ROWS + 0.75) return;
        output.push({
          alpha: life * 0.58,
          channel: "particle",
          color: mixColor(
            palette.ciphertext[pointIndex % palette.ciphertext.length],
            palette.bright,
            life * 0.52
          ),
          column: point.column,
          glow: life * 0.52,
          glyph: glyphFor(
            seed + 0x5054_5257,
            pointIndex,
            Math.floor(point.ageMs / 52),
            current.streams.glyphs
          ),
          row,
          scale: 0.88 + life * 0.16,
        });
      });
    }

    return output;
  };

  return createSampledLogoEffectRuntime(cells, values, {
    usesIdle: true,
    extraInstanceCapacity: 96,
    particles,
    pointerEnabled: (current) => current.pointer.enabled,
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const fallDistance =
        current.reveal.fallDistanceRows[0] +
        hashUnit(seed, cell.index * 23) *
          (current.reveal.fallDistanceRows[1] - current.reveal.fallDistanceRows[0]);
      const startAt =
        current.timing.startDelayMs[0] +
        hashUnit(seed, cell.column * 41 + 3) *
          (current.timing.startDelayMs[1] - current.timing.startDelayMs[0]);
      const landAt =
        startAt +
        current.timing.fallDurationMs[0] +
        hashUnit(seed, cell.index * 47 + 11) *
          (current.timing.fallDurationMs[1] - current.timing.fallDurationMs[0]) +
        (cell.row / (ROWS - 1)) * current.timing.rowStaggerMs;
      if (frame.revealMs < startAt) return null;

      const revealProgress = clamp((frame.revealMs - startAt) / (landAt - startAt));
      const eased = easeOutCubic(revealProgress);
      const revealFrame = Math.floor(frame.revealMs / current.timing.revealGlyphFrameMs);
      const rainGlyph = glyphFor(seed, cell.index, revealFrame, current.streams.glyphs);
      const baseColor = mixColor(
        palette.final,
        palette.ciphertext[cell.row % palette.ciphertext.length],
        0.24 + (cell.row / (ROWS - 1)) * 0.34
      );

      if (revealProgress < 1) {
        return {
          alpha: clamp(revealProgress * 2.6),
          color: mixColor(
            palette.ciphertext[
              Math.floor(hashUnit(seed, cell.index * 29 + 17) * palette.ciphertext.length)
            ],
            baseColor,
            clamp((revealProgress - 0.7) / 0.3)
          ),
          glyph: revealProgress < 0.82 ? rainGlyph : cell.glyph,
          glow: clamp(1 - revealProgress) * 0.6,
          offsetY: -fallDistance * (1 - eased),
        };
      }

      let mutation = mutationFromStreams(cell, frame, current);
      mutation = strongerMutation(mutation, mutationFromPointerWake(cell, frame, current));
      if (!mutation) return { color: baseColor, glyph: cell.glyph };

      if (!mutation.cipher) {
        return {
          color: mixColor(palette.bright, baseColor, mutation.resolve),
          glow: (1 - mutation.resolve) * mutation.strength * 0.52,
          glyph: cell.glyph,
        };
      }

      return {
        color: mixColor(
          palette.ciphertext[mutation.colorIndex],
          palette.bright,
          (mutation.head ? 0.68 : 0.08) + mutation.strength * 0.2
        ),
        glow: 0.16 + mutation.strength * (mutation.head ? 0.86 : 0.5),
        glyph: glyphFor(
          seed + 0x4d41_5458,
          cell.index,
          mutation.glyphFrame,
          current.streams.glyphs
        ),
        scale: 1 + mutation.strength * (mutation.head ? 0.08 : 0.025),
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
      pointer: {
        enabled: true,
        radius: 10,
        rate: 14,
        strength: 0.7,
        trailMs: 700,
      },
      reveal: { fallDistanceRows: [4, 15] },
      streams: {
        count: 2,
        fallSpeed: 1,
        glyphs: RAIN_GLYPHS,
        resolveRows: 1.5,
        trailLength: 4.5,
        width: 1.2,
      },
      timing: {
        durationMs: 2_900,
        fallDurationMs: [720, 1_640],
        revealGlyphFrameMs: 68,
        rowStaggerMs: 200,
        startDelayMs: [60, 740],
        streamOffsetJitterMs: 360,
        streamPauseMs: [900, 1_950],
        streamTravelMs: [2_600, 3_220],
      },
    },
  },
  id: "rain",
  label: "Rain",
  schema,
  source: createTtfxSourceReference("rain", "src/effects/rain.rs"),
});
