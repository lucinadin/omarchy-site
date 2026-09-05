import type { Rgb } from "@/lib/color";
import type { LOGO_GRADIENT_DIRECTIONS } from "@/lib/effects/logo/defaults";
import { clamp } from "@/lib/effects/logo/runtime/math";
import type { LogoPoint } from "@/lib/effects/logo/types";
import { unreachable } from "@/lib/validation";

type GradientDirection = (typeof LOGO_GRADIENT_DIRECTIONS)[number];

export type GridBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

/** Python-compatible `round()` used by the source-locked TTFX runtime. */
export function roundHalfEven(value: number) {
  const floor = Math.floor(value);
  const difference = value - floor;
  if (difference > 0.5) return floor + 1;
  if (difference < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

/** Exact port of TTFX `Animation.adjust_color_brightness`. */
export function adjustColorBrightness(color: Rgb, brightness: number): Rgb {
  const red = color[0] / 255;
  const green = color[1] / 255;
  const blue = color[2] / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  let lightness = (maximum + minimum) / 2;
  let hue = 0;
  let saturation = 0;

  if (maximum !== minimum) {
    const difference = maximum - minimum;
    saturation =
      lightness > 0.5 ? difference / (2 - maximum - minimum) : difference / (maximum + minimum);
    if (maximum === red) hue = (green - blue) / difference + (green < blue ? 6 : 0);
    else if (maximum === green) hue = (blue - red) / difference + 2;
    else hue = (red - green) / difference + 4;
    hue /= 6;
  }

  lightness = clamp(lightness * brightness);
  if (saturation === 0) {
    const channel = roundHalfEven(lightness * 255);
    return [channel, channel, channel];
  }

  const intensity =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const lightnessScale = 2 * lightness - intensity;
  const hueToRgb = (hueValue: number) => {
    let normalizedHue = hueValue;
    if (normalizedHue < 0) normalizedHue += 1;
    if (normalizedHue > 1) normalizedHue -= 1;
    if (normalizedHue < 1 / 6) {
      return lightnessScale + (intensity - lightnessScale) * 6 * normalizedHue;
    }
    if (normalizedHue < 1 / 2) return intensity;
    if (normalizedHue < 2 / 3) {
      return lightnessScale + (intensity - lightnessScale) * (2 / 3 - normalizedHue) * 6;
    }
    return lightnessScale;
  };

  return [
    roundHalfEven(hueToRgb(hue + 1 / 3) * 255),
    roundHalfEven(hueToRgb(hue) * 255),
    roundHalfEven(hueToRgb(hue - 1 / 3) * 255),
  ];
}

export function boundsFromPoints(points: readonly LogoPoint[]): GridBounds {
  return points.reduce<GridBounds>(
    (bounds, point) => ({
      bottom: Math.min(bounds.bottom, point.row),
      left: Math.min(bounds.left, point.column),
      right: Math.max(bounds.right, point.column),
      top: Math.max(bounds.top, point.row),
    }),
    { bottom: Number.POSITIVE_INFINITY, left: Number.POSITIVE_INFINITY, right: 1, top: 1 }
  );
}

export function normalizedDistanceFromCenter(point: LogoPoint, bounds: GridBounds) {
  const rowOffset = bounds.bottom - 1;
  const columnOffset = bounds.left - 1;
  const right = bounds.right - columnOffset;
  const top = bounds.top - rowOffset;
  const column = point.column - columnOffset;
  const row = point.row - rowOffset;
  const centerColumn = right / 2;
  const centerRow = top / 2;
  const maximumDistance = Math.hypot(right, top * 2);
  return Math.hypot(column - centerColumn, (row - centerRow) * 2) / (maximumDistance / 2);
}

/** Exact fraction used by TTFX `Gradient.build_coordinate_color_mapping`. */
export function gradientFraction(
  point: LogoPoint,
  bounds: GridBounds,
  direction: GradientDirection
) {
  const rowOffset = bounds.bottom - 1;
  const columnOffset = bounds.left - 1;
  const column = point.column - columnOffset;
  const row = point.row - rowOffset;
  const right = bounds.right - columnOffset;
  const top = bounds.top - rowOffset;

  switch (direction) {
    case "horizontal":
      return column / right;
    case "vertical":
      return row / top;
    case "diagonal":
      return (row * 2 + column) / (top * 2 + right);
    case "radial":
      return normalizedDistanceFromCenter(point, bounds);
    default:
      return unreachable(direction);
  }
}

export function lineLength(start: LogoPoint, end: LogoPoint, doubleRow = true) {
  const rowDifference = end.row - start.row;
  return Math.hypot(end.column - start.column, doubleRow ? rowDifference * 2 : rowDifference);
}

export function pointOnLine(start: LogoPoint, end: LogoPoint, progress: number): LogoPoint {
  return {
    column: roundHalfEven((1 - progress) * start.column + progress * end.column),
    row: roundHalfEven((1 - progress) * start.row + progress * end.row),
  };
}

export function pointOnQuadraticBezier(
  start: LogoPoint,
  control: LogoPoint,
  end: LogoPoint,
  progress: number
): LogoPoint {
  const inverse = 1 - progress;
  const left = {
    column: inverse * start.column + progress * control.column,
    row: inverse * start.row + progress * control.row,
  };
  const right = {
    column: inverse * control.column + progress * end.column,
    row: inverse * control.row + progress * end.row,
  };
  return {
    column: roundHalfEven(inverse * left.column + progress * right.column),
    row: roundHalfEven(inverse * left.row + progress * right.row),
  };
}

/** Preserves TTFX's deliberate 0.1…0.9 sampled-length quirk. */
export function quadraticBezierLength(start: LogoPoint, control: LogoPoint, end: LogoPoint) {
  let length = 0;
  let previous = start;
  for (let sample = 1; sample < 10; sample += 1) {
    const current = pointOnQuadraticBezier(start, control, end, sample / 10);
    length += lineLength(previous, current);
    previous = current;
  }
  return length;
}

export function buildGradient(
  stops: readonly Rgb[],
  configuredSteps: readonly number[],
  loop = false
) {
  if (stops.length === 1) {
    return Array.from({ length: configuredSteps[0] }, () => stops[0]);
  }

  const gradientStops = loop ? [...stops, stops[0]] : [...stops];
  const pairCount = gradientStops.length - 1;
  const steps = configuredSteps.slice(0, pairCount);
  while (steps.length < pairCount) steps.push(steps.at(-1) ?? 1);

  const spectrum: Rgb[] = [];
  for (let pair = 0; pair < pairCount; pair += 1) {
    const start = gradientStops[pair];
    const end = gradientStops[pair + 1];
    const stepCount = steps[pair];
    const delta = [
      Math.floor((end[0] - start[0]) / stepCount),
      Math.floor((end[1] - start[1]) / stepCount),
      Math.floor((end[2] - start[2]) / stepCount),
    ] as const;
    const firstStep = spectrum.length === 0 ? 0 : 1;
    for (let step = firstStep; step < stepCount; step += 1) {
      spectrum.push([
        clamp(start[0] + delta[0] * step, 0, 255),
        clamp(start[1] + delta[1] * step, 0, 255),
        clamp(start[2] + delta[2] * step, 0, 255),
      ]);
    }
    spectrum.push(end);
  }
  return spectrum;
}

export function colorAtFraction(spectrum: readonly Rgb[], fraction: number) {
  const index = Math.max(0, Math.ceil(clamp(fraction) * spectrum.length) - 1);
  return spectrum[index];
}

export function colorAtGridPoint(
  spectrum: readonly Rgb[],
  point: LogoPoint,
  bounds: GridBounds,
  direction: GradientDirection
) {
  return colorAtFraction(spectrum, gradientFraction(point, bounds, direction));
}
