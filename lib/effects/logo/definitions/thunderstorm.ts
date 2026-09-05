import type { Rgb } from "@/lib/color";
import { themeLogoColor } from "@/lib/effects/logo/color-bindings";
import {
  DEFAULT_LOGO_EFFECT_PRESENTATION,
  LOGO_GRADIENT_DIRECTIONS as GRADIENT_DIRECTIONS,
  ONCE_LOGO_EFFECT_PLAYBACK,
} from "@/lib/effects/logo/defaults";
import { defineLogoEffect } from "@/lib/effects/logo/definition";
import {
  OMARCHY_MARK_COLUMNS as COLUMNS,
  OMARCHY_MARK_ROWS as ROWS,
} from "@/lib/effects/logo/mark";
import {
  adjustColorBrightness,
  boundsFromPoints,
  buildGradient,
  colorAtGridPoint,
  lineLength,
  pointOnLine,
  pointOnQuadraticBezier,
  quadraticBezierLength,
  roundHalfEven,
} from "@/lib/effects/logo/runtime/graphics";
import { SeededRandom } from "@/lib/effects/logo/runtime/random";
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
import type {
  GlyphParticle,
  LogoCell,
  LogoEffectContext,
  LogoPoint,
} from "@/lib/effects/logo/types";

const THUNDERSTORM_SOURCE_PATH = "src/effects/thunderstorm.rs";
const thunderstormSource = createTtfxSourceReference("thunderstorm", THUNDERSTORM_SOURCE_PATH);

const THUNDERSTORM_SOURCE_CHOREOGRAPHY = {
  lightningBranchChance: 0.05,
  lightningBranchChanceStep: 0.01,
  lightningFadeColorFrames: 2,
  lightningFadeGradientSteps: 6,
  lightningFlashBrightness: 1.7,
  lightningFlashColorFrames: 6,
  lightningFlashGradientSteps: 7,
  lightningProgressionDelayFrames: 1,
  lightningProgressionRange: [1, 3] as const,
  lightningTriggerChance: 0.008,
  rainDelayRange: [1, 7] as const,
  rainEmissionRange: [1, 6] as const,
  rainPoolPreallocation: 50,
  rainSpeedRange: [0.5, 1.5] as const,
  sparkCountRange: [12, 18] as const,
  sparkGradientSteps: 7,
  sparkHoldFrames: 30,
  sparkOffsetRange: [4, 20] as const,
  sparkPoolMaximum: 2000,
  sparkPoolPreallocation: 200,
  sparkSpeedRange: [0.1, 0.25] as const,
  stormTextBrightness: 0.5,
  strikePoolPreallocation: 200,
  textFadeColorFrames: 12,
  textFadeGradientSteps: 7,
  textGlowGradientSteps: 7,
} as const;

const thunderstormSchema = defineLogoEffectSchema({
  backgroundColor: logoEffectField.color({
    label: "Storm background",
    tier: "advanced",
    update: "rebuild",
  }),
  rainColor: logoEffectField.color({
    label: "Rain color",
    tier: "identity",
    update: "rebuild",
  }),
  lightningColor: logoEffectField.color({
    label: "Lightning color",
    tier: "identity",
    update: "rebuild",
  }),
  glowingTextColor: logoEffectField.color({
    label: "Glowing text color",
    tier: "identity",
    update: "rebuild",
  }),
  textGlowTime: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 30, minimum: 1, step: 1 },
    label: "Text glow time",
    tier: "identity",
    unit: "simulation frames per color",
    update: "rebuild",
  }),
  raindropSymbols: logoEffectField.symbols({
    constraint: { maximumItems: 16, minimumItems: 1 },
    label: "Raindrop symbols",
    tier: "identity",
    update: "rebuild",
  }),
  sparkSymbols: logoEffectField.symbols({
    constraint: { maximumItems: 16, minimumItems: 1 },
    label: "Spark symbols",
    tier: "identity",
    update: "rebuild",
  }),
  sparkGlowColor: logoEffectField.color({
    label: "Spark glow color",
    tier: "identity",
    update: "rebuild",
  }),
  sparkGlowTime: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 40, minimum: 1, step: 1 },
    label: "Spark glow time",
    tier: "identity",
    unit: "simulation frames per color",
    update: "rebuild",
  }),
  stormTime: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 30, minimum: 1, step: 1 },
    label: "Storm time",
    tier: "identity",
    unit: "seconds",
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
    description:
      "Preserved for TTFX configuration round trips. Pinned Thunderstorm declares this flag but never reads it.",
    editor: { maximum: 30, minimum: 1, step: 1 },
    label: "Final gradient frames",
    tier: "advanced",
    unit: "simulation frames",
    update: "source-metadata",
  }),
  finalGradientDirection: logoEffectField.choice({
    label: "Final gradient direction",
    options: GRADIENT_DIRECTIONS,
    tier: "identity",
    update: "rebuild",
  }),
  rain: logoEffectField.group({
    fields: {
      delayFrames: logoEffectField.range({
        constraint: { integer: true, minimum: 0 },
        editor: { maximum: 30, minimum: 0, step: 1 },
        label: "Delay between emissions",
        tier: "advanced",
        unit: "simulation frames",
        update: "restart",
      }),
      emissionCount: logoEffectField.range({
        constraint: { integer: true, minimum: 0 },
        editor: { maximum: 24, minimum: 0, step: 1 },
        label: "Drops per emission",
        tier: "advanced",
        update: "restart",
      }),
      speed: logoEffectField.range({
        constraint: { minimum: Number.MIN_VALUE },
        editor: { maximum: 3, minimum: 0.05, step: 0.05 },
        label: "Fall speed",
        tier: "identity",
        update: "restart",
      }),
    },
    label: "Rain motion",
    tier: "identity",
  }),
  lightning: logoEffectField.group({
    fields: {
      symbols: logoEffectField.symbols({
        constraint: { maximumItems: 16, minimumItems: 1 },
        label: "Lightning symbols",
        tier: "identity",
        update: "rebuild",
      }),
      triggerChance: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 0.1, minimum: 0, step: 0.001 },
        label: "Strike chance",
        tier: "identity",
        unit: "per simulation frame",
        update: "restart",
      }),
      branchChance: logoEffectField.number({
        constraint: { maximum: 0.1, minimum: 0 },
        editor: { maximum: 0.1, minimum: 0, step: 0.005 },
        label: "Branch chance",
        tier: "identity",
        update: "restart",
      }),
      branchChanceStep: logoEffectField.number({
        constraint: { maximum: 0.1, minimum: Number.MIN_VALUE },
        editor: { maximum: 0.1, minimum: 0.001, step: 0.001 },
        label: "Branch chance decay",
        tier: "advanced",
        unit: "per branch",
        update: "restart",
      }),
      progressionCount: logoEffectField.range({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 12, minimum: 1, step: 1 },
        label: "Segments per step",
        tier: "identity",
        update: "restart",
      }),
      progressionDelayFrames: logoEffectField.number({
        constraint: { integer: true, minimum: 0 },
        editor: { maximum: 12, minimum: 0, step: 1 },
        label: "Progression delay",
        tier: "identity",
        unit: "simulation frames",
        update: "restart",
      }),
      flash: logoEffectField.group({
        fields: {
          brightness: logoEffectField.number({
            constraint: { minimum: 0 },
            editor: { maximum: 3, minimum: 0, step: 0.05 },
            label: "Brightness",
            tier: "identity",
            update: "rebuild",
          }),
          colorFrames: logoEffectField.number({
            constraint: { integer: true, minimum: 1 },
            editor: { maximum: 30, minimum: 1, step: 1 },
            label: "Color hold",
            tier: "advanced",
            unit: "simulation frames per color",
            update: "rebuild",
          }),
          gradientSteps: logoEffectField.number({
            constraint: { integer: true, minimum: 1 },
            editor: { maximum: 32, minimum: 1, step: 1 },
            label: "Gradient steps",
            tier: "advanced",
            update: "rebuild",
          }),
        },
        label: "Flash",
        tier: "identity",
      }),
      fade: logoEffectField.group({
        fields: {
          colorFrames: logoEffectField.number({
            constraint: { integer: true, minimum: 1 },
            editor: { maximum: 30, minimum: 1, step: 1 },
            label: "Color hold",
            tier: "advanced",
            unit: "simulation frames per color",
            update: "rebuild",
          }),
          gradientSteps: logoEffectField.number({
            constraint: { integer: true, minimum: 1 },
            editor: { maximum: 32, minimum: 1, step: 1 },
            label: "Gradient steps",
            tier: "advanced",
            update: "rebuild",
          }),
        },
        label: "Fade",
        tier: "identity",
      }),
    },
    label: "Lightning",
    tier: "identity",
  }),
  sparks: logoEffectField.group({
    fields: {
      count: logoEffectField.range({
        constraint: { integer: true, minimum: 0 },
        editor: { maximum: 64, minimum: 0, step: 1 },
        label: "Sparks per impact",
        tier: "identity",
        update: "restart",
      }),
      offset: logoEffectField.range({
        constraint: { integer: true, minimum: 0 },
        editor: { maximum: 40, minimum: 0, step: 1 },
        label: "Horizontal offset",
        tier: "identity",
        unit: "grid columns",
        update: "restart",
      }),
      speed: logoEffectField.range({
        constraint: { minimum: Number.MIN_VALUE },
        editor: { maximum: 1, minimum: 0.01, step: 0.01 },
        label: "Travel speed",
        tier: "identity",
        update: "restart",
      }),
      holdFrames: logoEffectField.number({
        constraint: { integer: true, minimum: 0 },
        editor: { maximum: 120, minimum: 0, step: 1 },
        label: "Endpoint hold",
        tier: "advanced",
        unit: "simulation frames",
        update: "restart",
      }),
      gradientSteps: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 32, minimum: 1, step: 1 },
        label: "Glow gradient steps",
        tier: "advanced",
        update: "rebuild",
      }),
    },
    label: "Impact sparks",
    tier: "identity",
  }),
  text: logoEffectField.group({
    fields: {
      stormBrightness: logoEffectField.number({
        constraint: { minimum: 0 },
        editor: { maximum: 2, minimum: 0, step: 0.05 },
        label: "Storm brightness",
        tier: "identity",
        update: "rebuild",
      }),
      glowGradientSteps: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 32, minimum: 1, step: 1 },
        label: "Afterglow gradient steps",
        tier: "advanced",
        update: "rebuild",
      }),
      fadeColorFrames: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 60, minimum: 1, step: 1 },
        label: "Fade color hold",
        tier: "advanced",
        unit: "simulation frames per color",
        update: "rebuild",
      }),
      fadeGradientSteps: logoEffectField.number({
        constraint: { integer: true, minimum: 1 },
        editor: { maximum: 32, minimum: 1, step: 1 },
        label: "Fade gradient steps",
        tier: "advanced",
        update: "rebuild",
      }),
    },
    label: "Storm text",
    tier: "identity",
  }),
});

type ThunderstormRuntimeValues = LogoEffectRuntimeValues<typeof thunderstormSchema>;

const THUNDERSTORM_DEFAULT_VALUES = {
  backgroundColor: themeLogoColor("darkerBackground", [0, 0, 0]),
  rainColor: themeLogoColor("brightBlue", [170, 170, 255]),
  lightningColor: themeLogoColor("brightBlue", [104, 163, 232]),
  glowingTextColor: themeLogoColor("orange", [239, 84, 17]),
  textGlowTime: 6,
  raindropSymbols: ["\\", ".", ","],
  sparkSymbols: ["*", ".", "'"],
  sparkGlowColor: themeLogoColor("orange", [255, 77, 0]),
  sparkGlowTime: 18,
  stormTime: 12,
  finalGradientStops: [
    themeLogoColor("magenta", [138, 0, 138]),
    themeLogoColor("cyan", [0, 209, 255]),
    themeLogoColor("brightForeground", [255, 255, 255]),
  ],
  finalGradientSteps: [12],
  finalGradientFrames: 3,
  finalGradientDirection: "vertical",
  rain: {
    delayFrames: THUNDERSTORM_SOURCE_CHOREOGRAPHY.rainDelayRange,
    emissionCount: THUNDERSTORM_SOURCE_CHOREOGRAPHY.rainEmissionRange,
    speed: THUNDERSTORM_SOURCE_CHOREOGRAPHY.rainSpeedRange,
  },
  lightning: {
    symbols: ["\\", "/", "|"],
    triggerChance: THUNDERSTORM_SOURCE_CHOREOGRAPHY.lightningTriggerChance,
    branchChance: THUNDERSTORM_SOURCE_CHOREOGRAPHY.lightningBranchChance,
    branchChanceStep: THUNDERSTORM_SOURCE_CHOREOGRAPHY.lightningBranchChanceStep,
    progressionCount: THUNDERSTORM_SOURCE_CHOREOGRAPHY.lightningProgressionRange,
    progressionDelayFrames: THUNDERSTORM_SOURCE_CHOREOGRAPHY.lightningProgressionDelayFrames,
    flash: {
      brightness: THUNDERSTORM_SOURCE_CHOREOGRAPHY.lightningFlashBrightness,
      colorFrames: THUNDERSTORM_SOURCE_CHOREOGRAPHY.lightningFlashColorFrames,
      gradientSteps: THUNDERSTORM_SOURCE_CHOREOGRAPHY.lightningFlashGradientSteps,
    },
    fade: {
      colorFrames: THUNDERSTORM_SOURCE_CHOREOGRAPHY.lightningFadeColorFrames,
      gradientSteps: THUNDERSTORM_SOURCE_CHOREOGRAPHY.lightningFadeGradientSteps,
    },
  },
  sparks: {
    count: THUNDERSTORM_SOURCE_CHOREOGRAPHY.sparkCountRange,
    offset: THUNDERSTORM_SOURCE_CHOREOGRAPHY.sparkOffsetRange,
    speed: THUNDERSTORM_SOURCE_CHOREOGRAPHY.sparkSpeedRange,
    holdFrames: THUNDERSTORM_SOURCE_CHOREOGRAPHY.sparkHoldFrames,
    gradientSteps: THUNDERSTORM_SOURCE_CHOREOGRAPHY.sparkGradientSteps,
  },
  text: {
    stormBrightness: THUNDERSTORM_SOURCE_CHOREOGRAPHY.stormTextBrightness,
    glowGradientSteps: THUNDERSTORM_SOURCE_CHOREOGRAPHY.textGlowGradientSteps,
    fadeColorFrames: THUNDERSTORM_SOURCE_CHOREOGRAPHY.textFadeColorFrames,
    fadeGradientSteps: THUNDERSTORM_SOURCE_CHOREOGRAPHY.textFadeGradientSteps,
  },
} as const satisfies LogoEffectAuthorValues<typeof thunderstormSchema>;

const THUNDERSTORM_DEFAULTS = {
  playback: ONCE_LOGO_EFFECT_PLAYBACK,
  presentation: DEFAULT_LOGO_EFFECT_PRESENTATION,
  values: THUNDERSTORM_DEFAULT_VALUES,
} as const;

function cubicBezierEasing(y1: number, y2: number, progress: number) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  let parameter = progress;
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const inverse = 1 - parameter;
    const estimatedX = 3 * inverse * parameter ** 2 + parameter ** 3;
    const difference = estimatedX - progress;
    if (Math.abs(difference) < 1e-5) break;
    const derivative = 6 * inverse * parameter;
    if (Math.abs(derivative) < 1e-6) break;
    parameter -= difference / derivative;
  }
  const inverse = 1 - parameter;
  return 3 * y1 * inverse ** 2 * parameter + 3 * y2 * inverse * parameter ** 2 + parameter ** 3;
}

function sourcePointToParticle(point: LogoPoint) {
  return { column: point.column - 1, row: ROWS - point.row };
}

type PoolParticle = {
  glyph: string;
  id: number;
};

type RainEvent = {
  endTick: number;
  glyph: string;
  maximumSteps: number;
  particleId: number;
  start: LogoPoint;
  startTick: number;
  target: LogoPoint;
};

type SparkEvent = {
  control: LogoPoint;
  endTick: number;
  glyph: string;
  maximumSteps: number;
  particleId: number;
  start: LogoPoint;
  startTick: number;
  target: LogoPoint;
};

type StrikeSegment = {
  activatedAtTick: number;
  glyph: string;
  point: LogoPoint;
};

type Strike = {
  easeY2: number;
  flashStartTick: number;
  segments: StrikeSegment[];
};

type TextGlow = {
  endTick: number;
  sceneAge: number;
  startTick: number;
};

type ThunderstormTiming = {
  sparkGlowTicks: number;
  strikeFadeTicks: number;
  strikeFlashTicks: number;
  textFadeTicks: number;
  textFlashTicks: number;
  textGlowTicks: number;
};

type ThunderstormSchedule = {
  glowsByCell: readonly TextGlow[][];
  postStormStartTick: number;
  rain: readonly RainEvent[];
  revealTicks: number;
  sparks: readonly SparkEvent[];
  stormStartTick: number;
  strikes: readonly Strike[];
};

function createTextGlowActivationList(): number[] {
  return [];
}

function buildTextGlows(
  activationTicksByCell: readonly number[][],
  strikes: readonly Strike[],
  timing: ThunderstormTiming
) {
  const flashStarts = strikes.map((strike) => strike.flashStartTick);
  return activationTicksByCell.map((activationTicks) => {
    const glows: TextGlow[] = [];
    let sceneAge = 0;

    for (const startTick of activationTicks) {
      const interruptTick = flashStarts.find((flashStart) => flashStart > startTick);
      const remainingTicks = timing.textGlowTicks - sceneAge;
      const completionTick = startTick + remainingTicks;
      const interrupted = interruptTick !== undefined && interruptTick <= completionTick;
      glows.push({
        endTick: interrupted ? interruptTick : completionTick + 1,
        sceneAge,
        startTick,
      });

      if (interrupted) {
        sceneAge += Math.max(0, interruptTick - startTick - 1);
      } else {
        sceneAge = 0;
      }
    }

    return glows;
  });
}

function preallocatePool(
  symbols: readonly string[],
  count: number,
  random: SeededRandom
): PoolParticle[] {
  return Array.from({ length: count }, (_, id) => ({
    glyph: symbols[random.choiceIndex(symbols.length)],
    id,
  }));
}

function releasePool(
  releases: Map<number, PoolParticle[]>,
  available: PoolParticle[],
  tick: number
) {
  const released = releases.get(tick);
  if (!released) return;
  released
    .toSorted((left, right) => left.id - right.id)
    .forEach((particle) => available.push(particle));
  releases.delete(tick);
}

function schedulePoolRelease(
  releases: Map<number, PoolParticle[]>,
  particle: PoolParticle,
  tick: number
) {
  const bucket = releases.get(tick);
  if (bucket) bucket.push(particle);
  else releases.set(tick, [particle]);
}

function acquirePoolParticle(
  available: PoolParticle[],
  symbols: readonly string[],
  random: SeededRandom,
  nextId: () => number
) {
  return (
    available.pop() ?? {
      glyph: symbols[random.choiceIndex(symbols.length)],
      id: nextId(),
    }
  );
}

function setupStrike(random: SeededRandom, lightning: ThunderstormRuntimeValues["lightning"]) {
  const segments: StrikeSegment[] = [];
  let branchChance = lightning.branchChance;

  const setupBranch = (branchNeighbor: StrikeSegment | undefined) => {
    let neighbor = branchNeighbor;
    let column = neighbor?.point.column ?? random.integer(1, COLUMNS);
    let row = neighbor?.point.row ?? ROWS;

    while (row >= 1) {
      let glyph: string;
      if (neighbor) {
        // Pinned TTFX checks input_symbol here. Every strike-pool character was
        // created as "|", so its slash-specific arms are intentionally unreachable.
        const horizontalStep = random.choiceIndex(2) === 0 ? -1 : 1;
        column += horizontalStep;
        const preferredGlyph = horizontalStep === 1 ? "\\" : "/";
        glyph = lightning.symbols.includes(preferredGlyph)
          ? preferredGlyph
          : lightning.symbols[random.choiceIndex(lightning.symbols.length)];
      } else {
        glyph = lightning.symbols[random.choiceIndex(lightning.symbols.length)];
      }

      const segment: StrikeSegment = {
        activatedAtTick: -1,
        glyph,
        point: { column, row },
      };
      row -= 1;
      if (glyph === "\\") column += 1;
      else if (glyph === "/") column -= 1;
      segments.push(segment);

      // The random draw is unconditional in the pinned source, even for the
      // first character of a recursively-created branch.
      if (random.random() < branchChance && neighbor === undefined) {
        branchChance -= lightning.branchChanceStep;
        setupBranch(segment);
      }
      neighbor = undefined;
    }
    branchChance = lightning.branchChance;
  };

  setupBranch(undefined);
  return segments;
}

function createSpark(
  origin: LogoPoint,
  startTick: number,
  particle: PoolParticle,
  random: SeededRandom,
  glowTicks: number,
  sparkSettings: ThunderstormRuntimeValues["sparks"]
): SparkEvent {
  const speed = random.uniform(sparkSettings.speed[0], sparkSettings.speed[1]);
  const offset =
    random.integer(sparkSettings.offset[0], sparkSettings.offset[1]) *
    (random.choiceIndex(2) === 0 ? 1 : -1);
  const target = { column: origin.column + offset, row: 1 };
  const control = {
    column: origin.column - Math.floor((origin.column - target.column) / 2),
    row: random.integer(1, ROWS),
  };
  const maximumSteps = roundHalfEven(quadraticBezierLength(origin, control, target) / speed);
  const pathLifetimeTicks = Math.max(1, maximumSteps) + sparkSettings.holdFrames;
  return {
    control,
    // TTFX lets the path hold at its endpoint while the glow scene keeps
    // running. The longer lifetime is visually inert after the glow reaches
    // the background color, but retaining it keeps pool scheduling faithful.
    endTick: startTick + Math.max(1, glowTicks, pathLifetimeTicks) - 1,
    glyph: particle.glyph,
    maximumSteps,
    particleId: particle.id,
    start: origin,
    startTick,
    target,
  };
}

// oxlint-disable-next-line eslint/complexity -- Schedule construction mirrors the source-locked pool and strike ordering; splitting it would hide that ordering.
function buildThunderstormSchedule(
  cells: readonly LogoCell[],
  seed: number,
  values: ThunderstormRuntimeValues,
  timing: ThunderstormTiming
): ThunderstormSchedule {
  const random = new SeededRandom(seed);
  const rainAvailable = preallocatePool(
    values.raindropSymbols,
    THUNDERSTORM_SOURCE_CHOREOGRAPHY.rainPoolPreallocation,
    random
  );
  const sparkAvailable = preallocatePool(
    values.sparkSymbols,
    THUNDERSTORM_SOURCE_CHOREOGRAPHY.sparkPoolPreallocation,
    random
  );
  let nextRainId = rainAvailable.length;
  let nextSparkId = sparkAvailable.length;
  const allocateRainId = () => {
    nextRainId += 1;
    return nextRainId - 1;
  };
  const allocateSparkId = () => {
    nextSparkId += 1;
    return nextSparkId - 1;
  };
  const rainReleases = new Map<number, PoolParticle[]>();
  const sparkReleases = new Map<number, PoolParticle[]>();
  const rain: RainEvent[] = [];
  const sparks: SparkEvent[] = [];
  const strikes: Strike[] = [];
  const glowActivationsByCell = Array.from({ length: cells.length }, createTextGlowActivationList);
  const cellBySourcePoint = new Map(
    cells.map((cell) => [`${cell.column + 1}:${ROWS - cell.row}`, cell.index])
  );
  const stormStartTick = timing.textFadeTicks;
  const stormBudgetTicks = values.stormTime * (1000 / LOGO_EFFECT_TICK_MS);
  const strikeLifetimeTicks = timing.strikeFlashTicks + timing.strikeFadeTicks;
  let rainDelay = 0;
  let activeStrike:
    | {
        easeY2: number;
        endTick: number | undefined;
        nextSegment: number;
        progressionDelay: number;
        segments: StrikeSegment[];
      }
    | undefined;
  let postStormStartTick = stormStartTick;

  for (let tick = stormStartTick; ; tick += 1) {
    if (activeStrike?.endTick !== undefined && tick > activeStrike.endTick) {
      activeStrike = undefined;
    }

    if (rainDelay !== 0) {
      rainDelay -= 1;
    } else {
      const rainCount = random.integer(values.rain.emissionCount[0], values.rain.emissionCount[1]);
      for (let emission = 0; emission < rainCount; emission += 1) {
        const spawnColumn = random.integer(1 - ROWS, COLUMNS);
        const particle = acquirePoolParticle(
          rainAvailable,
          values.raindropSymbols,
          random,
          allocateRainId
        );
        const start = { column: spawnColumn - 1, row: ROWS + 1 };
        const target = { column: start.column + ROWS + 1, row: 0 };
        const speed = random.uniform(values.rain.speed[0], values.rain.speed[1]);
        const maximumSteps = roundHalfEven(lineLength(start, target) / speed);
        const endTick = tick + Math.max(1, maximumSteps) - 1;
        rain.push({
          endTick,
          glyph: particle.glyph,
          maximumSteps,
          particleId: particle.id,
          start,
          startTick: tick,
          target,
        });
        schedulePoolRelease(rainReleases, particle, endTick);
      }
      rainDelay = random.integer(values.rain.delayFrames[0], values.rain.delayFrames[1]);
    }

    if (!activeStrike && random.random() < values.lightning.triggerChance) {
      const segments = setupStrike(random, values.lightning);
      activeStrike = {
        easeY2: random.uniform(-0.6, 0.4),
        endTick: undefined,
        nextSegment: 0,
        progressionDelay: 0,
        segments,
      };
    }

    if (activeStrike && activeStrike.endTick === undefined) {
      if (activeStrike.progressionDelay !== 0) {
        activeStrike.progressionDelay -= 1;
      } else {
        const batch = random.integer(
          values.lightning.progressionCount[0],
          values.lightning.progressionCount[1]
        );
        for (
          let activated = 0;
          activated < batch && activeStrike.nextSegment < activeStrike.segments.length;
          activated += 1
        ) {
          activeStrike.segments[activeStrike.nextSegment].activatedAtTick = tick;
          activeStrike.nextSegment += 1;
          activeStrike.progressionDelay = values.lightning.progressionDelayFrames;
        }

        if (activeStrike.nextSegment === activeStrike.segments.length) {
          const flashStartTick = tick;
          const strike: Strike = {
            easeY2: activeStrike.easeY2,
            flashStartTick,
            segments: activeStrike.segments,
          };
          strikes.push(strike);
          activeStrike.endTick = flashStartTick + strikeLifetimeTicks - 1;

          const impact = activeStrike.segments.at(-1)?.point;
          if (impact) {
            const sparkCount = random.integer(values.sparks.count[0], values.sparks.count[1]);
            for (let sparkIndex = 0; sparkIndex < sparkCount; sparkIndex += 1) {
              const particle = acquirePoolParticle(
                sparkAvailable,
                values.sparkSymbols,
                random,
                allocateSparkId
              );
              const spark = createSpark(
                impact,
                flashStartTick,
                particle,
                random,
                timing.sparkGlowTicks,
                values.sparks
              );
              sparks.push(spark);
              schedulePoolRelease(sparkReleases, particle, spark.endTick);
            }
          }

          const glowStartTick = activeStrike.endTick;
          const affectedCells = new Set<number>();
          for (const segment of activeStrike.segments) {
            const cellIndex = cellBySourcePoint.get(`${segment.point.column}:${segment.point.row}`);
            if (cellIndex !== undefined) affectedCells.add(cellIndex);
          }
          for (const cellIndex of affectedCells) {
            glowActivationsByCell[cellIndex].push(glowStartTick);
          }
        }
      }
    }

    const stormBudgetElapsed = tick - stormStartTick >= stormBudgetTicks;
    if (stormBudgetElapsed && activeStrike === undefined) {
      postStormStartTick = tick;
      releasePool(rainReleases, rainAvailable, tick);
      releasePool(sparkReleases, sparkAvailable, tick);
      break;
    }

    releasePool(rainReleases, rainAvailable, tick);
    releasePool(sparkReleases, sparkAvailable, tick);
  }

  const textUnfadeEnd = postStormStartTick + timing.textFadeTicks;
  const latestRainEnd = rain.reduce((latest, event) => Math.max(latest, event.endTick + 1), 0);
  const latestSparkEnd = sparks.reduce((latest, event) => Math.max(latest, event.endTick + 1), 0);
  return {
    glowsByCell: buildTextGlows(glowActivationsByCell, strikes, timing),
    postStormStartTick,
    rain,
    revealTicks: Math.max(textUnfadeEnd, latestRainEnd, latestSparkEnd),
    sparks,
    stormStartTick,
    strikes,
  };
}

function sceneColor(
  spectrum: readonly Rgb[],
  colorFrames: number,
  ageTick: number,
  easing?: (progress: number) => number
) {
  const totalTicks = spectrum.length * colorFrames;
  const visualTick = easing
    ? roundHalfEven(easing(ageTick / totalTicks) * Math.max(0, totalTicks - 1))
    : ageTick;
  return spectrum[Math.min(spectrum.length - 1, Math.floor(visualTick / colorFrames))];
}

function sourceExtraInstanceCapacity(schedule: ThunderstormSchedule, timing: ThunderstormTiming) {
  const changes = new Int32Array(schedule.revealTicks + 1);
  const addInterval = (startTick: number, endTick: number) => {
    if (endTick <= startTick) return;
    changes[startTick] += 1;
    changes[Math.min(endTick, schedule.revealTicks)] -= 1;
  };

  for (const event of schedule.rain) addInterval(event.startTick, event.endTick);
  for (const event of schedule.sparks) addInterval(event.startTick, event.endTick);
  for (const strike of schedule.strikes) {
    const endTick = strike.flashStartTick + timing.strikeFlashTicks + timing.strikeFadeTicks - 1;
    for (const segment of strike.segments) addInterval(segment.activatedAtTick, endTick);
  }

  let active = 0;
  let maximum = 0;
  for (const change of changes) {
    active += change;
    maximum = Math.max(maximum, active);
  }
  return maximum;
}

function createThunderstormRuntime(
  { cells, seed }: LogoEffectContext,
  values: ThunderstormRuntimeValues
) {
  const finalSpectrum = buildGradient(values.finalGradientStops, values.finalGradientSteps);
  const finalBounds = boundsFromPoints(
    cells.map((cell) => ({ column: cell.column + 1, row: ROWS - cell.row }))
  );
  const finalColors = cells.map((cell) =>
    colorAtGridPoint(
      finalSpectrum,
      { column: cell.column + 1, row: ROWS - cell.row },
      finalBounds,
      values.finalGradientDirection
    )
  );
  const stormColors = finalColors.map((color) =>
    adjustColorBrightness(color, values.text.stormBrightness)
  );
  const textFadeSpectrums = cells.map((_, index) =>
    buildGradient([finalColors[index], stormColors[index]], [values.text.fadeGradientSteps])
  );
  const textFlashSpectrums = cells.map((_, index) =>
    buildGradient(
      [
        stormColors[index],
        adjustColorBrightness(finalColors[index], values.lightning.flash.brightness),
      ],
      [values.lightning.flash.gradientSteps],
      true
    )
  );
  const textGlowSpectrums = cells.map((_, index) =>
    buildGradient([values.glowingTextColor, stormColors[index]], [values.text.glowGradientSteps])
  );
  const strikeFlashSpectrum = buildGradient(
    [
      values.lightningColor,
      adjustColorBrightness(values.lightningColor, values.lightning.flash.brightness),
    ],
    [values.lightning.flash.gradientSteps],
    true
  );
  const strikeFadeSpectrum = buildGradient(
    [values.lightningColor, values.backgroundColor],
    [values.lightning.fade.gradientSteps]
  );
  const sparkSpectrum = buildGradient(
    [values.sparkGlowColor, values.backgroundColor],
    [values.sparks.gradientSteps]
  );
  const timing: ThunderstormTiming = {
    sparkGlowTicks: sparkSpectrum.length * values.sparkGlowTime,
    strikeFadeTicks: strikeFadeSpectrum.length * values.lightning.fade.colorFrames,
    strikeFlashTicks: strikeFlashSpectrum.length * values.lightning.flash.colorFrames,
    textFadeTicks: textFadeSpectrums[0].length * values.text.fadeColorFrames,
    textFlashTicks: textFlashSpectrums[0].length * values.lightning.flash.colorFrames,
    textGlowTicks: textGlowSpectrums[0].length * values.textGlowTime,
  };
  const schedule = buildThunderstormSchedule(cells, seed, values, timing);
  const extraInstanceCapacity = sourceExtraInstanceCapacity(schedule, timing);

  const runtime = createSampledLogoEffectRuntime(cells, values, {
    extraInstanceCapacity,
    particles(frame) {
      const tick = Math.floor(frame.revealMs / LOGO_EFFECT_TICK_MS + 1e-7);
      const particles: GlyphParticle[] = [];

      schedule.rain
        .filter((event) => tick >= event.startTick && tick < event.endTick)
        .toSorted((left, right) => left.particleId - right.particleId)
        .forEach((event) => {
          const ageTick = tick - event.startTick;
          const progress =
            event.maximumSteps === 0 ? 1 : Math.min(1, (ageTick + 1) / event.maximumSteps);
          const point = pointOnLine(event.start, event.target, progress);
          particles.push({
            channel: "particle",
            color: values.rainColor,
            ...sourcePointToParticle(point),
            glyph: event.glyph,
          });
        });

      for (const strike of schedule.strikes) {
        const flashAge = tick - strike.flashStartTick;
        for (const segment of strike.segments) {
          if (tick < segment.activatedAtTick) continue;
          let color: Rgb;
          if (flashAge < 0) {
            color = values.lightningColor;
          } else if (flashAge < timing.strikeFlashTicks - 1) {
            color = sceneColor(
              strikeFlashSpectrum,
              values.lightning.flash.colorFrames,
              flashAge,
              (progress) => cubicBezierEasing(1.6, strike.easeY2, progress)
            );
          } else {
            const fadeActivationAge = flashAge - (timing.strikeFlashTicks - 1);
            if (fadeActivationAge >= timing.strikeFadeTicks) continue;
            color = sceneColor(
              strikeFadeSpectrum,
              values.lightning.fade.colorFrames,
              Math.max(0, fadeActivationAge - 1)
            );
          }
          particles.push({
            channel: "line",
            color,
            ...sourcePointToParticle(segment.point),
            glyph: segment.glyph,
          });
        }
      }

      schedule.sparks
        .filter((event) => tick >= event.startTick && tick < event.endTick)
        .toSorted((left, right) => left.particleId - right.particleId)
        .forEach((event) => {
          const ageTick = tick - event.startTick;
          const movementProgress =
            event.maximumSteps === 0 ? 1 : Math.min(1, (ageTick + 1) / event.maximumSteps);
          const easedMovement = 1 - (1 - movementProgress) ** 5;
          const point = pointOnQuadraticBezier(
            event.start,
            event.control,
            event.target,
            easedMovement
          );
          particles.push({
            channel: "particle",
            color: sceneColor(
              sparkSpectrum,
              values.sparkGlowTime,
              ageTick,
              (progress) => 1 - Math.sqrt(1 - progress ** 2)
            ),
            ...sourcePointToParticle(point),
            glyph: event.glyph,
          });
        });

      return particles;
    },
    revealDurationMs: schedule.revealTicks * LOGO_EFFECT_TICK_MS,
    sample(cell, frame) {
      const tick = Math.floor(frame.revealMs / LOGO_EFFECT_TICK_MS + 1e-7);

      if (tick < schedule.stormStartTick) {
        return {
          channel: "finalText",
          color: sceneColor(textFadeSpectrums[cell.index], values.text.fadeColorFrames, tick),
          glyph: cell.glyph,
        };
      }

      if (tick >= schedule.postStormStartTick) {
        const unfadeAge = tick - schedule.postStormStartTick;
        const spectrum = textFadeSpectrums[cell.index];
        const unfadeTicks = spectrum.length * values.text.fadeColorFrames;
        return {
          channel: "finalText",
          color:
            unfadeAge >= unfadeTicks
              ? finalColors[cell.index]
              : sceneColor(spectrum, values.text.fadeColorFrames, unfadeTicks - unfadeAge - 1),
          glyph: cell.glyph,
        };
      }

      let latestAnimationStart = -1;
      let animatedColor: Rgb | undefined;
      for (const strike of schedule.strikes) {
        const ageTick = tick - strike.flashStartTick;
        if (
          strike.flashStartTick >= latestAnimationStart &&
          ageTick >= 0 &&
          ageTick < timing.textFlashTicks
        ) {
          latestAnimationStart = strike.flashStartTick;
          animatedColor = sceneColor(
            textFlashSpectrums[cell.index],
            values.lightning.flash.colorFrames,
            ageTick,
            (progress) => cubicBezierEasing(1.6, strike.easeY2, progress)
          );
        }
      }
      for (const glow of schedule.glowsByCell[cell.index]) {
        if (
          glow.startTick >= latestAnimationStart &&
          tick >= glow.startTick &&
          tick < glow.endTick
        ) {
          latestAnimationStart = glow.startTick;
          animatedColor = sceneColor(
            textGlowSpectrums[cell.index],
            values.textGlowTime,
            glow.sceneAge + Math.max(0, tick - glow.startTick - 1)
          );
        }
      }

      return {
        channel: "finalText",
        color: animatedColor ?? stormColors[cell.index],
        glyph: cell.glyph,
      };
    },
  });

  return bindLogoEffectAuthorRuntime(runtime, (_nextValues: ThunderstormRuntimeValues) => {
    // Every editable Thunderstorm field rebuilds the source-faithful schedule.
  });
}

export const logoEffect = defineLogoEffect({
  createRuntime(context, values) {
    return createThunderstormRuntime(context, values);
  },
  id: "thunderstorm",
  label: "Thunderstorm",
  defaults: THUNDERSTORM_DEFAULTS,
  schema: thunderstormSchema,
  source: thunderstormSource,
});
