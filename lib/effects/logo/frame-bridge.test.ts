import assert from "node:assert/strict";
import { test } from "node:test";

import {
  clearLogoFrame,
  LOGO_EFFECT_INSTANCE_BYTES,
  publishLogoFrame,
  subscribeToLogoFrame,
} from "@/lib/effects/logo/frame-bridge";

test("removes a subscriber whose initial frame setup fails", () => {
  const owner = Symbol("failed-subscriber");
  const failure = new Error("GPU buffer setup failed");
  let calls = 0;
  assert.throws(
    () =>
      subscribeToLogoFrame(() => {
        calls += 1;
        throw failure;
      }),
    failure
  );
  try {
    publishLogoFrame(owner, {
      bytes: new Uint8Array(0),
      colorAdjustment: [1, 1, 0, 0],
      instanceCount: 0,
    });
    assert.equal(calls, 1);
  } finally {
    clearLogoFrame(owner);
  }
});

test("publishes logo frame changes and clears inactive frames", () => {
  const owner = Symbol("frame-owner");
  publishLogoFrame(owner, {
    bytes: new Uint8Array(0),
    colorAdjustment: [1, 1, 0, 0],
    instanceCount: 0,
  });
  clearLogoFrame(owner);

  const events: number[] = [];
  const unsubscribe = subscribeToLogoFrame((snapshot) => {
    events.push(snapshot?.instanceCount ?? 0);
  });

  try {
    publishLogoFrame(owner, {
      bytes: new Uint8Array(LOGO_EFFECT_INSTANCE_BYTES),
      colorAdjustment: [1, 1, 0, 0],
      instanceCount: 1,
    });
    clearLogoFrame(owner);
    assert.deepEqual(events.slice(-3), [0, 1, 0]);
  } finally {
    unsubscribe();
    clearLogoFrame(owner);
  }
});
