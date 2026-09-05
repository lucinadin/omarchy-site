import { clamp } from "@/lib/effects/logo/runtime/math";

export const EASING_NAMES = [
  "linear",
  "in_sine",
  "out_sine",
  "in_out_sine",
  "in_quad",
  "out_quad",
  "in_out_quad",
  "in_cubic",
  "out_cubic",
  "in_out_cubic",
  "in_quart",
  "out_quart",
  "in_out_quart",
  "in_quint",
  "out_quint",
  "in_out_quint",
  "in_expo",
  "out_expo",
  "in_out_expo",
  "in_circ",
  "out_circ",
  "in_out_circ",
  "in_back",
  "out_back",
  "in_out_back",
  "in_elastic",
  "out_elastic",
  "in_out_elastic",
  "in_bounce",
  "out_bounce",
  "in_out_bounce",
] as const;

export type EasingName = (typeof EASING_NAMES)[number];

function clampedEasing(name: EasingName, value: number) {
  return evaluateEasing(name, clamp(value));
}

export function easeOutCubic(value: number) {
  return evaluateEasing("out_cubic", value);
}

export function easeInOutCirc(value: number) {
  return clampedEasing("in_out_circ", value);
}

export function easeInOutSine(value: number) {
  return clampedEasing("in_out_sine", value);
}

export function easeInQuad(value: number) {
  return clampedEasing("in_quad", value);
}

export function easeInCubic(value: number) {
  return clampedEasing("in_cubic", value);
}

export function easeInExpo(value: number) {
  return clampedEasing("in_expo", value);
}

export function easeInOutQuad(value: number) {
  return clampedEasing("in_out_quad", value);
}

export function easeInOutQuart(value: number) {
  return clampedEasing("in_out_quart", value);
}

export function easeInOutExpo(value: number) {
  return clampedEasing("in_out_expo", value);
}

export function easeInOutBack(value: number) {
  return clampedEasing("in_out_back", value);
}

export function easeOutExpo(value: number) {
  return clampedEasing("out_expo", value);
}

export function easeOutSine(value: number) {
  return clampedEasing("out_sine", value);
}

export function easeOutCirc(value: number) {
  return clampedEasing("out_circ", value);
}

export function easeOutBounce(value: number) {
  return clampedEasing("out_bounce", value);
}

function outBounce(progress: number) {
  const scale = 7.5625;
  const step = 2.75;
  if (progress < 1 / step) return scale * progress ** 2;
  if (progress < 2 / step) return scale * (progress - 1.5 / step) ** 2 + 0.75;
  if (progress < 2.5 / step) return scale * (progress - 2.25 / step) ** 2 + 0.9375;
  return scale * (progress - 2.625 / step) ** 2 + 0.984375;
}

function unreachableEasing(value: never): never {
  throw new TypeError(`Unsupported easing: ${String(value)}`);
}

// Mirrors `utils/easing.rs` at the source-locked TTFX commit. The evaluator is
// intentionally unclamped; SequenceEaser clamps its result after evaluation.
// oxlint-disable-next-line eslint/complexity -- The exhaustive switch is the readable parity map to the source-locked easing enum.
export function evaluateEasing(name: EasingName, progress: number) {
  switch (name) {
    case "linear":
      return progress;
    case "in_sine":
      return 1 - Math.cos((progress * Math.PI) / 2);
    case "out_sine":
      return Math.sin((progress * Math.PI) / 2);
    case "in_out_sine":
      return -(Math.cos(Math.PI * progress) - 1) / 2;
    case "in_quad":
      return progress ** 2;
    case "out_quad":
      return 1 - (1 - progress) ** 2;
    case "in_out_quad":
      return progress < 0.5 ? 2 * progress ** 2 : 1 - (-2 * progress + 2) ** 2 / 2;
    case "in_cubic":
      return progress ** 3;
    case "out_cubic":
      return 1 - (1 - progress) ** 3;
    case "in_out_cubic":
      return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
    case "in_quart":
      return progress ** 4;
    case "out_quart":
      return 1 - (1 - progress) ** 4;
    case "in_out_quart":
      return progress < 0.5 ? 8 * progress ** 4 : 1 - (-2 * progress + 2) ** 4 / 2;
    case "in_quint":
      return progress ** 5;
    case "out_quint":
      return 1 - (1 - progress) ** 5;
    case "in_out_quint":
      return progress < 0.5 ? 16 * progress ** 5 : 1 - (-2 * progress + 2) ** 5 / 2;
    case "in_expo":
      return progress === 0 ? 0 : 2 ** (10 * progress - 10);
    case "out_expo":
      return progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
    case "in_out_expo":
      if (progress === 0 || progress === 1) return progress;
      return progress < 0.5 ? 2 ** (20 * progress - 10) / 2 : (2 - 2 ** (-20 * progress + 10)) / 2;
    case "in_circ":
      return 1 - Math.sqrt(1 - progress ** 2);
    case "out_circ":
      return Math.sqrt(1 - (progress - 1) ** 2);
    case "in_out_circ":
      return progress < 0.5
        ? (1 - Math.sqrt(1 - (2 * progress) ** 2)) / 2
        : (Math.sqrt(1 - (-2 * progress + 2) ** 2) + 1) / 2;
    case "in_back": {
      const overshoot = 1.70158;
      return (overshoot + 1) * progress ** 3 - overshoot * progress ** 2;
    }
    case "out_back": {
      const overshoot = 1.70158;
      return 1 + (overshoot + 1) * (progress - 1) ** 3 + overshoot * (progress - 1) ** 2;
    }
    case "in_out_back": {
      const overshoot = 1.70158 * 1.525;
      return progress < 0.5
        ? ((2 * progress) ** 2 * ((overshoot + 1) * 2 * progress - overshoot)) / 2
        : ((2 * progress - 2) ** 2 * ((overshoot + 1) * (progress * 2 - 2) + overshoot) + 2) / 2;
    }
    case "in_elastic": {
      if (progress === 0 || progress === 1) return progress;
      const period = (2 * Math.PI) / 3;
      return -(2 ** (10 * progress - 10)) * Math.sin((progress * 10 - 10.75) * period);
    }
    case "out_elastic": {
      if (progress === 0 || progress === 1) return progress;
      const period = (2 * Math.PI) / 3;
      return 2 ** (-10 * progress) * Math.sin((progress * 10 - 0.75) * period) + 1;
    }
    case "in_out_elastic": {
      if (progress === 0 || progress === 1) return progress;
      const period = (2 * Math.PI) / 4.5;
      return progress < 0.5
        ? -(2 ** (20 * progress - 10) * Math.sin((20 * progress - 11.125) * period)) / 2
        : (2 ** (-20 * progress + 10) * Math.sin((20 * progress - 11.125) * period)) / 2 + 1;
    }
    case "in_bounce":
      return 1 - outBounce(1 - progress);
    case "out_bounce":
      return outBounce(progress);
    case "in_out_bounce":
      return progress < 0.5
        ? (1 - outBounce(1 - 2 * progress)) / 2
        : (1 + outBounce(2 * progress - 1)) / 2;
    default:
      return unreachableEasing(name);
  }
}
