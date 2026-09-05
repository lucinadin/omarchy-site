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
import { easeInOutExpo, easeInOutSine, easeOutExpo } from "@/lib/effects/logo/runtime/easing";
import { getLogoBounds } from "@/lib/effects/logo/runtime/grid";
import { clamp, hashUnit } from "@/lib/effects/logo/runtime/math";
import { interpolatePoint } from "@/lib/effects/logo/runtime/path";
import { createSampledLogoEffectRuntime } from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  logoEffectField,
  type LogoEffectRuntimeValues,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { LogoCell, LogoEffectContext } from "@/lib/effects/logo/types";

const schema = defineLogoEffectSchema({
  timing: logoEffectField.group({
    fields: {
      baseDurationMs: logoEffectField.number({
        constraint: { minimum: 250 },
        editor: { maximum: 10_000, minimum: 250, step: 50 },
        label: "Base duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      durationPerGroupMs: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 250, minimum: 0, step: 5 },
        label: "Duration per group",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      groupSpreadFraction: logoEffectField.number({
        constraint: { maximum: 0.8, minimum: 0 },
        editor: { maximum: 0.8, minimum: 0, step: 0.01 },
        label: "Bubble stagger",
        tier: "identity",
        update: "live",
      }),
      localDurationFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.05 },
        editor: { maximum: 1, minimum: 0.05, step: 0.01 },
        label: "Local bubble time",
        tier: "advanced",
        update: "live",
      }),
      floatFraction: logoEffectField.number({
        constraint: { maximum: 0.9, minimum: 0.05 },
        editor: { maximum: 0.9, minimum: 0.05, step: 0.01 },
        label: "Float time",
        tier: "identity",
        update: "live",
      }),
      burstFraction: logoEffectField.number({
        constraint: { maximum: 0.5, minimum: 0.01 },
        editor: { maximum: 0.5, minimum: 0.01, step: 0.01 },
        label: "Burst time",
        tier: "identity",
        update: "live",
      }),
      homeFraction: logoEffectField.number({
        constraint: { maximum: 0.9, minimum: 0.05 },
        editor: { maximum: 0.9, minimum: 0.05, step: 0.01 },
        label: "Return time",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Timing",
    tier: "identity",
  }),
  grouping: logoEffectField.group({
    fields: {
      minimumCellCount: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 32, minimum: 1, step: 1 },
        label: "Minimum bubble size",
        tier: "identity",
        update: "rebuild",
      }),
      cellCountVariation: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 32, minimum: 1, step: 1 },
        label: "Bubble size variation",
        tier: "advanced",
        update: "rebuild",
      }),
      minimumRadius: logoEffectField.number({
        constraint: { minimum: 0.1 },
        editor: { maximum: 5, minimum: 0.1, step: 0.1 },
        label: "Minimum radius",
        tier: "advanced",
        update: "rebuild",
      }),
      radiusDivisor: logoEffectField.number({
        constraint: { minimum: 0.1 },
        editor: { maximum: 12, minimum: 0.1, step: 0.1 },
        label: "Radius divisor",
        tier: "advanced",
        update: "rebuild",
      }),
    },
    label: "Bubble groups",
    tier: "identity",
  }),
  motion: logoEffectField.group({
    fields: {
      originOverscanRows: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.25 },
        label: "Origin overscan",
        tier: "advanced",
        update: "live",
      }),
      ringRadiusX: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 5, minimum: 0, step: 0.05 },
        label: "Ring width",
        tier: "identity",
        update: "live",
      }),
      ringRadiusY: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 5, minimum: 0, step: 0.05 },
        label: "Ring height",
        tier: "identity",
        update: "live",
      }),
      burstDistanceX: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.1 },
        label: "Burst width",
        tier: "identity",
        update: "live",
      }),
      burstDistanceY: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 0.1 },
        label: "Burst height",
        tier: "identity",
        update: "live",
      }),
      burstScale: logoEffectField.number({
        constraint: { minimum: 0.1 },
        editor: { maximum: 3, minimum: 0.1, step: 0.05 },
        label: "Burst scale",
        tier: "identity",
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
      ringGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Ring glow",
        tier: "advanced",
        update: "live",
      }),
      burstGlow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Burst glow",
        tier: "advanced",
        update: "live",
      }),
      sheenCycleMs: logoEffectField.number({
        constraint: { minimum: 50 },
        editor: { maximum: 5_000, minimum: 50, step: 25 },
        label: "Sheen cycle",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
    },
    label: "Appearance",
    tier: "identity",
  }),
  glyphs: logoEffectField.group({
    fields: {
      burstSymbols: logoEffectField.symbols({
        constraint: { maximumItems: 8, minimumItems: 2 },
        label: "Burst symbols",
        tier: "identity",
        update: "live",
      }),
      firstSymbolFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "First symbol time",
        tier: "advanced",
        update: "live",
      }),
    },
    label: "Glyphs",
    tier: "identity",
  }),
});

type Values = LogoEffectRuntimeValues<typeof schema>;

type BubbleGroup = {
  anchorColumn: number;
  anchorRow: number;
  cells: readonly LogoCell[];
  index: number;
  radius: number;
};

function makeGroups(
  cells: readonly LogoCell[],
  seed: number,
  columns: number,
  values: Values
): BubbleGroup[] {
  const ordered = cells.toSorted(
    (left, right) => right.row - left.row || left.column - right.column
  );
  const groups: BubbleGroup[] = [];
  let cursor = 0;
  while (cursor < ordered.length) {
    const groupIndex = groups.length;
    const size = Math.min(
      ordered.length - cursor,
      values.grouping.minimumCellCount +
        Math.floor(hashUnit(seed, groupIndex * 223 + 17) * values.grouping.cellCountVariation)
    );
    const groupCells = ordered.slice(cursor, cursor + size);
    groups.push({
      anchorColumn: hashUnit(seed, groupIndex * 227 + 37) * (columns - 1),
      anchorRow: Math.min(...groupCells.map((cell) => cell.row)),
      cells: groupCells,
      index: groupIndex,
      radius: Math.max(values.grouping.minimumRadius, size / values.grouping.radiusDivisor),
    });
    cursor += size;
  }
  return groups;
}

function createRuntime({ cells, palette, seed }: LogoEffectContext, values: Values) {
  const bounds = getLogoBounds(cells);
  const groups = makeGroups(cells, seed, bounds.columns, values);
  const groupByCell = Array.from({ length: cells.length }, () => groups[0]);
  const indexInGroup = new Uint16Array(cells.length);
  for (const group of groups) {
    group.cells.forEach((cell, index) => {
      groupByCell[cell.index] = group;
      indexInGroup[cell.index] = index;
    });
  }
  const getColors = createLivePaletteColorStops(palette, (stops, currentPalette) => {
    stops[0] = currentPalette.laser[1];
    stops[1] = currentPalette.ciphertext[2];
    stops[2] = currentPalette.ciphertext[0];
    stops[3] = currentPalette.final;
  });

  return createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: (current) =>
      current.timing.baseDurationMs + groups.length * current.timing.durationPerGroupMs,
    sample(cell, frame, current) {
      const duration =
        current.timing.baseDurationMs + groups.length * current.timing.durationPerGroupMs;
      const group = groupByCell[cell.index];
      const groupDelay =
        (group.index / Math.max(1, groups.length - 1)) *
        duration *
        current.timing.groupSpreadFraction;
      const local = clamp(
        (frame.revealMs - groupDelay) / (duration * current.timing.localDurationFraction)
      );
      if (frame.revealMs < groupDelay) return null;

      const angle = (indexInGroup[cell.index] / group.cells.length) * Math.PI * 2;
      const origin = {
        column: group.anchorColumn,
        row: -current.motion.originOverscanRows - group.radius,
      };
      const landing = { column: group.anchorColumn, row: group.anchorRow + group.radius };
      const floatProgress = easeInOutSine(clamp(local / current.timing.floatFraction));
      const anchor = interpolatePoint(origin, landing, floatProgress);
      const ringPoint = {
        column: anchor.column + Math.cos(angle) * group.radius * current.motion.ringRadiusX,
        row: anchor.row + Math.sin(angle) * group.radius * current.motion.ringRadiusY,
      };
      const popProgress = easeOutExpo(
        clamp((local - current.timing.floatFraction) / current.timing.burstFraction)
      );
      const burstPoint = {
        column: ringPoint.column + Math.cos(angle) * current.motion.burstDistanceX,
        row: ringPoint.row + Math.sin(angle) * current.motion.burstDistanceY,
      };
      const poppedPoint = interpolatePoint(ringPoint, burstPoint, popProgress);
      const burstEnd = current.timing.floatFraction + current.timing.burstFraction;
      const homeProgress = easeInOutExpo(clamp((local - burstEnd) / current.timing.homeFraction));
      const point = interpolatePoint(poppedPoint, cell, homeProgress);
      const sheen = (angle / (Math.PI * 2) + frame.revealMs / current.appearance.sheenCycleMs) % 1;
      const baseColor = logoCellColor(cell, palette, bounds.rows);
      const color = mixColor(sampleColorStops(getColors(), sheen, true), baseColor, homeProgress);

      return {
        color,
        glow:
          (1 - homeProgress) *
          current.appearance.intensity *
          (local > current.timing.floatFraction && local < burstEnd
            ? current.appearance.burstGlow
            : current.appearance.ringGlow),
        glyph:
          local > current.timing.floatFraction &&
          local < current.timing.floatFraction + current.glyphs.firstSymbolFraction
            ? current.glyphs.burstSymbols[0]
            : local > current.timing.floatFraction + current.glyphs.firstSymbolFraction &&
                local < burstEnd
              ? current.glyphs.burstSymbols[1]
              : cell.glyph,
        offsetX: point.column - cell.column,
        offsetY: point.row - cell.row,
        scale:
          local > current.timing.floatFraction && local < burstEnd ? current.motion.burstScale : 1,
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
      appearance: { burstGlow: 0.95, intensity: 0.75, ringGlow: 0.42, sheenCycleMs: 900 },
      glyphs: { burstSymbols: ["*", "'"], firstSymbolFraction: 0.08 },
      grouping: {
        cellCountVariation: 10,
        minimumCellCount: 7,
        minimumRadius: 1.2,
        radiusDivisor: 5,
      },
      motion: {
        burstDistanceX: 3,
        burstDistanceY: 1.8,
        burstScale: 1.15,
        originOverscanRows: 4,
        ringRadiusX: 1.8,
        ringRadiusY: 1,
      },
      timing: {
        baseDurationMs: 3_550,
        burstFraction: 0.16,
        durationPerGroupMs: 55,
        floatFraction: 0.5,
        groupSpreadFraction: 0.228,
        homeFraction: 0.34,
        localDurationFraction: 0.64,
      },
    },
  },
  id: "bubbles",
  label: "Bubbles",
  schema,
  source: createTtfxSourceReference("bubbles", "src/effects/bubbles.rs"),
});
