import type { Rgb } from "@/lib/color";
import { themeLogoColor } from "@/lib/effects/logo/color-bindings";
import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  LOGO_GRADIENT_DIRECTIONS as GRADIENT_DIRECTIONS,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect, type LogoEffectAuthorRuntime } from "@/lib/effects/logo/definition";
import {
  OMARCHY_MARK_COLUMNS as COLUMNS,
  OMARCHY_MARK_ROWS as ROWS,
} from "@/lib/effects/logo/mark";
import {
  adjustColorBrightness,
  boundsFromPoints,
  buildGradient,
  colorAtGridPoint,
} from "@/lib/effects/logo/runtime/graphics";
import { SeededRandom } from "@/lib/effects/logo/runtime/random";
import {
  defineLogoEffectSchema,
  logoEffectField,
  type LogoEffectAuthorValues,
  type LogoEffectRuntimeValues,
} from "@/lib/effects/logo/schema";
import { createTtfxSourceReference } from "@/lib/effects/logo/sources/ttfx";
import type {
  LogoCell,
  LogoEffectContext,
  LogoEffectInstanceWriter,
} from "@/lib/effects/logo/types";

const RAIN_SYMBOLS = [
  "2",
  "5",
  "9",
  "8",
  "Z",
  "*",
  ")",
  ":",
  ".",
  '"',
  "=",
  "+",
  "-",
  "¦",
  "|",
  "_",
  "ｦ",
  "ｱ",
  "ｳ",
  "ｴ",
  "ｵ",
  "ｶ",
  "ｷ",
  "ｹ",
  "ｺ",
  "ｻ",
  "ｼ",
  "ｽ",
  "ｾ",
  "ｿ",
  "ﾀ",
  "ﾂ",
  "ﾃ",
  "ﾅ",
  "ﾆ",
  "ﾇ",
  "ﾈ",
  "ﾊ",
  "ﾋ",
  "ﾎ",
  "ﾏ",
  "ﾐ",
  "ﾑ",
  "ﾒ",
  "ﾓ",
  "ﾔ",
  "ﾕ",
  "ﾗ",
  "ﾘ",
  "ﾜ",
] as const;

const MATRIX_SOURCE_PATH = "src/effects/matrix.rs";
const MATRIX_SOURCE = createTtfxSourceReference("matrix", MATRIX_SOURCE_PATH);

const MATRIX_SOURCE_CHOREOGRAPHY = {
  columnDropChance: 0.08,
  columnLengthFraction: 0.1,
  fillFallDelayDivisor: 3,
  finalResolveGradientSteps: 8,
  fullColumnHoldFrames: [20, 45] as const,
  rainColumnBatch: [1, 3] as const,
  rainGradientSteps: 6,
  resolveBatch: [1, 4] as const,
  simulationRateHz: 120,
  tailBrightness: 0.65,
  tailColorCount: 3,
} as const;

const matrixSchema = defineLogoEffectSchema({
  highlightColor: logoEffectField.color({
    label: "Rain highlight",
    tier: "identity",
    update: "rebuild",
  }),
  rainColorGradient: logoEffectField.colors({
    constraint: { maximumItems: 8, minimumItems: 1 },
    label: "Rain gradient",
    tier: "identity",
    update: "rebuild",
  }),
  rainSymbols: logoEffectField.symbols({
    constraint: { maximumItems: 128, minimumItems: 1 },
    label: "Rain symbols",
    tier: "identity",
    update: "restart",
  }),
  rainFallDelayRange: logoEffectField.range({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 30, minimum: 1, step: 1 },
    label: "Rain fall delay",
    tier: "identity",
    unit: "simulation frames",
    update: "restart",
  }),
  rainColumnDelayRange: logoEffectField.range({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 30, minimum: 1, step: 1 },
    label: "Rain column delay",
    tier: "identity",
    unit: "simulation frames",
    update: "restart",
  }),
  rainTime: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 30, minimum: 1, step: 1 },
    label: "Rain time",
    tier: "identity",
    unit: "seconds",
    update: "restart",
  }),
  symbolSwapChance: logoEffectField.number({
    constraint: { minimum: Number.MIN_VALUE },
    editor: { maximum: 1, minimum: 0.0001, step: 0.0001 },
    label: "Symbol swap chance",
    tier: "advanced",
    update: "live",
  }),
  colorSwapChance: logoEffectField.number({
    constraint: { minimum: Number.MIN_VALUE },
    editor: { maximum: 1, minimum: 0.0001, step: 0.0001 },
    label: "Color swap chance",
    tier: "advanced",
    update: "live",
  }),
  resolveDelay: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 20, minimum: 1, step: 1 },
    label: "Resolve delay",
    tier: "identity",
    unit: "simulation frames",
    update: "restart",
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
    update: "restart",
  }),
  finalGradientDirection: logoEffectField.choice({
    label: "Final gradient direction",
    options: GRADIENT_DIRECTIONS,
    tier: "identity",
    update: "rebuild",
  }),
  rainChoreography: logoEffectField.group({
    fields: {
      columnDropChance: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.01 },
        label: "Column drop chance",
        tier: "identity",
        update: "restart",
      }),
      columnBatch: logoEffectField.range({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 16, minimum: 1, step: 1 },
        label: "New columns per wave",
        tier: "identity",
        update: "live",
      }),
      gradientSteps: logoEffectField.number({
        constraint: { integer: true, maximum: 64, minimum: 1 },
        editor: { maximum: 64, minimum: 1, step: 1 },
        label: "Rain gradient steps",
        tier: "advanced",
        update: "rebuild",
      }),
      minimumColumnLength: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.01 },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Minimum column length",
        tier: "identity",
        unit: "of column height",
        update: "restart",
      }),
      fullColumnHoldFrames: logoEffectField.range({
        constraint: { integer: true, minimum: 0 },
        editor: { maximum: 240, minimum: 0, step: 1 },
        label: "Full-column hold",
        tier: "advanced",
        unit: "simulation frames",
        update: "restart",
      }),
      tailColorCount: logoEffectField.number({
        constraint: { integer: true, maximum: 64, minimum: 1 },
        editor: { maximum: 64, minimum: 1, step: 1 },
        label: "Tail color count",
        tier: "advanced",
        update: "live",
      }),
      tailBrightness: logoEffectField.number({
        constraint: { maximum: 2, minimum: 0 },
        editor: { maximum: 2, minimum: 0, step: 0.05 },
        label: "Tail brightness",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Rain choreography",
    tier: "identity",
  }),
  fillChoreography: logoEffectField.group({
    fields: {
      fallDelayDivisor: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 16, minimum: 1, step: 1 },
        label: "Fall-delay divisor",
        tier: "identity",
        update: "restart",
      }),
    },
    label: "Fill choreography",
    tier: "advanced",
  }),
  resolveChoreography: logoEffectField.group({
    fields: {
      batch: logoEffectField.range({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 16, minimum: 1, step: 1 },
        label: "Characters per resolve",
        tier: "identity",
        update: "live",
      }),
      gradientSteps: logoEffectField.number({
        constraint: { integer: true, maximum: 64, minimum: 1 },
        editor: { maximum: 64, minimum: 1, step: 1 },
        label: "Resolve gradient steps",
        tier: "identity",
        update: "rebuild",
      }),
    },
    label: "Resolve choreography",
    tier: "identity",
  }),
});

type MatrixRuntimeValues = LogoEffectRuntimeValues<typeof matrixSchema>;

const MATRIX_DEFAULT_VALUES = {
  highlightColor: themeLogoColor("brightForeground", [192, 202, 245]),
  rainColorGradient: [
    themeLogoColor("green", [158, 206, 106]),
    themeLogoColor("brightGreen", [159, 224, 68]),
  ],
  rainSymbols: RAIN_SYMBOLS,
  rainFallDelayRange: [2, 15],
  rainColumnDelayRange: [3, 9],
  rainTime: 15,
  symbolSwapChance: 0.005,
  colorSwapChance: 0.001,
  resolveDelay: 3,
  finalGradientStops: [
    themeLogoColor("accent", [122, 162, 247]),
    themeLogoColor("green", [158, 206, 106]),
    themeLogoColor("brightGreen", [159, 224, 68]),
    themeLogoColor("cyan", [68, 157, 171]),
  ],
  finalGradientSteps: [12],
  finalGradientFrames: 3,
  finalGradientDirection: "radial",
  rainChoreography: {
    columnDropChance: MATRIX_SOURCE_CHOREOGRAPHY.columnDropChance,
    columnBatch: MATRIX_SOURCE_CHOREOGRAPHY.rainColumnBatch,
    gradientSteps: MATRIX_SOURCE_CHOREOGRAPHY.rainGradientSteps,
    minimumColumnLength: MATRIX_SOURCE_CHOREOGRAPHY.columnLengthFraction,
    fullColumnHoldFrames: MATRIX_SOURCE_CHOREOGRAPHY.fullColumnHoldFrames,
    tailColorCount: MATRIX_SOURCE_CHOREOGRAPHY.tailColorCount,
    tailBrightness: MATRIX_SOURCE_CHOREOGRAPHY.tailBrightness,
  },
  fillChoreography: {
    fallDelayDivisor: MATRIX_SOURCE_CHOREOGRAPHY.fillFallDelayDivisor,
  },
  resolveChoreography: {
    batch: MATRIX_SOURCE_CHOREOGRAPHY.resolveBatch,
    gradientSteps: MATRIX_SOURCE_CHOREOGRAPHY.finalResolveGradientSteps,
  },
} as const satisfies LogoEffectAuthorValues<typeof matrixSchema>;

const MATRIX_DEFAULTS = {
  playback: ONCE_LOGO_EFFECT_PLAYBACK,
  presentation: DEFAULT_LOGO_EFFECT_PRESENTATION,
  values: MATRIX_DEFAULT_VALUES,
} as const;

function colorsMatch(left: Rgb, right: Rgb) {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}

type MatrixPhase = "rain" | "fill" | "resolve";
type MatrixColumnPhase = Exclude<MatrixPhase, "resolve">;

type RainGlyph = {
  color: Rgb;
  displayRow: number;
  sourceRow: number;
  symbol: string;
};

type MatrixColumn = {
  activeFallDelay: number;
  baseFallDelay: number;
  column: number;
  dropChance: number;
  holdTime: number;
  length: number;
  pendingRows: number[];
  phase: MatrixColumnPhase;
  visible: RainGlyph[];
};

type MatrixSimulation = {
  complete: boolean;
  finalColors: readonly Rgb[];
  setValues: (values: MatrixRuntimeValues) => void;
  step: () => void;
  write: (writer: LogoEffectInstanceWriter) => void;
};

function createMatrixSimulation(
  cells: readonly LogoCell[],
  seed: number,
  initialValues: MatrixRuntimeValues
): MatrixSimulation {
  const random = new SeededRandom(seed);
  const positionToCellIndex = new Map(
    cells.map((cell) => [`${cell.column}:${cell.row}`, cell.index])
  );
  let values = initialValues;
  const finalBounds = boundsFromPoints(
    cells.map((cell) => ({ column: cell.column + 1, row: ROWS - cell.row }))
  );
  let rainSpectrum = buildGradient(values.rainColorGradient, [
    values.rainChoreography.gradientSteps,
  ]);
  let finalSpectrum = buildGradient(values.finalGradientStops, values.finalGradientSteps);
  let finalColors = cells.map((cell) =>
    colorAtGridPoint(
      finalSpectrum,
      { column: cell.column + 1, row: ROWS - cell.row },
      finalBounds,
      values.finalGradientDirection
    )
  );
  let finalResolveSpectrums = cells.map((_, index) =>
    buildGradient(
      [values.highlightColor, finalColors[index]],
      [values.resolveChoreography.gradientSteps]
    )
  );
  const resolvedAt = new Int32Array(cells.length).fill(-1);
  let phase: MatrixPhase = "rain";
  let tick = 0;
  let columnDelay = 0;
  let resolveDelay = values.resolveDelay;
  let rainComplete = false;
  let complete = false;
  let latestResolveEnd = 0;
  const pendingColumns: number[] = [];
  let activeColumns: number[] = [];
  let fullColumns = new Set<number>();

  const setupColumn = (column: MatrixColumn, nextPhase: MatrixColumnPhase) => {
    column.pendingRows = Array.from({ length: ROWS }, (_, row) => row);
    column.visible = [];
    column.phase = nextPhase;
    const range = values.rainFallDelayRange;
    column.baseFallDelay =
      nextPhase === "fill"
        ? random.integer(
            Math.max(Math.floor(range[0] / values.fillChoreography.fallDelayDivisor), 1),
            Math.max(Math.floor(range[1] / values.fillChoreography.fallDelayDivisor), 1)
          )
        : random.integer(range[0], range[1]);
    column.activeFallDelay = 0;
    column.length =
      nextPhase === "fill"
        ? ROWS
        : random.integer(
            Math.max(1, Math.floor(ROWS * values.rainChoreography.minimumColumnLength)),
            ROWS
          );
    column.holdTime =
      column.length === ROWS
        ? random.integer(
            values.rainChoreography.fullColumnHoldFrames[0],
            values.rainChoreography.fullColumnHoldFrames[1]
          )
        : 0;
  };

  const columns = Array.from({ length: COLUMNS }, (_, columnIndex): MatrixColumn => {
    const column: MatrixColumn = {
      activeFallDelay: 0,
      baseFallDelay: 0,
      column: columnIndex,
      dropChance: values.rainChoreography.columnDropChance,
      holdTime: 0,
      length: 0,
      pendingRows: [],
      phase: "rain",
      visible: [],
    };
    setupColumn(column, "rain");
    pendingColumns.push(columnIndex);
    return column;
  });
  random.shuffle(pendingColumns);

  const chooseRainColor = () => rainSpectrum[random.choiceIndex(rainSpectrum.length)];
  const trimColumn = (column: MatrixColumn) => {
    if (column.visible.length === 0) return;
    column.visible.shift();
    if (column.visible.length > 1) {
      const tail = rainSpectrum.slice(-values.rainChoreography.tailColorCount);
      const glyph = column.visible[0];
      glyph.color = adjustColorBrightness(
        tail[random.choiceIndex(tail.length)],
        values.rainChoreography.tailBrightness
      );
    }
  };

  const tickColumn = (column: MatrixColumn) => {
    if (column.activeFallDelay === 0) {
      const nextRow = column.pendingRows.shift();
      if (nextRow !== undefined) {
        const symbol = values.rainSymbols[random.choiceIndex(values.rainSymbols.length)];
        const previous = column.visible.at(-1);
        if (previous) {
          previous.color = chooseRainColor();
        }
        column.visible.push({
          color: values.highlightColor,
          displayRow: nextRow,
          sourceRow: nextRow,
          symbol,
        });
      } else if (column.visible.length > 0) {
        const last = column.visible.at(-1);
        if (last && colorsMatch(last.color, values.highlightColor)) {
          last.color = chooseRainColor();
        }
        if (column.holdTime !== 0) {
          column.holdTime -= 1;
        } else if (column.phase === "rain") {
          if (random.random() < column.dropChance) {
            for (const glyph of column.visible) glyph.displayRow += 1;
            column.visible = column.visible.filter((glyph) => glyph.displayRow < ROWS);
          }
          trimColumn(column);
        }
      }

      if (column.visible.length > column.length) trimColumn(column);
      column.activeFallDelay = column.baseFallDelay;
    } else {
      column.activeFallDelay -= 1;
    }

    for (const glyph of column.visible) {
      const nextSymbol =
        random.random() < values.symbolSwapChance
          ? values.rainSymbols[random.choiceIndex(values.rainSymbols.length)]
          : undefined;
      const nextColor = random.random() < values.colorSwapChance ? chooseRainColor() : undefined;
      if (nextSymbol !== undefined) glyph.symbol = nextSymbol;
      if (nextColor !== undefined) glyph.color = nextColor;
    }
  };

  // oxlint-disable-next-line eslint/complexity -- This state transition stays contiguous so it can be checked against the source-locked Matrix choreography.
  const step = () => {
    if (complete) return;

    if (phase === "rain" || phase === "fill") {
      if (columnDelay === 0) {
        if (phase === "rain") {
          const additions = random.integer(
            values.rainChoreography.columnBatch[0],
            values.rainChoreography.columnBatch[1]
          );
          for (let addition = 0; addition < additions; addition += 1) {
            const nextColumn = pendingColumns.shift();
            if (nextColumn !== undefined) activeColumns.push(nextColumn);
          }
        } else {
          activeColumns.push(...pendingColumns.splice(0));
        }
        columnDelay =
          phase === "rain"
            ? random.integer(values.rainColumnDelayRange[0], values.rainColumnDelayRange[1])
            : 1;
      } else {
        columnDelay -= 1;
      }

      for (const columnIndex of activeColumns) {
        const column = columns[columnIndex];
        tickColumn(column);
        if (column.pendingRows.length === 0) {
          if (column.phase === "fill" && !fullColumns.has(columnIndex)) {
            fullColumns.add(columnIndex);
          } else if (column.visible.length === 0) {
            setupColumn(column, phase);
            pendingColumns.push(columnIndex);
          }
        }
      }
      activeColumns = activeColumns.filter(
        (columnIndex) => columns[columnIndex].visible.length > 0
      );

      if (
        phase === "fill" &&
        pendingColumns.length === 0 &&
        activeColumns.every(
          (columnIndex) =>
            columns[columnIndex].pendingRows.length === 0 && columns[columnIndex].phase === "fill"
        )
      ) {
        phase = "resolve";
        activeColumns = [];
      }

      if (
        phase === "rain" &&
        tick / MATRIX_SOURCE_CHOREOGRAPHY.simulationRateHz > values.rainTime
      ) {
        rainComplete = true;
        phase = "fill";
        for (const columnIndex of activeColumns) {
          columns[columnIndex].holdTime = 0;
          columns[columnIndex].dropChance = 1;
        }
        for (const columnIndex of pendingColumns) setupColumn(columns[columnIndex], "fill");
      }
    } else {
      for (const columnIndex of fullColumns) {
        const column = columns[columnIndex];
        tickColumn(column);
        if (column.visible.length > 0) {
          if (resolveDelay === 0) {
            const batch = random.integer(
              values.resolveChoreography.batch[0],
              values.resolveChoreography.batch[1]
            );
            for (let resolved = 0; resolved < batch && column.visible.length > 0; resolved += 1) {
              const glyph = column.visible.splice(
                random.integer(0, column.visible.length - 1),
                1
              )[0];
              const cellIndex = positionToCellIndex.get(`${column.column}:${glyph.sourceRow}`);
              if (cellIndex !== undefined) {
                resolvedAt[cellIndex] = tick;
                const sceneLength =
                  finalResolveSpectrums[cellIndex].length * values.finalGradientFrames;
                latestResolveEnd = Math.max(latestResolveEnd, tick + sceneLength);
              }
            }
            resolveDelay = values.resolveDelay;
          } else {
            resolveDelay -= 1;
          }
        }
      }
      fullColumns = new Set(
        [...fullColumns].filter((columnIndex) => columns[columnIndex].visible.length > 0)
      );
    }

    tick += 1;
    if (
      rainComplete &&
      pendingColumns.length === 0 &&
      activeColumns.length === 0 &&
      fullColumns.size === 0 &&
      tick > latestResolveEnd
    ) {
      complete = true;
    }
  };

  const write = (writer: LogoEffectInstanceWriter) => {
    for (const column of columns) {
      for (const glyph of column.visible) {
        writer.push(
          {
            color: glyph.color,
            column: column.column,
            glyph: glyph.symbol,
            row: glyph.displayRow,
          },
          "transition"
        );
      }
    }

    for (const cell of cells) {
      const resolvedTick = resolvedAt[cell.index];
      if (resolvedTick < 0) continue;
      const age = Math.max(0, tick - resolvedTick - 1);
      const colorIndex = Math.floor(age / values.finalGradientFrames);
      const spectrum = finalResolveSpectrums[cell.index];
      const final = colorIndex >= spectrum.length;
      writer.push(
        {
          color: final ? finalColors[cell.index] : spectrum[colorIndex],
          column: cell.column,
          glyph: cell.glyph,
          row: cell.row,
        },
        final ? "finalText" : "transition"
      );
    }
  };

  const simulation: MatrixSimulation = {
    get complete() {
      return complete;
    },
    get finalColors() {
      return finalColors;
    },
    setValues(nextValues) {
      values = nextValues;
      rainSpectrum = buildGradient(values.rainColorGradient, [
        values.rainChoreography.gradientSteps,
      ]);
      finalSpectrum = buildGradient(values.finalGradientStops, values.finalGradientSteps);
      finalColors = cells.map((cell) =>
        colorAtGridPoint(
          finalSpectrum,
          { column: cell.column + 1, row: ROWS - cell.row },
          finalBounds,
          values.finalGradientDirection
        )
      );
      finalResolveSpectrums = cells.map((_, index) =>
        buildGradient(
          [values.highlightColor, finalColors[index]],
          [values.resolveChoreography.gradientSteps]
        )
      );
    },
    step,
    write,
  };
  return simulation;
}

function createMatrixRuntime(
  { cells, seed }: LogoEffectContext,
  initialValues: MatrixRuntimeValues
): LogoEffectAuthorRuntime<MatrixRuntimeValues> {
  let values = initialValues;
  let simulation = createMatrixSimulation(cells, seed, values);
  let fractionalTicks = 0;
  let forcedSettled = false;

  return {
    configure(nextValues) {
      values = nextValues;
      simulation.setValues(nextValues);
    },
    instanceCapacity: COLUMNS * ROWS,
    pointerEnabled() {
      return false;
    },
    reset() {
      simulation = createMatrixSimulation(cells, seed, values);
      fractionalTicks = 0;
      forcedSettled = false;
    },
    settle() {
      forcedSettled = true;
    },
    get status() {
      return forcedSettled || simulation.complete ? "settled" : "revealing";
    },
    step({ deltaTicks }) {
      if (forcedSettled || simulation.complete || deltaTicks <= 0) return;
      fractionalTicks += deltaTicks;
      const wholeTicks = Math.floor(fractionalTicks);
      fractionalTicks -= wholeTicks;
      for (let elapsed = 0; elapsed < wholeTicks && !simulation.complete; elapsed += 1) {
        simulation.step();
      }
    },
    usesPointer: false,
    writeInstances(writer) {
      if (forcedSettled) {
        for (const cell of cells) {
          writer.push(
            {
              color: simulation.finalColors[cell.index],
              column: cell.column,
              glyph: cell.glyph,
              row: cell.row,
            },
            "finalText"
          );
        }
        return;
      }
      simulation.write(writer);
    },
  };
}

export const logoEffect = defineLogoEffect({
  createRuntime(context, values) {
    return createMatrixRuntime(context, values);
  },
  id: "matrix",
  label: "Matrix",
  defaults: MATRIX_DEFAULTS,
  schema: matrixSchema,
  source: MATRIX_SOURCE,
});
