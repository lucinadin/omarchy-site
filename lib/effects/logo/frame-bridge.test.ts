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
    assert.deepEqual(events, [0, 1, 0]);
  } finally {
    unsubscribe();
    clearLogoFrame(owner);
  }
});

test("preserves frame bytes and color adjustments, rejecting malformed frames and stale owners", () => {
  const owner = Symbol("owner");
  const staleOwner = Symbol("stale-owner");
  const bytes = new Uint8Array(80);
  bytes.set([10, 20, 30, 40]);
  const events: ({ bytes: number[]; adjustment: readonly number[]; count: number } | null)[] = [];
  const unsubscribe = subscribeToLogoFrame((frame) =>
    events.push(
      frame
        ? {
            bytes: [...frame.bytes],
            adjustment: [...frame.colorAdjustment],
            count: frame.instanceCount,
          }
        : null
    )
  );
  try {
    publishLogoFrame(owner, { bytes, colorAdjustment: [1.2, 0.8, 0.4, 0], instanceCount: 1 });
    clearLogoFrame(staleOwner);
    assert.deepEqual(events, [
      null,
      { bytes: [...bytes], adjustment: [1.2, 0.8, 0.4, 0], count: 1 },
    ]);
    assert.throws(
      () =>
        publishLogoFrame(staleOwner, {
          bytes: new Uint8Array(79),
          colorAdjustment: [1, 1, 0, 0],
          instanceCount: 1,
        }),
      RangeError
    );
    assert.equal(events.length, 2, "Invalid input must not notify listeners or replace the owner");
    clearLogoFrame(owner);
    assert.equal(events.length, 3);
    assert.equal(events[2], null);
  } finally {
    unsubscribe();
    clearLogoFrame(owner);
    clearLogoFrame(staleOwner);
  }
});
