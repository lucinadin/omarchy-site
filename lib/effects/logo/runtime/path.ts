import { clamp } from "@/lib/effects/logo/runtime/math";
import type { LogoPoint } from "@/lib/effects/logo/types";

export function interpolate(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

export function interpolatePoint(from: LogoPoint, to: LogoPoint, progress: number): LogoPoint {
  return {
    column: interpolate(from.column, to.column, progress),
    row: interpolate(from.row, to.row, progress),
  };
}

export function quadraticBezier(
  from: LogoPoint,
  control: LogoPoint,
  to: LogoPoint,
  progress: number
): LogoPoint {
  const inverse = 1 - progress;
  return {
    column:
      inverse ** 2 * from.column +
      2 * inverse * progress * control.column +
      progress ** 2 * to.column,
    row: inverse ** 2 * from.row + 2 * inverse * progress * control.row + progress ** 2 * to.row,
  };
}

export function samplePolyline(points: readonly LogoPoint[], progress: number): LogoPoint {
  const firstPoint = points[0];
  if (!firstPoint) return { column: 0, row: 0 };
  if (points.length === 1) return firstPoint;

  const lastPoint = points.at(-1) ?? firstPoint;

  const segmentLengths = points.slice(1).map((point, index) => {
    const previous = points[index];
    return Math.hypot(point.column - previous.column, point.row - previous.row);
  });
  const totalLength = segmentLengths.reduce((total, length) => total + length, 0);
  if (totalLength === 0) return lastPoint;

  let remaining = clamp(progress) * totalLength;
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const length = segmentLengths[index];
    if (remaining <= length || index === segmentLengths.length - 1) {
      return interpolatePoint(
        points[index],
        points[index + 1],
        length === 0 ? 1 : remaining / length
      );
    }
    remaining -= length;
  }

  return lastPoint;
}
