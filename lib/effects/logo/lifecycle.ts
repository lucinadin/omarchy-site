import type { LogoEffectStartMode } from "@/lib/effects/logo/types";

export const LOGO_EFFECT_STORAGE_KEYS = {
  seen: "omarchy.logo-effect:seen",
  state: "omarchy.secret-lab:logo-effects",
} as const;

export const LOGO_BOOT_STORAGE_KEYS = [
  LOGO_EFFECT_STORAGE_KEYS.seen,
  LOGO_EFFECT_STORAGE_KEYS.state,
] as const;

type LogoBootMode = "fresh" | "restore" | "unknown";

export function parseLogoBootMode(value?: string): LogoBootMode {
  return value === "fresh" || value === "restore" || value === "unknown" ? value : "unknown";
}

type LogoRevealState = "consumed" | "pending";

type LogoRevealDataset = {
  logoReveal?: string;
};

export function parseLogoRevealState(value?: string): LogoRevealState {
  return value === "pending" ? "pending" : "consumed";
}

export function consumeInitialLogoReveal(dataset: LogoRevealDataset, playbackKey: string) {
  if (playbackKey === "primary") dataset.logoReveal = "consumed";
}

export function resolveInitialLogoEffectStartMode(
  startMode: LogoEffectStartMode,
  fallbackWasExposed: boolean
): LogoEffectStartMode {
  return fallbackWasExposed ? "settled" : startMode;
}

export type LogoEffectPlaybackIdentity = {
  effectId: string;
  seed: number;
};

type LogoEffectPlaybackTransition = {
  fallbackWasExposed: boolean;
  initialStartMode: LogoEffectStartMode;
  nextEffectId: string;
  nextSeed: number;
  prefersReducedMotion: boolean;
  previousPlayback: LogoEffectPlaybackIdentity | null;
  revealEnabled?: boolean;
};

export function resolveLogoEffectPlaybackStartMode({
  fallbackWasExposed,
  initialStartMode,
  nextEffectId,
  nextSeed,
  prefersReducedMotion,
  previousPlayback,
  revealEnabled = true,
}: LogoEffectPlaybackTransition): LogoEffectStartMode {
  if (!revealEnabled) return "settled";
  if (previousPlayback === null) {
    return resolveInitialLogoEffectStartMode(initialStartMode, fallbackWasExposed);
  }
  const repeatsPlayback =
    previousPlayback.effectId === nextEffectId && previousPlayback.seed === nextSeed;
  return repeatsPlayback || prefersReducedMotion ? "settled" : "reveal";
}

export type LogoInitialPlaybackClaim = {
  primaryClaimed: boolean;
};

type LogoInitialPlayback = {
  bootMode: LogoBootMode;
  playbackKey: string;
  prefersReducedMotion: boolean;
  revealState: LogoRevealState;
};

export function claimInitialLogoEffectStartMode(
  claim: LogoInitialPlaybackClaim,
  { bootMode, playbackKey, prefersReducedMotion, revealState }: LogoInitialPlayback
): LogoEffectStartMode {
  if (playbackKey !== "primary" || claim.primaryClaimed) return "settled";
  claim.primaryClaimed = true;
  return bootMode === "fresh" && revealState === "pending" && !prefersReducedMotion
    ? "reveal"
    : "settled";
}

export function logoFrameCanGoLive(instanceCount: number) {
  return instanceCount > 0;
}
