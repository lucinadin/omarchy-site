import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { EASING_NAMES, evaluateEasing } from "@/lib/effects/logo/runtime/easing";
import {
  adjustColorBrightness,
  buildGradient,
  colorAtFraction,
  gradientFraction,
  normalizedDistanceFromCenter,
  pointOnLine,
  pointOnQuadraticBezier,
  quadraticBezierLength,
  roundHalfEven,
} from "@/lib/effects/logo/runtime/graphics";
import { SeededRandom } from "@/lib/effects/logo/runtime/random";

describe("source-locked runtime primitives", () => {
  test("preserves Python floor gradients and coordinate mapping", () => {
    const spectrum = buildGradient(
      [
        [10, 20, 30],
        [5, 29, 45],
        [20, 10, 0],
      ],
      [3]
    );
    assert.deepEqual(spectrum, [
      [10, 20, 30],
      [8, 23, 35],
      [6, 26, 40],
      [5, 29, 45],
      [10, 22, 30],
      [15, 15, 15],
      [20, 10, 0],
    ]);
    assert.deepEqual(colorAtFraction(spectrum, 0), spectrum[0]);
    assert.deepEqual(colorAtFraction(spectrum, 1), spectrum.at(-1));

    const bounds = { bottom: 3, left: 5, right: 12, top: 8 };
    const point = { column: 7, row: 6 };
    assert.equal(gradientFraction(point, bounds, "horizontal"), 3 / 8);
    assert.equal(gradientFraction(point, bounds, "vertical"), 4 / 6);
    assert.equal(gradientFraction(point, bounds, "diagonal"), 11 / 20);
    assert.equal(
      gradientFraction(point, bounds, "radial"),
      normalizedDistanceFromCenter(point, bounds)
    );
  });

  test("preserves half-even rounding, HSL brightness, and geometry quirks", () => {
    assert.deepEqual([-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map(roundHalfEven), [-2, -2, 0, 0, 2, 2]);
    assert.deepEqual(adjustColorBrightness([146, 190, 146], 0.65), [82, 137, 82]);
    assert.deepEqual(adjustColorBrightness([255, 255, 255], 1.7), [255, 255, 255]);
    assert.deepEqual(pointOnLine({ column: 0, row: 0 }, { column: 5, row: 3 }, 0.5), {
      column: 2,
      row: 2,
    });
    assert.deepEqual(
      pointOnQuadraticBezier(
        { column: 0, row: 0 },
        { column: 5, row: 8 },
        { column: 10, row: 0 },
        0.5
      ),
      { column: 5, row: 4 }
    );
    assert.equal(
      quadraticBezierLength({ column: 0, row: 0 }, { column: 5, row: 8 }, { column: 10, row: 0 }),
      18.954415183734692
    );
  });

  test("keeps the pinned easing surface and xoshiro256++ stream deterministic", () => {
    for (const name of EASING_NAMES) {
      assert.ok(Math.abs(evaluateEasing(name, 0)) < 1e-12);
      assert.ok(Math.abs(evaluateEasing(name, 1) - 1) < 1e-12);
    }

    const floats = new SeededRandom(42);
    assert.deepEqual(
      Array.from({ length: 4 }, () => floats.random()),
      [0.8143051451229099, 0.3188210400616611, 0.9838941681774888, 0.7011355981347556]
    );
    const integers = new SeededRandom(42);
    assert.deepEqual(
      Array.from({ length: 8 }, () => integers.integer(-3, 3)),
      [3, -1, 2, 3, 1, -2, 1, -2]
    );
    const shuffled = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    new SeededRandom(42).shuffle(shuffled);
    assert.deepEqual(shuffled, [3, 9, 8, 6, 0, 7, 1, 4, 2, 5]);
  });
});
