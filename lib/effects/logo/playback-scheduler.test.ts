import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { advanceRevealLoop } from "@/lib/effects/logo/playback-scheduler";

describe("logo reveal repeat scheduler", () => {
  test("starts the repeat hold when a reveal completes", () => {
    assert.deepEqual(
      advanceRevealLoop({
        deltaMs: 125,
        enabled: true,
        elapsedMs: 875,
        repeatDelayMs: 1_000,
        statusAfter: "settled",
        statusBefore: "revealing",
      }),
      { completedReveal: true, elapsedMs: 0, restart: false }
    );
  });

  test("holds the settled frame before the repeat threshold", () => {
    assert.deepEqual(
      advanceRevealLoop({
        deltaMs: 599,
        enabled: true,
        elapsedMs: 400,
        repeatDelayMs: 1_000,
        statusAfter: "settled",
        statusBefore: "settled",
      }),
      { completedReveal: false, elapsedMs: 999, restart: false }
    );
  });

  test("restarts when the repeat hold reaches its threshold", () => {
    assert.deepEqual(
      advanceRevealLoop({
        deltaMs: 1,
        enabled: true,
        elapsedMs: 999,
        repeatDelayMs: 1_000,
        statusAfter: "settled",
        statusBefore: "settled",
      }),
      { completedReveal: false, elapsedMs: 0, restart: true }
    );
  });

  test("a zero delay waits for the first positive tick", () => {
    const step = {
      enabled: true,
      elapsedMs: 0,
      repeatDelayMs: 0,
      statusAfter: "settled" as const,
      statusBefore: "settled" as const,
    };

    assert.deepEqual(advanceRevealLoop({ ...step, deltaMs: 0 }), {
      completedReveal: false,
      elapsedMs: 0,
      restart: false,
    });
    assert.deepEqual(advanceRevealLoop({ ...step, deltaMs: 1 }), {
      completedReveal: false,
      elapsedMs: 0,
      restart: true,
    });
  });
});
