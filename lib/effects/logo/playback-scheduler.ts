import type { LogoEffectStatus } from "@/lib/effects/logo/types";

type RevealLoopStep = {
  deltaMs: number;
  enabled: boolean;
  elapsedMs: number;
  repeatDelayMs: number;
  statusAfter: LogoEffectStatus;
  statusBefore: LogoEffectStatus;
};

type RevealLoopDecision = {
  completedReveal: boolean;
  elapsedMs: number;
  restart: boolean;
};

export function advanceRevealLoop({
  deltaMs,
  enabled,
  elapsedMs,
  repeatDelayMs,
  statusAfter,
  statusBefore,
}: RevealLoopStep): RevealLoopDecision {
  const completedReveal = statusBefore === "revealing" && statusAfter !== "revealing";
  if (!enabled || statusAfter === "revealing") {
    return { completedReveal, elapsedMs: 0, restart: false };
  }
  if (completedReveal) {
    return { completedReveal, elapsedMs: 0, restart: false };
  }
  if (deltaMs <= 0) {
    return { completedReveal, elapsedMs, restart: false };
  }

  const nextElapsedMs = elapsedMs + deltaMs;
  if (nextElapsedMs < repeatDelayMs) {
    return { completedReveal, elapsedMs: nextElapsedMs, restart: false };
  }
  return { completedReveal, elapsedMs: 0, restart: true };
}
