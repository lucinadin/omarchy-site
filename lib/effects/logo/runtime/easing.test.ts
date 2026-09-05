import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { EASING_NAMES, evaluateEasing } from "@/lib/effects/logo/runtime/easing";

describe("source easing", () => {
  test("exposes the pinned 31 named CLI values", () => {
    assert.equal(EASING_NAMES.length, 31);
    assert.deepStrictEqual(EASING_NAMES.slice(0, 4), [
      "linear",
      "in_sine",
      "out_sine",
      "in_out_sine",
    ]);
    assert.deepStrictEqual(EASING_NAMES.slice(-3), ["in_bounce", "out_bounce", "in_out_bounce"]);
  });

  test("matches the default in-out-circular checkpoints", () => {
    assert.equal(evaluateEasing("in_out_circ", 0), 0);
    assert.equal(evaluateEasing("in_out_circ", 0.5), 0.5);
    assert.equal(evaluateEasing("in_out_circ", 1), 1);
    assert.ok(Math.abs(evaluateEasing("in_out_circ", 0.25) - 0.066_987_298_107_780_7) < 1e-15);
    assert.ok(Math.abs(evaluateEasing("in_out_circ", 0.75) - 0.933_012_701_892_219_3) < 1e-15);
  });

  test("preserves source endpoint and overshoot behavior before caller clamping", () => {
    assert.ok(evaluateEasing("in_sine", 1) < 1);
    assert.ok(evaluateEasing("in_back", 1) < 1);
    assert.ok(evaluateEasing("in_back", 0.25) < 0);
    assert.ok(evaluateEasing("out_back", 0.75) > 1);
  });

  test("stays finite across every SequenceEaser checkpoint", () => {
    for (const name of EASING_NAMES) {
      for (let step = 0; step <= 100; step += 1) {
        assert.ok(Number.isFinite(evaluateEasing(name, step / 100)), `${name} at ${step}`);
      }
    }
  });
});
