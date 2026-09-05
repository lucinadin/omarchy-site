import type { LogoEffectId } from "@/lib/effects/logo/registry";
import { unreachable } from "@/lib/validation";

export const LOGO_IDLE_MOTIONS = ["pulse", "drift", "scan", "sparkle", "jitter"] as const;
export const LOGO_IDLE_GRADIENT_DIRECTIONS = [
  "horizontal",
  "vertical",
  "diagonal",
  "custom",
] as const;

type LogoIdleMotion = (typeof LOGO_IDLE_MOTIONS)[number];
type LogoIdleGradientDirection = (typeof LOGO_IDLE_GRADIENT_DIRECTIONS)[number];

export type LogoEffectIdle = {
  animateGradient: boolean;
  enabled: boolean;
  gradientAngle: number;
  gradientDirection: LogoIdleGradientDirection;
  gradientSpeed: number;
  intensity: number;
  motion: LogoIdleMotion;
  speed: number;
};

export type LogoEffectIdleOverride = Partial<LogoEffectIdle>;

const IDLE_DEFAULTS = {
  animateGradient: false,
  enabled: true,
  gradientAngle: 0,
  gradientDirection: "horizontal",
  gradientSpeed: 0.18,
  intensity: 0.35,
  motion: "pulse",
  speed: 1,
} as const satisfies LogoEffectIdle;

const LOGO_IDLE_KEYS = [
  "animateGradient",
  "enabled",
  "gradientAngle",
  "gradientDirection",
  "gradientSpeed",
  "intensity",
  "motion",
  "speed",
] as const satisfies readonly (keyof LogoEffectIdle)[];

const PRESET_IDLE_DEFAULTS = {
  laseretch: { animateGradient: false, intensity: 0.28, motion: "scan" },
  rain: { animateGradient: false, intensity: 0.22, motion: "drift" },
  decrypt: { animateGradient: false, intensity: 0.3, motion: "sparkle" },
  synthgrid: { animateGradient: false, intensity: 0.25, motion: "pulse" },
  beams: { animateGradient: false, intensity: 0.24, motion: "scan" },
  wipe: { animateGradient: false, intensity: 0.22, motion: "scan" },
  highlight: { animateGradient: false, intensity: 0.24, motion: "scan" },
  randomsequence: { animateGradient: false, intensity: 0.3, motion: "sparkle" },
  sweep: { animateGradient: false, intensity: 0.26, motion: "scan" },
  waves: { animateGradient: true, intensity: 0.28, motion: "drift" },
  colorshift: { animateGradient: true, intensity: 0.22, motion: "drift" },
  binarypath: { animateGradient: false, intensity: 0.25, motion: "scan" },
  errorcorrect: { animateGradient: false, intensity: 0.22, motion: "jitter" },
  expand: { animateGradient: false, intensity: 0.25, motion: "pulse" },
  middleout: { animateGradient: false, intensity: 0.25, motion: "pulse" },
  pour: { animateGradient: false, intensity: 0.24, motion: "scan" },
  scattered: { animateGradient: false, intensity: 0.25, motion: "drift" },
  slice: { animateGradient: false, intensity: 0.22, motion: "scan" },
  slide: { animateGradient: false, intensity: 0.24, motion: "drift" },
  spray: { animateGradient: false, intensity: 0.3, motion: "sparkle" },
  bouncyballs: { animateGradient: false, intensity: 0.3, motion: "drift" },
  bubbles: { animateGradient: false, intensity: 0.26, motion: "drift" },
  fireworks: { animateGradient: false, intensity: 0.34, motion: "sparkle" },
  orbittingvolley: { animateGradient: false, intensity: 0.27, motion: "scan" },
  rings: { animateGradient: true, intensity: 0.28, motion: "pulse" },
  swarm: { animateGradient: false, intensity: 0.3, motion: "sparkle" },
  blackhole: { animateGradient: false, intensity: 0.3, motion: "pulse" },
  burn: { animateGradient: false, intensity: 0.3, motion: "sparkle" },
  crumble: { animateGradient: false, intensity: 0.24, motion: "drift" },
  overflow: { animateGradient: false, intensity: 0.24, motion: "drift" },
  print: { animateGradient: false, intensity: 0.22, motion: "scan" },
  smoke: { animateGradient: false, intensity: 0.2, motion: "drift" },
  spotlights: { animateGradient: false, intensity: 0.3, motion: "scan" },
  unstable: { animateGradient: false, intensity: 0.28, motion: "jitter" },
  vhstape: { animateGradient: false, intensity: 0.25, motion: "jitter" },
  matrix: { animateGradient: true, intensity: 0.2, motion: "drift" },
  thunderstorm: { animateGradient: false, intensity: 0.25, motion: "sparkle" },
} as const satisfies Record<
  LogoEffectId,
  Pick<LogoEffectIdle, "animateGradient" | "intensity" | "motion">
>;

export function defaultLogoEffectIdle(effectId: LogoEffectId): LogoEffectIdle {
  return { ...IDLE_DEFAULTS, ...PRESET_IDLE_DEFAULTS[effectId] };
}

export function resolveLogoEffectIdle(
  effectId: LogoEffectId,
  override?: LogoEffectIdleOverride
): LogoEffectIdle {
  return { ...defaultLogoEffectIdle(effectId), ...override };
}

export function createSparseLogoEffectIdleOverride(
  effectId: LogoEffectId,
  idle: LogoEffectIdle
): LogoEffectIdleOverride | undefined {
  const base = defaultLogoEffectIdle(effectId);
  const result: LogoEffectIdleOverride = {};
  for (const key of LOGO_IDLE_KEYS) {
    if (!Object.is(base[key], idle[key])) {
      Object.assign(result, { [key]: idle[key] });
    }
  }
  return Object.keys(result).length === 0 ? undefined : result;
}

export function logoIdleGradientAngle(idle: LogoEffectIdle) {
  switch (idle.gradientDirection) {
    case "horizontal":
      return 0;
    case "vertical":
      return 90;
    case "diagonal":
      return 45;
    case "custom":
      return idle.gradientAngle;
    default:
      return unreachable(idle.gradientDirection);
  }
}
