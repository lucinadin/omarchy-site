import { clamp } from "@/lib/effects/logo/runtime/math";
import type { LogoCell, LogoEffectFrame } from "@/lib/effects/logo/types";

export function createLogoCells(mark: string): LogoCell[] {
  return mark
    .split("\n")
    .flatMap((line, row) =>
      Array.from(line).flatMap((glyph, column) =>
        glyph === " " ? [] : [{ column, glyph, index: 0, row }]
      )
    )
    .map((cell, index) => ({ ...cell, index }));
}

type LogoBounds = {
  centerColumn: number;
  centerRow: number;
  columns: number;
  maxColumn: number;
  maxRow: number;
  rows: number;
};

export function getLogoBounds(cells: readonly LogoCell[]): LogoBounds {
  const maxColumn = cells.reduce((largest, cell) => Math.max(largest, cell.column), 0);
  const maxRow = cells.reduce((largest, cell) => Math.max(largest, cell.row), 0);
  return {
    centerColumn: maxColumn / 2,
    centerRow: maxRow / 2,
    columns: maxColumn + 1,
    maxColumn,
    maxRow,
    rows: maxRow + 1,
  };
}

export function pointerProximity(
  cell: Pick<LogoCell, "column" | "row">,
  frame: LogoEffectFrame,
  radius: number
) {
  if (!frame.pointer) return 0;
  const deltaX = cell.column + 0.5 - frame.pointer.column;
  const deltaY = (cell.row + 0.5 - frame.pointer.row) * 2;
  return clamp(1 - Math.hypot(deltaX, deltaY) / radius);
}
