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
  buildGradient,
  colorAtGridPoint,
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

const ETCH_PATTERNS = ["algorithm"] as const;

const LASERETCH_UPSTREAM = {
  command: "laseretch",
  sourcePath: "src/effects/laseretch.rs",
  ...createTtfxSourceReference("laseretch", "src/effects/laseretch.rs"),
} as const;

const LASERETCH_SOURCE_CHOREOGRAPHY = {
  beamColorFrames: 3,
  beamGradientSteps: 6,
  beamLength: ROWS + 1,
  cellColorFrames: 3,
  cellGradientSteps: 8,
  hotFrames: 3,
  particlePoolSize: 2000,
  sparkGradientSteps: [3, 8] as const,
  sparkPathSpeed: 0.3,
} as const;

const laserEtchSchema = defineLogoEffectSchema({
  etchPattern: logoEffectField.choice({
    description:
      "Pinned TTFX accepts these values, but its grouped-pattern branch is inert; only algorithm produces the effect.",
    label: "Etch pattern",
    options: ETCH_PATTERNS,
    readOnly: true,
    tier: "identity",
    update: "rebuild",
  }),
  etchSpeed: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 16, minimum: 1, step: 1 },
    label: "Etch speed",
    tier: "identity",
    unit: "characters per tick",
    update: "rebuild",
  }),
  etchDelayFrames: logoEffectField.number({
    constraint: { integer: true, minimum: 0 },
    editor: { maximum: 12, minimum: 0, step: 1 },
    label: "Etch delay",
    tier: "identity",
    unit: "simulation frames",
    update: "rebuild",
  }),
  beamColorFrames: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 30, minimum: 1, step: 1 },
    label: "Beam color hold",
    tier: "advanced",
    unit: "simulation frames per color",
    update: "rebuild",
  }),
  beamGradientSteps: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 64, minimum: 1, step: 1 },
    label: "Beam gradient steps",
    tier: "advanced",
    update: "rebuild",
  }),
  beamLength: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 32, minimum: 1, step: 1 },
    label: "Beam length",
    tier: "identity",
    unit: "glyphs",
    update: "rebuild",
  }),
  beamGlyphs: logoEffectField.symbols({
    constraint: { maximumItems: 8, minimumItems: 1 },
    description: "The first glyph is the beam tip; remaining glyphs repeat along its trail.",
    label: "Beam glyphs",
    tier: "identity",
    update: "rebuild",
  }),
  coolGradientStops: logoEffectField.colors({
    constraint: { maximumItems: 8, minimumItems: 1 },
    label: "Cooling gradient",
    tier: "identity",
    update: "rebuild",
  }),
  cellColorFrames: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 30, minimum: 1, step: 1 },
    label: "Cooling color hold",
    tier: "advanced",
    unit: "simulation frames per color",
    update: "rebuild",
  }),
  cellGradientSteps: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 64, minimum: 1, step: 1 },
    label: "Cooling gradient steps",
    tier: "advanced",
    update: "rebuild",
  }),
  hotFrames: logoEffectField.number({
    constraint: { integer: true, minimum: 0 },
    editor: { maximum: 30, minimum: 0, step: 1 },
    label: "Hot-cell hold",
    tier: "identity",
    unit: "simulation frames",
    update: "rebuild",
  }),
  hotGlyph: logoEffectField.symbol({
    label: "Hot-cell glyph",
    tier: "identity",
    update: "rebuild",
  }),
  laserGradientStops: logoEffectField.colors({
    constraint: { maximumItems: 8, minimumItems: 1 },
    label: "Laser gradient",
    tier: "identity",
    update: "rebuild",
  }),
  sparkGradientStops: logoEffectField.colors({
    constraint: { maximumItems: 8, minimumItems: 1 },
    label: "Spark gradient",
    tier: "identity",
    update: "rebuild",
  }),
  sparkCoolingFrames: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 30, minimum: 1, step: 1 },
    label: "Spark cooling",
    tier: "identity",
    unit: "simulation frames per color",
    update: "rebuild",
  }),
  sparkGradientSteps: logoEffectField.numberList({
    constraint: { maximumItems: 8, minimumItems: 1 },
    itemConstraint: { integer: true, maximum: 64, minimum: 1 },
    label: "Spark gradient steps",
    tier: "advanced",
    update: "rebuild",
  }),
  sparkGlyphs: logoEffectField.symbols({
    constraint: { maximumItems: 12, minimumItems: 1 },
    label: "Spark glyphs",
    tier: "identity",
    update: "rebuild",
  }),
  sparkPathSpeed: logoEffectField.number({
    constraint: { minimum: 0.01 },
    editor: { maximum: 2, minimum: 0.05, step: 0.05 },
    label: "Spark path speed",
    tier: "identity",
    unit: "grid cells per simulation frame",
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
      "Preserved for TTFX configuration round trips. Pinned LaserEtch declares this flag but never reads it.",
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
  idle: logoEffectField.group({
    fields: {
      traceIntervalMs: logoEffectField.number({
        constraint: { minimum: 800 },
        editor: { maximum: 10_000, minimum: 800, step: 100 },
        label: "Trace interval",
        tier: "identity",
        unit: "milliseconds",
        update: "live",
      }),
      traceCells: logoEffectField.number({
        constraint: { integer: true, maximum: 16, minimum: 1 },
        editor: { maximum: 16, minimum: 1, step: 1 },
        label: "Trace cells",
        tier: "identity",
        update: "live",
      }),
      traceDurationMaxMs: logoEffectField.number({
        constraint: { minimum: 1 },
        editor: { maximum: 3_000, minimum: 100, step: 50 },
        label: "Trace duration limit",
        tier: "advanced",
        unit: "milliseconds",
        update: "live",
      }),
      traceDurationFraction: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0.05 },
        editor: { maximum: 1, minimum: 0.05, step: 0.05 },
        label: "Trace interval fraction",
        tier: "advanced",
        update: "live",
      }),
      sparkRate: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Spark rate",
        tier: "identity",
        update: "live",
      }),
      glow: logoEffectField.number({
        constraint: { maximum: 1, minimum: 0 },
        editor: { maximum: 1, minimum: 0, step: 0.05 },
        label: "Trace glow",
        tier: "identity",
        update: "live",
      }),
    },
    label: "Idle pilot trace",
    tier: "identity",
  }),
});

type LaserEtchRuntimeValues = LogoEffectRuntimeValues<typeof laserEtchSchema>;

const LASERETCH_DEFAULT_VALUES = {
  etchPattern: "algorithm",
  etchSpeed: 1,
  etchDelayFrames: 1,
  beamColorFrames: LASERETCH_SOURCE_CHOREOGRAPHY.beamColorFrames,
  beamGradientSteps: LASERETCH_SOURCE_CHOREOGRAPHY.beamGradientSteps,
  beamLength: LASERETCH_SOURCE_CHOREOGRAPHY.beamLength,
  beamGlyphs: ["*", "/"],
  coolGradientStops: [
    themeLogoColor("yellow", [224, 175, 104]),
    themeLogoColor("green", [158, 206, 106]),
  ],
  cellColorFrames: LASERETCH_SOURCE_CHOREOGRAPHY.cellColorFrames,
  cellGradientSteps: LASERETCH_SOURCE_CHOREOGRAPHY.cellGradientSteps,
  hotFrames: LASERETCH_SOURCE_CHOREOGRAPHY.hotFrames,
  hotGlyph: "^",
  laserGradientStops: [
    themeLogoColor("brightForeground", [192, 202, 245]),
    themeLogoColor("cyan", [68, 157, 171]),
  ],
  sparkGradientStops: [
    themeLogoColor("yellow", [224, 175, 104]),
    themeLogoColor("orange", [255, 158, 100]),
    themeLogoColor("cyan", [68, 157, 171]),
  ],
  sparkCoolingFrames: 7,
  sparkGradientSteps: LASERETCH_SOURCE_CHOREOGRAPHY.sparkGradientSteps,
  sparkGlyphs: [".", ",", "*"],
  sparkPathSpeed: LASERETCH_SOURCE_CHOREOGRAPHY.sparkPathSpeed,
  finalGradientStops: [
    themeLogoColor("brightForeground", [192, 202, 245]),
    themeLogoColor("accent", [122, 162, 247]),
    themeLogoColor("lightForeground", [120, 130, 170]),
  ],
  finalGradientSteps: [8],
  finalGradientFrames: 4,
  finalGradientDirection: "vertical",
  idle: {
    traceIntervalMs: 2_400,
    traceCells: 6,
    traceDurationMaxMs: 900,
    traceDurationFraction: 0.55,
    sparkRate: 0.3,
    glow: 0.2,
  },
} as const satisfies LogoEffectAuthorValues<typeof laserEtchSchema>;

const LASERETCH_DEFAULTS = {
  // TTFX's CLI-wide 60 fps default is an adapter concern rather than a LaserEtch
  // parameter, so the source choreography continues to tick 1:1 at 120 Hz here.
  playback: DEFAULT_LOGO_EFFECT_PLAYBACK,
  presentation: DEFAULT_LOGO_EFFECT_PRESENTATION,
  values: LASERETCH_DEFAULT_VALUES,
} as const;

function sourceTraversal(random: SeededRandom) {
  const visited = new Uint8Array(COLUMNS * ROWS);
  const startColumn = random.integer(1, COLUMNS) - 1;
  const startSourceRow = random.integer(1, ROWS);
  const start = (ROWS - startSourceRow) * COLUMNS + startColumn;
  const stack = [start];
  const order = [start];
  visited[start] = 1;

  while (stack.length > 0) {
    const position = stack.at(-1);
    if (position === undefined) break;
    const column = position % COLUMNS;
    const row = Math.floor(position / COLUMNS);
    const neighbors = [
      row > 0 ? position - COLUMNS : -1,
      column < COLUMNS - 1 ? position + 1 : -1,
      row < ROWS - 1 ? position + COLUMNS : -1,
      column > 0 ? position - 1 : -1,
    ].filter((neighbor) => neighbor >= 0 && visited[neighbor] === 0);

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const next = neighbors[random.choiceIndex(neighbors.length)];
    visited[next] = 1;
    order.push(next);
    stack.push(next);
  }

  return order;
}

type EtchEvent = {
  cell: LogoCell | undefined;
  control: LogoPoint;
  maximumSteps: number;
  pathLength: number;
  particleGlyph: string;
  particleIndex: number;
  start: LogoPoint;
  target: LogoPoint;
  tick: number;
};

type BeamTarget = {
  column: number;
  pendingAfter: boolean;
  row: number;
  tick: number;
};

type EtchEventSchedule = {
  beamTargets: BeamTarget[];
  events: EtchEvent[];
};

function releaseParticles(tick: number, available: number[], releases: Map<number, number[]>) {
  const released = releases.get(tick);
  if (!released) return;
  released
    .toSorted((left, right) => left - right)
    .forEach((particle) => {
      available.push(particle);
    });
  releases.delete(tick);
}

function buildEtchEvents(
  cells: readonly LogoCell[],
  seed: number,
  values: LaserEtchRuntimeValues,
  sparkLifetimeTicks: number
): EtchEventSchedule {
  const random = new SeededRandom(seed);
  const traversal = sourceTraversal(random);
  const cellAtPosition = new Map(cells.map((cell) => [cell.row * COLUMNS + cell.column, cell]));

  const particleGlyphs = Array.from(
    { length: LASERETCH_SOURCE_CHOREOGRAPHY.particlePoolSize },
    () => values.sparkGlyphs[random.choiceIndex(values.sparkGlyphs.length)]
  );
  const available = particleGlyphs.map((_, index) => index);
  const releases = new Map<number, number[]>();
  const events: EtchEvent[] = [];
  const beamTargets: BeamTarget[] = [];
  let cursor = 0;
  let previousTick = -1;
  let tick = 0;

  while (cursor < traversal.length) {
    for (let releaseTick = previousTick + 1; releaseTick < tick; releaseTick += 1) {
      releaseParticles(releaseTick, available, releases);
    }

    const batchPositions: number[] = [];
    for (let etched = 0; etched < values.etchSpeed && cursor < traversal.length; etched += 1) {
      let position = traversal[cursor];
      cursor += 1;
      while (!cellAtPosition.has(position) && cursor < traversal.length) {
        position = traversal[cursor];
        cursor += 1;
      }
      batchPositions.push(position);
    }

    for (const position of batchPositions) {
      const column = position % COLUMNS;
      const row = Math.floor(position / COLUMNS);
      const particle = available.pop();
      if (particle === undefined) throw new RangeError("LaserEtch particle pool exhausted");

      const start = { column: column + 1, row: ROWS - row };
      const targetColumn = start.column + random.integer(-20, 20);
      const control = {
        column: targetColumn,
        row: start.row + random.integer(-10, 20),
      };
      const target = { column: targetColumn, row: 1 };
      const pathLength = quadraticBezierLength(start, control, target);
      events.push({
        cell: cellAtPosition.get(position),
        control,
        maximumSteps: roundHalfEven(pathLength / values.sparkPathSpeed),
        pathLength,
        particleGlyph: particleGlyphs[particle],
        particleIndex: particle,
        start,
        target,
        tick,
      });

      const releaseTick = tick + sparkLifetimeTicks - 1;
      const bucket = releases.get(releaseTick);
      if (bucket) bucket.push(particle);
      else releases.set(releaseTick, [particle]);
    }

    const beamPosition = batchPositions.at(-1);
    if (beamPosition !== undefined) {
      beamTargets.push({
        column: beamPosition % COLUMNS,
        pendingAfter: cursor < traversal.length,
        row: Math.floor(beamPosition / COLUMNS),
        tick,
      });
    }

    releaseParticles(tick, available, releases);
    previousTick = tick;
    tick += values.etchDelayFrames + 1;
  }

  return { beamTargets, events };
}

function latestBeamTarget(targets: readonly BeamTarget[], elapsedTick: number) {
  let lower = 0;
  let upper = targets.length - 1;
  let result: BeamTarget | undefined;
  while (lower <= upper) {
    const middle = Math.floor((lower + upper) / 2);
    const target = targets[middle];
    if (target.tick <= elapsedTick) {
      result = target;
      lower = middle + 1;
    } else {
      upper = middle - 1;
    }
  }
  return result;
}

function idleTraceStartIndex(seed: number, cycle: number, length: number) {
  let value = (seed ^ Math.imul(cycle + 1, 0x9e37_79b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9_f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9_f3b);
  return ((value ^ (value >>> 16)) >>> 0) % Math.max(1, length);
}

function createLaseretchRuntime(
  { cells, seed }: LogoEffectContext,
  initialValues: LaserEtchRuntimeValues
) {
  let values = initialValues;
  const finalSpectrum = buildGradient(values.finalGradientStops, values.finalGradientSteps);
  const finalColors = cells.map((cell) =>
    colorAtGridPoint(
      finalSpectrum,
      { column: cell.column + 1, row: ROWS - cell.row },
      { bottom: 1, left: 1, right: COLUMNS, top: ROWS },
      values.finalGradientDirection
    )
  );
  const coolSpectrums = cells.map((_, index) =>
    buildGradient([...values.coolGradientStops, finalColors[index]], [values.cellGradientSteps])
  );
  const laserSpectrum = buildGradient(values.laserGradientStops, [values.beamGradientSteps], true);
  const sparkSpectrum = buildGradient(values.sparkGradientStops, values.sparkGradientSteps);
  const sparkLifetimeTicks = sparkSpectrum.length * values.sparkCoolingFrames;
  const { beamTargets, events } = buildEtchEvents(cells, seed, values, sparkLifetimeTicks);
  const idleCells = events.flatMap((event) => (event.cell ? [event.cell] : []));
  const idleOrderByCell = new Int16Array(cells.length).fill(-1);
  for (const [order, cell] of idleCells.entries()) idleOrderByCell[cell.index] = order;
  const eventsByPainterOrder = events.toSorted(
    (left, right) => left.particleIndex - right.particleIndex
  );
  const revealTickByCell = new Int32Array(cells.length).fill(-1);
  for (const event of events) {
    if (event.cell) revealTickByCell[event.cell.index] = event.tick;
  }

  const finalCellTick = events.reduce((latest, event) => {
    if (!event.cell) return latest;
    const cellSceneTicks =
      values.hotFrames + coolSpectrums[event.cell.index].length * values.cellColorFrames;
    return Math.max(latest, event.tick + Math.max(0, cellSceneTicks - 1));
  }, 0);
  const finalSparkTick = events.reduce(
    (latest, event) => Math.max(latest, event.tick + Math.max(0, sparkLifetimeTicks - 1)),
    0
  );
  const revealDurationMs = Math.max(finalCellTick, finalSparkTick) * LOGO_EFFECT_TICK_MS;
  const idleTraceState = (idleMs: number) => {
    if (idleCells.length === 0) return;
    const cycle = Math.floor(idleMs / values.idle.traceIntervalMs);
    const elapsedMs = idleMs - cycle * values.idle.traceIntervalMs;
    const durationMs = Math.min(
      values.idle.traceDurationMaxMs,
      values.idle.traceIntervalMs * values.idle.traceDurationFraction
    );
    if (elapsedMs >= durationMs) return;

    const progress = elapsedMs / durationMs;
    const traceCells = Math.min(values.idle.traceCells, idleCells.length);
    return {
      cursor: progress * (traceCells + 1) - 0.5,
      cycle,
      progress,
      start: idleTraceStartIndex(seed, cycle, idleCells.length),
      strength: Math.sin(Math.PI * progress),
      traceCells,
    };
  };

  const runtime = createSampledLogoEffectRuntime(cells, values, {
    extraInstanceCapacity: cells.length + values.beamLength,
    revealDurationMs,
    usesIdle: true,
    particles(frame) {
      const elapsedTick = Math.floor(frame.revealMs / LOGO_EFFECT_TICK_MS + 1e-7);
      const particles: GlyphParticle[] = [];
      for (const event of eventsByPainterOrder) {
        const ageTick = elapsedTick - event.tick;
        if (ageTick < 0 || ageTick >= sparkLifetimeTicks - 1) continue;
        const colorIndex = Math.floor(ageTick / values.sparkCoolingFrames);
        const currentStep = Math.min(event.maximumSteps, ageTick + 1);
        const easedProgress =
          event.maximumSteps === 0
            ? 1
            : Math.sin((currentStep / event.maximumSteps) * (Math.PI / 2));
        // TTFX's motion context converts eased progress to traveled distance and back to
        // segment progress. Preserve that floating-point round trip before half-even rounding.
        const progress =
          event.pathLength === 0 ? 1 : (easedProgress * event.pathLength) / event.pathLength;
        const point = pointOnQuadraticBezier(event.start, event.control, event.target, progress);
        particles.push({
          channel: "particle",
          color: sparkSpectrum[Math.min(colorIndex, sparkSpectrum.length - 1)],
          column: point.column - 1,
          glyph: event.particleGlyph,
          row: ROWS - point.row,
        });
      }

      const beamTarget = latestBeamTarget(beamTargets, elapsedTick);
      if (beamTarget?.pendingAfter) {
        const colorStep = Math.floor(elapsedTick / values.beamColorFrames);
        for (let segment = 0; segment < values.beamLength; segment += 1) {
          particles.push({
            channel: "line",
            color: laserSpectrum[(colorStep + segment) % laserSpectrum.length],
            column: beamTarget.column + segment,
            glyph: values.beamGlyphs[Math.min(segment, values.beamGlyphs.length - 1)],
            row: beamTarget.row - segment,
          });
        }
      }

      const idle = idleTraceState(frame.idleMs);
      if (idle) {
        const sparkCount = Math.round(idle.traceCells * values.idle.sparkRate);
        for (let spark = 0; spark < sparkCount; spark += 1) {
          const offset = Math.floor(idle.cursor) - spark;
          if (offset < 0 || offset >= idle.traceCells) continue;
          const cell = idleCells[(idle.start + offset) % idleCells.length];
          particles.push({
            channel: "particle",
            color: sparkSpectrum[(idle.cycle + spark) % sparkSpectrum.length],
            column: cell.column + Math.sin(idle.progress * Math.PI * 2 + spark) * 0.2,
            glyph: "*",
            glow: idle.strength * values.idle.glow,
            row: cell.row - idle.strength * (0.2 + spark * 0.08),
          });
        }
      }

      return particles;
    },
    sample(cell, frame) {
      const revealTick = revealTickByCell[cell.index];
      if (revealTick < 0) return null;
      const elapsedTick = Math.floor(frame.revealMs / LOGO_EFFECT_TICK_MS + 1e-7);
      const ageTick = elapsedTick - revealTick;
      if (ageTick < 0) return null;

      if (ageTick < values.hotFrames) {
        return {
          channel: "transition",
          color: values.coolGradientStops[0],
          glyph: values.hotGlyph,
        };
      }

      const coolIndex = Math.floor((ageTick - values.hotFrames) / values.cellColorFrames);
      const coolSpectrum = coolSpectrums[cell.index];
      if (coolIndex < coolSpectrum.length) {
        return {
          channel: "transition",
          color: coolSpectrum[coolIndex],
          glyph: cell.glyph,
        };
      }

      const idle = idleTraceState(frame.idleMs);
      const idleOrder = idleOrderByCell[cell.index];
      if (idle && idleOrder >= 0) {
        const offset = (idleOrder - idle.start + idleCells.length) % idleCells.length;
        if (offset < idle.traceCells) {
          const focus = Math.max(0, 1 - Math.abs(offset - idle.cursor) / 1.5);
          const strength = focus * idle.strength * values.idle.glow;
          return {
            channel: "finalText",
            color: mixColor(
              finalColors[cell.index],
              laserSpectrum[(idle.cycle + offset) % laserSpectrum.length],
              strength
            ),
            glyph: cell.glyph,
            glow: strength,
          };
        }
      }

      return {
        channel: "finalText",
        color: finalColors[cell.index],
        glyph: cell.glyph,
      };
    },
  });

  return bindLogoEffectAuthorRuntime<LaserEtchRuntimeValues>(runtime, (nextValues) => {
    values = nextValues;
  });
}

export const logoEffect = defineLogoEffect({
  createRuntime(context, values) {
    return createLaseretchRuntime(context, values);
  },
  defaults: LASERETCH_DEFAULTS,
  id: "laseretch",
  label: "LaserEtch",
  schema: laserEtchSchema,
  source: LASERETCH_UPSTREAM,
});
