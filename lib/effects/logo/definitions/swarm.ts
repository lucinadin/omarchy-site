import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { logoCellColor, mixColor } from "@/lib/effects/logo/runtime/color";
import { easeInOutSine } from "@/lib/effects/logo/runtime/easing";
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
import { clamp, hashUnit } from "@/lib/effects/logo/runtime/math";
import { samplePolyline } from "@/lib/effects/logo/runtime/path";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  logoEffectField,
  type LogoEffectRuntimeValues,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { LogoCell, LogoEffectContext, LogoPoint } from "@/lib/effects/logo/types";

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
      groupStaggerFraction: logoEffectField.number({
        constraint: { maximum: 0.8, minimum: 0 },
        editor: { maximum: 0.8, minimum: 0, step: 0.01 },
        label: "Group stagger",
        tier: "identity",
        update: "live",
      }),
      travelFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.05 },
        editor: { maximum: 1, minimum: 0.05, step: 0.01 },
        label: "Travel time",
        tier: "identity",
        update: "live",
      }),
      landingStart: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Landing start",
        tier: "advanced",
        update: "live",
      }),
      landingFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Landing time",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  groups: logoEffectField.group({
    fields: {
      sizeFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Group size",
        tier: "identity",
        update: "rebuild",
      }),
      minimumSize: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 64, minimum: 1, step: 1 },
        label: "Minimum group size",
        tier: "advanced",
        update: "rebuild",
      }),
      waypointCount: logoEffectField.number({
        constraint: { integer: true, minimum: 0 },
        editor: { maximum: 8, minimum: 0, step: 1 },
        label: "Waypoints",
        tier: "identity",
        update: "rebuild",
      }),
    },
    label: "Groups",
    tier: "identity",
  }),
  motion: logoEffectField.group({
    fields: {
      edgeOverscan: logoEffectField.number({
        constraint: { maximum: 12, minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.25 },
        label: "Edge overscan",
        tier: "advanced",
        update: "rebuild",
      }),
      cellSpread: logoEffectField.number({
        constraint: { maximum: 12, minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.25 },
        label: "Cell spread",
        tier: "identity",
        update: "live",
      }),
      flashPulses: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 24, minimum: 0, step: 0.5 },
        label: "Flash pulses",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Motion",
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
      startScale: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.1 },
        editor: { maximum: 1, minimum: 0.1, step: 0.01 },
        label: "Start scale",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

type SwarmGroup = {
  cells: readonly LogoCell[];
  index: number;
  route: readonly LogoPoint[];
};

function makeSwarms(
  cells: readonly LogoCell[],
  seed: number,
  maxColumn: number,
  maxRow: number,
  values: Values
): SwarmGroup[] {
  const size = Math.max(
    values.groups.minimumSize,
    Math.round(cells.length * values.groups.sizeFraction)
  );
  const groups: SwarmGroup[] = [];
  for (let start = 0; start < cells.length; start += size) {
    const groupCells = cells.slice(start, start + size);
    const groupIndex = groups.length;
    const spawnEdge = hashUnit(seed, groupIndex * 271 + 5) > 0.5;
    groups.push({
      cells: groupCells,
      index: groupIndex,
      route: [
        {
          column: spawnEdge ? -values.motion.edgeOverscan : maxColumn + values.motion.edgeOverscan,
          row: hashUnit(seed, groupIndex * 277 + 13) * maxRow,
        },
        ...Array.from({ length: values.groups.waypointCount }, (_, waypointIndex) => ({
          column:
            hashUnit(seed, groupIndex * (281 + waypointIndex * 12) + 29 + waypointIndex * 14) *
            maxColumn,
          row:
            hashUnit(seed, groupIndex * (283 + waypointIndex * 24) + 31 + waypointIndex * 16) *
            maxRow,
        })),
      ],
    });
  }
  return groups;
}

function createRuntime({ cells, palette, seed }: LogoEffectContext, values: Values) {
  const bounds = getLogoBounds(cells);
  const groups = makeSwarms(cells, seed, bounds.maxColumn, bounds.maxRow, values);
  const groupByCell = Array.from({ length: cells.length }, () => groups[0]);
  for (const group of groups) {
    group.cells.forEach((cell) => {
      groupByCell[cell.index] = group;
    });
  }

  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: (current) => current.timing.durationMs,
    sample(cell, frame, current) {
      const duration = current.timing.durationMs;
      const group = groupByCell[cell.index];
      const delay =
        ((groups.length - 1 - group.index) / Math.max(1, groups.length - 1)) *
        duration *
        current.timing.groupStaggerFraction;
      const local = clamp((frame.revealMs - delay) / (duration * current.timing.travelFraction));
      if (frame.revealMs < delay) return null;

      const offset = {
        column: (hashUnit(seed, cell.index * 311 + 53) - 0.5) * current.motion.cellSpread * 2,
        row: (hashUnit(seed, cell.index * 313 + 59) - 0.5) * current.motion.cellSpread,
      };
      const route = [
        ...group.route.map((point) => ({
          column: point.column + offset.column,
          row: point.row + offset.row,
        })),
        { column: cell.column, row: cell.row },
      ];
      const routeProgress = easeInOutSine(local);
      const point = samplePolyline(route, routeProgress);
      const landing = clamp((local - current.timing.landingStart) / current.timing.landingFraction);
      const flash = Math.sin(local * Math.PI * current.motion.flashPulses) ** 2;
      const swarmColor = mixColor(palette.ciphertext[2], palette.laser[0], flash);

      return {
        color: mixColor(swarmColor, logoCellColor(cell, palette, bounds.rows), landing),
        glow: (1 - landing) * current.appearance.intensity * (0.25 + flash * 0.65),
        glyph: cell.glyph,
        offsetX: point.column - cell.column,
        offsetY: point.row - cell.row,
        scale: current.appearance.startScale + landing * (1 - current.appearance.startScale),
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
      appearance: { intensity: 0.75, startScale: 0.82 },
      groups: { minimumSize: 5, sizeFraction: 0.1, waypointCount: 2 },
      motion: { cellSpread: 3, edgeOverscan: 2, flashPulses: 9 },
      timing: {
        durationMs: 4_480,
        groupStaggerFraction: 0.32,
        landingFraction: 0.22,
        landingStart: 0.78,
        travelFraction: 0.62,
      },
    },
  },
  id: "swarm",
  label: "Swarm",
  schema,
  source: createTtfxSourceReference("swarm", "src/effects/swarm.rs"),
});
