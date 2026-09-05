import type { LogoEffectAuthorRuntime } from "@/lib/effects/logo/definition";
import type {
  GlyphParticle,
  GlyphVisual,
  LogoCell,
  LogoEffectFrame,
  LogoEffectInstanceWriter,
  LogoInteraction,
  LogoEffectRuntimeCore,
} from "@/lib/effects/logo/types";

export const LOGO_EFFECT_TICK_MS = 1000 / 120;

export function bindLogoEffectAuthorRuntime<Values>(
  runtime: LogoEffectRuntimeCore,
  configure: (values: Values) => void
): LogoEffectAuthorRuntime<Values> {
  return {
    configure,
    get instanceCapacity() {
      return runtime.instanceCapacity;
    },
    pointerEnabled: runtime.pointerEnabled,
    reset: runtime.reset,
    settle: runtime.settle,
    get status() {
      return runtime.status;
    },
    step: runtime.step,
    usesPointer: runtime.usesPointer,
    writeInstances: runtime.writeInstances,
  };
}

type SampledLogoEffectDefinition<Values> = {
  extraInstanceCapacity?: number;
  particles?: (frame: LogoEffectFrame, values: Values) => readonly GlyphParticle[];
  pointerEnabled?: (values: Values) => boolean;
  revealDurationMs: number | ((values: Values) => number);
  sample: (cell: LogoCell, frame: LogoEffectFrame, values: Values) => GlyphVisual | null;
  usesIdle?: boolean;
  usesPointer?: boolean;
};

function isRevealDurationResolver<Values>(
  value: SampledLogoEffectDefinition<Values>["revealDurationMs"]
): value is (values: Values) => number {
  return typeof value === "function";
}

const EMPTY_INTERACTION: LogoInteraction = {
  current: null,
  inside: false,
  pointerType: "mouse",
  pressed: false,
  previous: null,
  primaryDown: false,
  released: false,
  trail: [],
  velocity: { columnPerSecond: 0, rowPerSecond: 0 },
};

export function createSampledLogoEffectRuntime<Values>(
  cells: readonly LogoCell[],
  initialValues: Values,
  definition: SampledLogoEffectDefinition<Values>
): LogoEffectAuthorRuntime<Values> {
  let idleMs = 0;
  let interactionMs = 0;
  let interaction = EMPTY_INTERACTION;
  let revealMs = 0;
  let values = initialValues;

  const revealDurationMs = () =>
    isRevealDurationResolver(definition.revealDurationMs)
      ? definition.revealDurationMs(values)
      : definition.revealDurationMs;

  const frame = (): LogoEffectFrame => ({
    idleMs,
    interaction,
    interactionMs,
    pointer: interaction.current,
    pointerTrail: interaction.trail,
    revealMs,
  });

  const isPointerEnabled = () =>
    Boolean(definition.usesPointer && (definition.pointerEnabled?.(values) ?? true));

  return {
    configure(nextValues) {
      values = nextValues;
    },
    instanceCapacity: cells.length + (definition.extraInstanceCapacity ?? 0),
    pointerEnabled: isPointerEnabled,
    reset() {
      idleMs = 0;
      interactionMs = 0;
      interaction = EMPTY_INTERACTION;
      revealMs = 0;
    },
    settle() {
      revealMs = revealDurationMs();
    },
    get status() {
      if (revealMs < revealDurationMs()) return "revealing";
      return definition.usesIdle ? "ambient" : "settled";
    },
    step({ deltaTicks, interaction: nextInteraction }) {
      interaction = nextInteraction;
      if (deltaTicks <= 0) return;

      const elapsedMs = deltaTicks * LOGO_EFFECT_TICK_MS;
      const durationMs = revealDurationMs();
      if (revealMs < durationMs) {
        revealMs = Math.min(durationMs, revealMs + elapsedMs);
        return;
      }

      if (definition.usesIdle) {
        idleMs += elapsedMs;
      }

      if (
        isPointerEnabled() &&
        (interaction.current !== null || interaction.trail.length > 0 || interaction.primaryDown)
      ) {
        interactionMs += elapsedMs;
      }
    },
    usesPointer: definition.usesPointer ?? false,
    writeInstances(writer: LogoEffectInstanceWriter) {
      const currentFrame = frame();
      for (const cell of cells) {
        const visual = definition.sample(cell, currentFrame, values);
        if (visual) {
          writer.push(
            { ...visual, column: cell.column, row: cell.row },
            visual.channel ?? (visual.glyph === cell.glyph ? "finalText" : "transition")
          );
        }
      }

      for (const particle of definition.particles?.(currentFrame, values) ?? []) {
        writer.push(particle, particle.channel ?? "particle");
      }
    },
  };
}
