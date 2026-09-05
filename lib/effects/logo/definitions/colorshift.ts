import type { Rgb } from "@/lib/color";
import { themeLogoColor } from "@/lib/effects/logo/color-bindings";
import {
  DEFAULT_LOGO_EFFECT_PLAYBACK,
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  LOGO_GRADIENT_DIRECTIONS as GRADIENT_DIRECTIONS,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import {
  OMARCHY_MARK_COLUMNS as COLUMNS,
  OMARCHY_MARK_ROWS as ROWS,
} from "@/lib/effects/logo/mark";
import { mixColor } from "@/lib/effects/logo/runtime/color";
import {
  boundsFromPoints,
  buildGradient,
  colorAtGridPoint,
  normalizedDistanceFromCenter,
  type GridBounds,
} from "@/lib/effects/logo/runtime/graphics";
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

const COLORSHIFT_SOURCE_PATH = "src/effects/colorshift.rs";

const COLORSHIFT_UPSTREAM = {
  command: "colorshift",
  sourcePath: COLORSHIFT_SOURCE_PATH,
  ...createTtfxSourceReference("colorshift", COLORSHIFT_SOURCE_PATH),
} as const;

const COLORSHIFT_SOURCE_CHOREOGRAPHY = {
  finalTransitionSteps: 8,
} as const;

const colorShiftSchema = defineLogoEffectSchema({
  gradientStops: logoEffectField.colors({
    constraint: { maximumItems: 12, minimumItems: 1 },
    label: "Gradient stops",
    tier: "identity",
    update: "rebuild",
  }),
  gradientSteps: logoEffectField.numberList({
    constraint: { maximumItems: 12, minimumItems: 1 },
    itemConstraint: { integer: true, maximum: 64, minimum: 1 },
    label: "Gradient steps",
    tier: "identity",
    update: "rebuild",
  }),
  gradientFrames: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 20, minimum: 1, step: 1 },
    label: "Gradient frames",
    tier: "identity",
    unit: "simulation frames per color",
    update: "rebuild",
  }),
  noTravel: logoEffectField.boolean({
    label: "Disable travel",
    tier: "identity",
    update: "rebuild",
  }),
  travelDirection: logoEffectField.choice({
    label: "Travel direction",
    options: GRADIENT_DIRECTIONS,
    tier: "identity",
    update: "rebuild",
    visibleWhen: { equals: false, field: "noTravel" },
  }),
  reverseTravelDirection: logoEffectField.boolean({
    label: "Reverse travel direction",
    tier: "identity",
    update: "rebuild",
    visibleWhen: { equals: false, field: "noTravel" },
  }),
  noLoop: logoEffectField.boolean({
    description: "Leaves the gradient spectrum open instead of joining its last stop to its first.",
    label: "Disable spectrum loop",
    tier: "identity",
    update: "rebuild",
  }),
  cycles: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    description:
      "TTFX also treats zero as an infinite internal loop, but its public command accepts positive values only.",
    editor: { maximum: 12, minimum: 1, step: 1 },
    label: "Cycles",
    tier: "identity",
    update: "restart",
  }),
  skipFinalGradient: logoEffectField.boolean({
    label: "Skip final gradient",
    tier: "identity",
    update: "rebuild",
  }),
  finalGradientStops: logoEffectField.colors({
    constraint: { maximumItems: 12, minimumItems: 1 },
    label: "Final gradient stops",
    tier: "identity",
    update: "rebuild",
  }),
  finalGradientSteps: logoEffectField.numberList({
    constraint: { maximumItems: 12, minimumItems: 1 },
    itemConstraint: { integer: true, maximum: 64, minimum: 1 },
    label: "Final gradient steps",
    tier: "identity",
    update: "rebuild",
  }),
  finalTransitionSteps: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    description:
      "Number of colors used to settle from the traveling spectrum into the final gradient.",
    editor: { maximum: 64, minimum: 1, step: 1 },
    label: "Final transition steps",
    tier: "advanced",
    update: "rebuild",
    visibleWhen: { equals: false, field: "skipFinalGradient" },
  }),
  finalGradientDirection: logoEffectField.choice({
    label: "Final gradient direction",
    options: GRADIENT_DIRECTIONS,
    tier: "identity",
    update: "rebuild",
  }),
  idle: logoEffectField.group({
    fields: {
      cycleMs: logoEffectField.number({
        constraint: { minimum: 1_000 },
        editor: { maximum: 20_000, minimum: 1_000, step: 250 },
        label: "Cycle",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      travelFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Travel",
        tier: "identity",
        update: "live",
      }),
      colorMix: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Color mix",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Idle",
    tier: "identity",
  }),
});

type ColorShiftRuntimeValues = LogoEffectRuntimeValues<typeof colorShiftSchema>;

const COLORSHIFT_DEFAULT_VALUES = {
  gradientStops: [
    themeLogoColor("orange", [255, 158, 100]),
    themeLogoColor("yellow", [224, 175, 104]),
    themeLogoColor("green", [158, 206, 106]),
    themeLogoColor("cyan", [68, 157, 171]),
    themeLogoColor("accent", [122, 162, 247]),
    themeLogoColor("brightForeground", [192, 202, 245]),
  ],
  gradientSteps: [12],
  gradientFrames: 2,
  noTravel: false,
  travelDirection: "radial",
  reverseTravelDirection: false,
  noLoop: false,
  cycles: 3,
  skipFinalGradient: false,
  finalGradientStops: [
    themeLogoColor("accent", [122, 162, 247]),
    themeLogoColor("green", [158, 206, 106]),
    themeLogoColor("brightGreen", [159, 224, 68]),
    themeLogoColor("cyan", [68, 157, 171]),
  ],
  finalGradientSteps: [12],
  finalTransitionSteps: COLORSHIFT_SOURCE_CHOREOGRAPHY.finalTransitionSteps,
  finalGradientDirection: "vertical",
  idle: {
    cycleMs: 8_000,
    travelFraction: 0.35,
    colorMix: 0.22,
  },
} as const satisfies LogoEffectAuthorValues<typeof colorShiftSchema>;

const COLORSHIFT_DEFAULTS = {
  playback: DEFAULT_LOGO_EFFECT_PLAYBACK,
  presentation: DEFAULT_LOGO_EFFECT_PRESENTATION,
  values: COLORSHIFT_DEFAULT_VALUES,
} as const;

function originalTravelFraction(
  cell: LogoCell,
  direction: ColorShiftRuntimeValues["travelDirection"],
  textBounds: GridBounds
) {
  const sourceColumn = cell.column + 1;
  const sourceRow = ROWS - cell.row;

  switch (direction) {
    case "horizontal":
      return sourceColumn / COLUMNS;
    case "vertical":
      return sourceRow / ROWS;
    case "diagonal":
      return (sourceRow + sourceColumn) / (ROWS + COLUMNS);
    case "radial":
      return normalizedDistanceFromCenter({ column: sourceColumn, row: sourceRow }, textBounds);
    default:
      return unreachable(direction);
  }
}

function rotateSpectrum(spectrum: readonly Rgb[], fraction: number, reverse: boolean) {
  let shiftDistance = Math.trunc(spectrum.length * fraction);
  if (reverse) shiftDistance *= -1;
  const split =
    shiftDistance < 0
      ? Math.max(0, spectrum.length + shiftDistance)
      : Math.min(spectrum.length, shiftDistance);
  return [...spectrum.slice(split), ...spectrum.slice(0, split)];
}

function createColorshiftRuntime(
  { cells }: LogoEffectContext,
  initialValues: ColorShiftRuntimeValues
) {
  let values = initialValues;
  const gradientSpectrum = buildGradient(
    values.gradientStops,
    values.gradientSteps,
    !values.noLoop
  );
  const finalSpectrum = buildGradient(values.finalGradientStops, values.finalGradientSteps);
  const textBounds = boundsFromPoints(
    cells.map((cell) => ({ column: cell.column + 1, row: ROWS - cell.row }))
  );
  const cellScenes = cells.map((cell) => {
    const colors = values.noTravel
      ? gradientSpectrum
      : rotateSpectrum(
          gradientSpectrum,
          originalTravelFraction(cell, values.travelDirection, textBounds),
          values.reverseTravelDirection
        );
    const lastColor = colors.at(-1) ?? colors[0];
    const finalColor = colorAtGridPoint(
      finalSpectrum,
      { column: cell.column + 1, row: ROWS - cell.row },
      textBounds,
      values.finalGradientDirection
    );
    const travelFraction = originalTravelFraction(cell, values.travelDirection, textBounds);
    return {
      colors,
      finalColor,
      settledColor: values.skipFinalGradient ? (colors.at(-1) ?? colors[0]) : finalColor,
      finalTransition: buildGradient([lastColor, finalColor], [values.finalTransitionSteps]),
      travelFraction,
    };
  });
  const gradientSceneTicks = gradientSpectrum.length * values.gradientFrames;
  const gradientTicks = gradientSceneTicks * values.cycles;
  const finalTransitionTicks = (cellScenes[0]?.finalTransition.length ?? 0) * values.gradientFrames;
  const revealTicks = gradientTicks + (values.skipFinalGradient ? 0 : finalTransitionTicks);

  const runtime = createSampledLogoEffectRuntime(cells, values, {
    revealDurationMs: revealTicks * LOGO_EFFECT_TICK_MS,
    usesIdle: true,
    sample(cell, frame) {
      const scene = cellScenes[cell.index];
      const elapsedTick = Math.floor(frame.revealMs / LOGO_EFFECT_TICK_MS + 1e-7);
      if (elapsedTick < gradientTicks) {
        const sceneTick = elapsedTick % gradientSceneTicks;
        const colorIndex = Math.floor(sceneTick / values.gradientFrames);
        return {
          channel: "transition",
          color: scene.colors[colorIndex],
          glyph: cell.glyph,
        };
      }

      if (values.skipFinalGradient) {
        return {
          channel: "finalText",
          color: scene.colors.at(-1) ?? scene.colors[0],
          glyph: cell.glyph,
        };
      }

      const finalIndex = Math.floor((elapsedTick - gradientTicks) / values.gradientFrames);
      if (finalIndex < scene.finalTransition.length) {
        return {
          channel: "transition",
          color: scene.finalTransition[finalIndex],
          glyph: cell.glyph,
        };
      }

      const idleProgress = (frame.idleMs % values.idle.cycleMs) / values.idle.cycleMs;
      const idleColorIndex = Math.floor(
        ((idleProgress + scene.travelFraction * values.idle.travelFraction) % 1) *
          scene.colors.length
      );
      const idleStrength = Math.sin(Math.PI * idleProgress) ** 2 * values.idle.colorMix;
      return {
        channel: "finalText",
        color: mixColor(scene.settledColor, scene.colors[idleColorIndex], idleStrength),
        glyph: cell.glyph,
        glow: idleStrength,
      };
    },
  });

  return bindLogoEffectAuthorRuntime<ColorShiftRuntimeValues>(runtime, (nextValues) => {
    values = nextValues;
  });
}

export const logoEffect = defineLogoEffect({
  createRuntime(context, values) {
    return createColorshiftRuntime(context, values);
  },
  id: "colorshift",
  label: "Color Shift",
  defaults: COLORSHIFT_DEFAULTS,
  schema: colorShiftSchema,
  source: createTtfxSourceReference(COLORSHIFT_UPSTREAM.command, COLORSHIFT_SOURCE_PATH),
});
