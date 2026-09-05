import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
import { clamp, hashUnit } from "@/lib/effects/logo/runtime/math";
import { samplePolyline } from "@/lib/effects/logo/runtime/path";
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
  LogoPalette,
  LogoPoint,
} from "@/lib/effects/logo/types";

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
      travelFraction: logoEffectField.number({
        constraint: { maximum: 0.6, minimum: 0.05 },
        editor: { maximum: 0.6, minimum: 0.05, step: 0.01 },
        label: "Travel time",
        tier: "identity",
        update: "live",
      }),
      travelEndFraction: logoEffectField.number({
        constraint: { maximum: 0.95, minimum: 0.6 },
        editor: { maximum: 0.95, minimum: 0.6, step: 0.01 },
        label: "Travel end",
        tier: "advanced",
        update: "live",
      }),
      bitStaggerFraction: logoEffectField.number({
        constraint: { maximum: 0.1, minimum: 0 },
        editor: { maximum: 0.1, minimum: 0, step: 0.001 },
        label: "Bit stagger",
        tier: "identity",
        update: "live",
      }),
      wipeStartFraction: logoEffectField.number({
        constraint: { maximum: 0.95, minimum: 0 },
        editor: { maximum: 0.95, minimum: 0, step: 0.01 },
        label: "Wipe start",
        tier: "identity",
        update: "live",
      }),
      wipeSpreadFraction: logoEffectField.number({
        constraint: { maximum: 0.5, minimum: 0 },
        editor: { maximum: 0.5, minimum: 0, step: 0.01 },
        label: "Wipe spread",
        tier: "advanced",
        update: "live",
      }),
      brightenFraction: logoEffectField.number({
        constraint: { maximum: 0.5, minimum: 0.01 },
        editor: { maximum: 0.5, minimum: 0.01, step: 0.01 },
        label: "Brighten time",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  path: logoEffectField.group({
    fields: {
      routeOverscanCells: logoEffectField.number({
        constraint: { maximum: 8, minimum: 0 },
        editor: { maximum: 8, minimum: 0, step: 0.25 },
        label: "Route overscan",
        tier: "identity",
        update: "rebuild",
      }),
      diagonalRowWeight: logoEffectField.number({
        constraint: { maximum: 8, minimum: 0.1 },
        editor: { maximum: 8, minimum: 0.1, step: 0.1 },
        label: "Wipe row weight",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Path",
    tier: "identity",
  }),
  trail: logoEffectField.group({
    fields: {
      bitCount: logoEffectField.number({
        constraint: { integer: true, maximum: 32, minimum: 1 },
        editor: { maximum: 32, minimum: 1, step: 1 },
        label: "Bits per route",
        tier: "identity",
        update: "rebuild",
      }),
      alphaStart: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Starting opacity",
        tier: "advanced",
        update: "live",
      }),
      glowRange: logoEffectField.range({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Glow range",
        tier: "identity",
        update: "live",
      }),
      scaleRange: logoEffectField.range({
        constraint: { maximum: 2, minimum: 0.1 },
        editor: { maximum: 2, minimum: 0.1, step: 0.01 },
        label: "Scale range",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Bit trail",
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
      settledGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Settled glow",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

type BinaryRoute = {
  bits: string;
  points: readonly LogoPoint[];
};

function createRoute(
  cell: LogoCell,
  seed: number,
  maxColumn: number,
  maxRow: number,
  bitCount: number,
  overscan: number
): BinaryRoute {
  const edge = Math.floor(hashUnit(seed, cell.index * 173 + 19) * 4);
  const edgePosition = hashUnit(seed, cell.index * 179 + 41);
  const start =
    edge === 0
      ? { column: edgePosition * maxColumn, row: -overscan }
      : edge === 1
        ? { column: maxColumn + overscan, row: edgePosition * maxRow }
        : edge === 2
          ? { column: edgePosition * maxColumn, row: maxRow + overscan }
          : { column: -overscan, row: edgePosition * maxRow };
  const horizontalFirst = hashUnit(seed, cell.index * 181 + 59) > 0.5;
  const firstTurn = horizontalFirst
    ? { column: cell.column, row: start.row }
    : { column: start.column, row: cell.row };
  const codePoint = cell.glyph.codePointAt(0) ?? 0;

  return {
    bits: codePoint.toString(2).padStart(bitCount, "0").slice(-bitCount),
    points: [start, firstTurn, { column: cell.column, row: cell.row }],
  };
}

function binarySchedule(cell: LogoCell, rank: Uint32Array, cellCount: number, values: Values) {
  const duration = values.timing.durationMs;
  const travelDuration = duration * values.timing.travelFraction;
  const travelEnd = duration * values.timing.travelEndFraction;
  const start =
    values.timing.initialDelayMs +
    (rank[cell.index] / Math.max(1, cellCount - 1)) *
      (travelEnd - travelDuration - values.timing.initialDelayMs);
  return { end: start + travelDuration, start, travelDuration };
}

function binaryParticles(
  cells: readonly LogoCell[],
  routes: readonly BinaryRoute[],
  rank: Uint32Array,
  revealMs: number,
  palette: LogoPalette,
  values: Values
): GlyphParticle[] {
  const particles: GlyphParticle[] = [];
  for (const cell of cells) {
    const schedule = binarySchedule(cell, rank, cells.length, values);
    if (revealMs < schedule.start || revealMs >= schedule.end) continue;

    const route = routes[cell.index];
    const baseProgress = (revealMs - schedule.start) / schedule.travelDuration;
    for (let bitIndex = 0; bitIndex < route.bits.length; bitIndex += 1) {
      const progress =
        (baseProgress - bitIndex * values.timing.bitStaggerFraction) /
        (1 - (route.bits.length - 1) * values.timing.bitStaggerFraction);
      if (progress < 0 || progress > 1) continue;
      const point = samplePolyline(route.points, progress);
      particles.push({
        alpha: values.trail.alphaStart + progress * (1 - values.trail.alphaStart),
        channel: "helper",
        color: palette.ciphertext[bitIndex % palette.ciphertext.length],
        column: point.column,
        glow:
          values.appearance.intensity *
          (values.trail.glowRange[0] +
            progress * (values.trail.glowRange[1] - values.trail.glowRange[0])),
        glyph: route.bits[bitIndex],
        row: point.row,
        scale:
          values.trail.scaleRange[0] +
          progress * (values.trail.scaleRange[1] - values.trail.scaleRange[0]),
      });
    }
  }
  return particles;
}

function createRuntime({ cells, palette, seed }: LogoEffectContext, values: Values) {
  const bounds = getLogoBounds(cells);
  const routes = cells.map((cell) =>
    createRoute(
      cell,
      seed,
      bounds.maxColumn,
      bounds.maxRow,
      values.trail.bitCount,
      values.path.routeOverscanCells
    )
  );
  const order = cells
    .map((cell) => cell.index)
    .toSorted((left, right) => hashUnit(seed, left * 191 + 23) - hashUnit(seed, right * 191 + 23));
  const rank = new Uint32Array(cells.length);
  order.forEach((cellIndex, index) => {
    rank[cellIndex] = index;
  });

  return createSampledLogoEffectRuntime(cells, values, {
    extraInstanceCapacity: cells.length * values.trail.bitCount,
    particles(frame, current) {
      return binaryParticles(cells, routes, rank, frame.revealMs, palette, current);
    },
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const duration = current.timing.durationMs;
      const schedule = binarySchedule(cell, rank, cells.length, current);
      if (frame.revealMs < schedule.end) return null;

      const baseColor = logoCellColor(cell, palette, bounds.rows);
      const diagonal =
        (cell.column + (bounds.maxRow - cell.row) * current.path.diagonalRowWeight) /
        Math.max(1, bounds.maxColumn + bounds.maxRow * current.path.diagonalRowWeight);
      const wipeStart =
        duration * current.timing.wipeStartFraction +
        diagonal * duration * current.timing.wipeSpreadFraction;
      const brighten = clamp(
        (frame.revealMs - wipeStart) / (duration * current.timing.brightenFraction)
      );

      return {
        color: mixColor(palette.muted, baseColor, brighten),
        glow: brighten * current.appearance.intensity * current.appearance.settledGlow,
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
      appearance: { intensity: 0.75, settledGlow: 0.42 },
      path: { diagonalRowWeight: 3, routeOverscanCells: 1 },
      timing: {
        bitStaggerFraction: 0.032,
        brightenFraction: 0.1,
        durationMs: 4_940,
        initialDelayMs: 80,
        travelEndFraction: 0.76,
        travelFraction: 0.25,
        wipeSpreadFraction: 0.12,
        wipeStartFraction: 0.78,
      },
      trail: {
        alphaStart: 0.45,
        bitCount: 8,
        glowRange: [0.2, 0.9],
        scaleRange: [0.72, 0.94],
      },
    },
  },
  id: "binarypath",
  label: "Binary Path",
  schema,
  source: createTtfxSourceReference("binarypath", "src/effects/binarypath.rs"),
});
