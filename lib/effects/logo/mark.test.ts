import assert from "node:assert/strict";
import test from "node:test";

import {
  createOmarchyMarkPath,
  OMARCHY_MARK,
  OMARCHY_MARK_COLUMNS,
  OMARCHY_MARK_PATH,
  OMARCHY_MARK_ROWS,
  OMARCHY_MARK_VIEW_BOX,
} from "@/lib/effects/logo/mark";

type MarkRectangle = {
  height: 1;
  width: number;
  x: number;
  y: number;
};

function parseMarkPath(path: string) {
  const rectangles: MarkRectangle[] = [];
  const command = /M(\d+) (\d+)h(\d+)v1h-(\d+)z/gu;
  let consumed = 0;

  for (const match of path.matchAll(command)) {
    assert.equal(match.index, consumed, "path contains an unexpected command");
    assert.equal(match[3], match[4], "path rectangle does not close at its starting x");
    rectangles.push({
      height: 1,
      width: Number(match[3]),
      x: Number(match[1]),
      y: Number(match[2]),
    });
    consumed += match[0].length;
  }

  assert.equal(consumed, path.length, "path contains trailing data");
  return rectangles;
}

function pixelsFromRectangles(rectangles: readonly MarkRectangle[]) {
  const pixels = new Set<string>();
  for (const rectangle of rectangles) {
    for (let x = rectangle.x; x < rectangle.x + rectangle.width; x += 1) {
      const key = `${x},${rectangle.y}`;
      assert.equal(pixels.has(key), false, `path overlaps pixel ${key}`);
      pixels.add(key);
    }
  }
  return pixels;
}

function pixelsFromMark(mark: string) {
  const pixels = new Set<string>();
  mark.split("\n").forEach((row, rowIndex) => {
    Array.from(row).forEach((glyph, column) => {
      if (glyph === "█" || glyph === "▀") pixels.add(`${column},${rowIndex * 2}`);
      if (glyph === "█" || glyph === "▄") pixels.add(`${column},${rowIndex * 2 + 1}`);
    });
  });
  return pixels;
}

test("maps block glyph halves and coalesces horizontal runs", () => {
  assert.equal(createOmarchyMarkPath("█▀▄"), "M0 0h2v1h-2zM0 1h1v1h-1zM2 1h1v1h-1z");
  assert.equal(createOmarchyMarkPath("▀\n▄"), "M0 0h1v1h-1zM0 3h1v1h-1z");
  assert.throws(() => createOmarchyMarkPath("x"), /Unsupported Omarchy mark glyph: x/u);
});

test("canonical path exactly represents the 81 by 20 mark grid", () => {
  const rows = OMARCHY_MARK.split("\n").map((row) => Array.from(row));
  assert.equal(rows.length, OMARCHY_MARK_ROWS);
  assert.equal(
    rows.every((row) => row.length <= OMARCHY_MARK_COLUMNS),
    true
  );
  assert.equal(
    rows.flat().every((glyph) => glyph === " " || "█▀▄".includes(glyph)),
    true
  );
  assert.equal(OMARCHY_MARK_VIEW_BOX, "0 0 81 20");
  assert.equal(OMARCHY_MARK_PATH, createOmarchyMarkPath(OMARCHY_MARK));

  const rectangles = parseMarkPath(OMARCHY_MARK_PATH);
  assert.equal(rectangles.length, 211);
  assert.equal(
    rectangles.reduce((area, rectangle) => area + rectangle.width * rectangle.height, 0),
    738
  );
  assert.equal(Math.min(...rectangles.map((rectangle) => rectangle.x)), 0);
  assert.equal(Math.max(...rectangles.map((rectangle) => rectangle.x + rectangle.width)), 81);
  assert.equal(Math.min(...rectangles.map((rectangle) => rectangle.y)), 1);
  assert.equal(Math.max(...rectangles.map((rectangle) => rectangle.y + rectangle.height)), 20);
  assert.deepEqual(pixelsFromRectangles(rectangles), pixelsFromMark(OMARCHY_MARK));
});
