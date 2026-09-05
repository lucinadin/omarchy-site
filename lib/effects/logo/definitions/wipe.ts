import { themeLogoColor } from "@/lib/effects/logo/color-bindings";
import {
  DEFAULT_LOGO_EFFECT_PLAYBACK,
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  LOGO_GRADIENT_DIRECTIONS as GRADIENT_DIRECTIONS,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import { mixColor } from "@/lib/effects/logo/runtime/color";
import { evaluateEasing, EASING_NAMES } from "@/lib/effects/logo/runtime/easing";
import { buildGradient, colorAtGridPoint } from "@/lib/effects/logo/runtime/graphics";
import { clamp } from "@/lib/effects/logo/runtime/math";
import {
  bindLogoEffectAuthorRuntime,
  createSampledLogoEffectRuntime,
  LOGO_EFFECT_TICK_MS,
} from "@/lib/effects/logo/sampled-runtime";
import {
  defineLogoEffectSchema,
  logoEffectField,
  type LogoEffectAuthorValues,
  type LogoEffectRuntimeValues,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type { LogoCell, LogoEffectContext } from "@/lib/effects/logo/types";
import { unreachable } from "@/lib/validation";

const WIPE_DIRECTIONS = [
  "column_left_to_right",
  "column_right_to_left",
  "row_top_to_bottom",
  "row_bottom_to_top",
  "diagonal_bottom_left_to_top_right",
  "diagonal_top_right_to_bottom_left",
  "diagonal_top_left_to_bottom_right",
  "diagonal_bottom_right_to_top_left",
  "center_to_outside",
  "outside_to_center",
] as const;

const WIPE_SOURCE_PATH = "src/effects/wipe.rs";

const WIPE_SOURCE_CHOREOGRAPHY = {
  existingColorHandling: "ignore",
  sequenceSteps: 100,
} as const;

const wipeSchema = defineLogoEffectSchema({
  wipeDirection: logoEffectField.choice({
    label: "Wipe direction",
    options: WIPE_DIRECTIONS,
    tier: "identity",
    update: "rebuild",
  }),
  wipeDelayFrames: logoEffectField.number({
    constraint: { integer: true, minimum: 0 },
    editor: { maximum: 30, minimum: 0, step: 1 },
    label: "Wipe delay",
    tier: "identity",
    unit: "simulation frames",
    update: "rebuild",
  }),
  wipeEase: logoEffectField.choice({
    label: "Wipe easing",
    options: EASING_NAMES,
    tier: "identity",
    update: "rebuild",
  }),
  sequenceSteps: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    description: "Number of eased samples used to construct the wipe reveal.",
    editor: { maximum: 240, minimum: 1, step: 1 },
    label: "Reveal steps",
    tier: "advanced",
    update: "rebuild",
  }),
  finalGradientStops: logoEffectField.colors({
    constraint: { maximumItems: 8, minimumItems: 1 },
    label: "Final gradient",
    tier: "identity",
    update: "rebuild",
  }),
  finalGradientSteps: logoEffectField.numberList({
    constraint: { maximumItems: 8, minimumItems: 1 },
    itemConstraint: { integer: true, maximum: 64, minimum: 1 },
    label: "Final gradient steps",
    tier: "advanced",
    update: "rebuild",
  }),
  finalGradientFrames: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 30, minimum: 1, step: 1 },
    label: "Final gradient frames",
    tier: "advanced",
    unit: "simulation frames per color",
    update: "rebuild",
  }),
  finalGradientDirection: logoEffectField.choice({
    label: "Final gradient direction",
    options: GRADIENT_DIRECTIONS,
    tier: "identity",
    update: "rebuild",
  }),
  idle: logoEffectField.group({
    fields: {
      intervalMs: logoEffectField.number({
        constraint: { minimum: 800 },
        editor: { maximum: 10_000, minimum: 800, step: 100 },
        label: "Interval",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      durationMs: logoEffectField.number({
        constraint: { minimum: 100 },
        editor: { maximum: 3_000, minimum: 100, step: 50 },
        label: "Duration",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      width: logoEffectField.number({
        constraint: { integer: true, maximum: 32, minimum: 1 },
        editor: { maximum: 32, minimum: 1, step: 1 },
        label: "Width",
        tier: "identity",
        update: "live",
      }),
      intensity: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Intensity",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Idle sheen",
    tier: "identity",
  }),
});

type WipeRuntimeValues = LogoEffectRuntimeValues<typeof wipeSchema>;

const WIPE_DEFAULT_VALUES = {
  wipeDirection: "diagonal_top_left_to_bottom_right",
  wipeDelayFrames: 0,
  wipeEase: "in_out_circ",
  sequenceSteps: WIPE_SOURCE_CHOREOGRAPHY.sequenceSteps,
  finalGradientStops: [
    themeLogoColor("accent", [122, 162, 247]),
    themeLogoColor("orange", [255, 158, 100]),
    themeLogoColor("yellow", [224, 175, 104]),
  ],
  finalGradientSteps: [12],
  finalGradientFrames: 3,
  finalGradientDirection: "vertical",
  idle: {
    intervalMs: 2_200,
    durationMs: 700,
    width: 8,
    intensity: 0.18,
  },
} as const satisfies LogoEffectAuthorValues<typeof wipeSchema>;

const WIPE_DEFAULTS = {
  playback: DEFAULT_LOGO_EFFECT_PLAYBACK,
  presentation: DEFAULT_LOGO_EFFECT_PRESENTATION,
  values: WIPE_DEFAULT_VALUES,
} as const;

type LogoDimensions = {
  columns: number;
  maximumRow: number;
  minimumColumn: number;
  rows: number;
};

function logoDimensions(cells: readonly LogoCell[]): LogoDimensions {
  if (cells.length === 0) {
    return { columns: 1, maximumRow: 0, minimumColumn: 0, rows: 1 };
  }

  const minimumColumn = cells.reduce(
    (minimum, cell) => Math.min(minimum, cell.column),
    Number.POSITIVE_INFINITY
  );
  const maximumColumn = cells.reduce(
    (maximum, cell) => Math.max(maximum, cell.column),
    Number.NEGATIVE_INFINITY
  );
  const minimumRow = cells.reduce(
    (minimum, cell) => Math.min(minimum, cell.row),
    Number.POSITIVE_INFINITY
  );
  const maximumRow = cells.reduce(
    (maximum, cell) => Math.max(maximum, cell.row),
    Number.NEGATIVE_INFINITY
  );
  return {
    columns: maximumColumn - minimumColumn + 1,
    maximumRow,
    minimumColumn,
    rows: maximumRow - minimumRow + 1,
  };
}

function originalGroups(
  cells: readonly LogoCell[],
  direction: WipeRuntimeValues["wipeDirection"],
  dimensions: LogoDimensions
) {
  const sortedCells = [...cells].toSorted((left, right) => {
    const leftSourceRow = dimensions.maximumRow - left.row + 1;
    const rightSourceRow = dimensions.maximumRow - right.row + 1;
    return leftSourceRow - rightSourceRow || left.column - right.column;
  });
  const centerColumn = 1 + Math.floor((dimensions.columns - 1) / 2);
  const centerRow = 1 + Math.floor((dimensions.rows - 1) / 2);
  const groups = new Map<number, LogoCell[]>();
  let reverse = false;

  for (const cell of sortedCells) {
    const column = cell.column - dimensions.minimumColumn + 1;
    const row = dimensions.maximumRow - cell.row + 1;
    let key: number;
    switch (direction) {
      case "column_left_to_right":
        key = column;
        break;
      case "column_right_to_left":
        key = column;
        reverse = true;
        break;
      case "row_bottom_to_top":
        key = row;
        break;
      case "row_top_to_bottom":
        key = row;
        reverse = true;
        break;
      case "diagonal_bottom_left_to_top_right":
        key = row + column;
        break;
      case "diagonal_top_right_to_bottom_left":
        key = row + column;
        reverse = true;
        break;
      case "diagonal_top_left_to_bottom_right":
        key = column - row;
        break;
      case "diagonal_bottom_right_to_top_left":
        key = column - row;
        reverse = true;
        break;
      case "center_to_outside":
        key = Math.abs(column - centerColumn) + Math.abs(row - centerRow);
        break;
      case "outside_to_center":
        key = Math.abs(column - centerColumn) + Math.abs(row - centerRow);
        reverse = true;
        break;
      default:
        unreachable(direction);
    }
    const group = groups.get(key);
    if (group) group.push(cell);
    else groups.set(key, [cell]);
  }

  const ordered = [...groups.entries()]
    .toSorted(([left], [right]) => left - right)
    .map(([, group]) => group);
  return reverse ? ordered.toReversed() : ordered;
}

type VisibilityEvent = {
  tick: number;
  visible: boolean;
};

function buildVisibilityEvents(
  cells: readonly LogoCell[],
  values: WipeRuntimeValues,
  dimensions: LogoDimensions
) {
  const groups = originalGroups(cells, values.wipeDirection, dimensions);
  const events = Array.from({ length: cells.length }, (): VisibilityEvent[] => []);
  let previousLength = 0;
  let latestActivationTick: number | undefined;

  for (let step = 1; step <= values.sequenceSteps; step += 1) {
    const tick = values.wipeDelayFrames + (step - 1) * (values.wipeDelayFrames + 1);
    const eased = clamp(evaluateEasing(values.wipeEase, step / values.sequenceSteps));
    const length = Math.trunc(eased * groups.length);
    if (length > previousLength) {
      for (const group of groups.slice(previousLength, length)) {
        for (const cell of group) {
          events[cell.index].push({ tick, visible: true });
          latestActivationTick = Math.max(latestActivationTick ?? tick, tick);
        }
      }
    } else if (length < previousLength) {
      for (const group of groups.slice(length, previousLength)) {
        for (const cell of group) events[cell.index].push({ tick, visible: false });
      }
    }
    previousLength = length;
  }

  return { events, latestActivationTick };
}

function latestVisibilityEvent(events: readonly VisibilityEvent[], tick: number) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].tick <= tick) return events[index];
  }
}

function createWipeRuntime(
  { cells, palette }: LogoEffectContext,
  initialValues: WipeRuntimeValues
) {
  let values = initialValues;
  const dimensions = logoDimensions(cells);
  const finalSpectrum = buildGradient(values.finalGradientStops, values.finalGradientSteps);
  const wipeSpectrums = cells.map((cell) =>
    buildGradient(
      [
        finalSpectrum[0],
        colorAtGridPoint(
          finalSpectrum,
          {
            column: cell.column - dimensions.minimumColumn + 1,
            row: dimensions.maximumRow - cell.row + 1,
          },
          { bottom: 1, left: 1, right: dimensions.columns, top: dimensions.rows },
          values.finalGradientDirection
        ),
      ],
      values.finalGradientSteps
    )
  );
  const sceneTicks = wipeSpectrums.reduce(
    (maximum, spectrum) => Math.max(maximum, spectrum.length * values.finalGradientFrames),
    1
  );
  const { events, latestActivationTick } = buildVisibilityEvents(cells, values, dimensions);
  const idleGroups = originalGroups(cells, values.wipeDirection, dimensions);
  const idleGroupByCell = new Int16Array(cells.length);
  for (const [groupIndex, group] of idleGroups.entries()) {
    for (const cell of group) idleGroupByCell[cell.index] = groupIndex;
  }
  const finalSequenceTick =
    values.wipeDelayFrames + (values.sequenceSteps - 1) * (values.wipeDelayFrames + 1);
  const finalOutputTick =
    latestActivationTick === undefined
      ? finalSequenceTick
      : Math.max(finalSequenceTick, latestActivationTick + Math.max(0, sceneTicks - 1));

  const runtime = createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: finalOutputTick * LOGO_EFFECT_TICK_MS,
    usesIdle: true,
    sample(cell, frame) {
      const elapsedTick = Math.floor(frame.revealMs / LOGO_EFFECT_TICK_MS + 1e-7);
      const event = latestVisibilityEvent(events[cell.index], elapsedTick);
      if (!event?.visible) return null;

      const ageTick = elapsedTick - event.tick;
      const spectrum = wipeSpectrums[cell.index];
      const colorIndex = Math.min(
        Math.floor(ageTick / values.finalGradientFrames),
        spectrum.length - 1
      );
      const finalColor = spectrum[colorIndex];
      const idleCycleMs = frame.idleMs % values.idle.intervalMs;
      const idleProgress = Math.min(1, idleCycleMs / values.idle.durationMs);
      const sheenCenter =
        idleProgress * (idleGroups.length + values.idle.width * 2) - values.idle.width;
      const distance = Math.abs(idleGroupByCell[cell.index] - sheenCenter);
      const sheen =
        idleCycleMs < values.idle.durationMs
          ? Math.max(0, 1 - distance / values.idle.width) *
            Math.sin(Math.PI * idleProgress) *
            values.idle.intensity
          : 0;
      return {
        channel: colorIndex === spectrum.length - 1 ? "finalText" : "transition",
        color: mixColor(finalColor, palette.bright, sheen),
        glyph: cell.glyph,
        glow: sheen,
      };
    },
  });

  return bindLogoEffectAuthorRuntime<WipeRuntimeValues>(runtime, (nextValues) => {
    values = nextValues;
  });
}

export const logoEffect = defineLogoEffect({
  createRuntime(context, values) {
    return createWipeRuntime(context, values);
  },
  defaults: WIPE_DEFAULTS,
  id: "wipe",
  label: "Wipe",
  schema: wipeSchema,
  source: createTtfxSourceReference("wipe", WIPE_SOURCE_PATH),
});
