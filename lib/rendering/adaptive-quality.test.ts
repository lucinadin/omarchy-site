import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createFrameHealthMonitor, renderQualityDpr } from "./adaptive-quality";

const SIXTY_FPS_FRAME_MS = 1_000 / 60;

describe("adaptive rendering quality", () => {
  test("keeps high quality when presented frames meet the display target", () => {
    const health = createFrameHealthMonitor();
    for (let frame = 0; frame < 180; frame += 1) {
      assert.equal(
        health.record({ active: true, deltaMs: SIXTY_FPS_FRAME_MS, rendered: true }),
        false,
        `frame ${frame}`
      );
    }
  });

  test("requests low quality after two active seconds below the target", () => {
    const health = createFrameHealthMonitor();
    // 40fps uses exact 25ms samples: 79 frames are 1975ms; the 80th reaches 2000ms.
    for (let frame = 0; frame < 79; frame += 1) {
      assert.equal(
        health.record({ active: true, deltaMs: 25, rendered: true }),
        false,
        `frame ${frame}`
      );
    }
    assert.equal(health.record({ active: true, deltaMs: 25, rendered: true }), true);
    assert.equal(
      health.record({ active: true, deltaMs: SIXTY_FPS_FRAME_MS, rendered: true }),
      true,
      "Downgrade remains latched"
    );
    health.reset();
    for (let frame = 0; frame < 79; frame += 1) {
      assert.equal(
        health.record({ active: true, deltaMs: 25, rendered: true }),
        false,
        `after reset: frame ${frame}`
      );
    }
    assert.equal(health.record({ active: true, deltaMs: 25, rendered: true }), true);
  });

  test("judges a fixed-step animation by its presentation target, not display refresh", () => {
    const health = createFrameHealthMonitor();
    for (let frame = 0; frame < 360; frame += 1) {
      assert.equal(
        health.record({
          active: true,
          deltaMs: 1_000 / 120,
          rendered: frame % 2 === 0,
          targetFps: 60,
        }),
        false,
        `frame ${frame}`
      );
    }
  });

  test("does not count hidden time or a suspended frame as poor performance", () => {
    for (const interruption of [
      { active: false, deltaMs: 25, rendered: false },
      { active: true, deltaMs: 1_000, rendered: false },
    ]) {
      const health = createFrameHealthMonitor();
      for (let frame = 0; frame < 50; frame += 1) {
        assert.equal(health.record({ active: true, deltaMs: 25, rendered: true }), false);
      }
      assert.equal(health.record(interruption), false);
      for (let frame = 0; frame < 79; frame += 1) {
        assert.equal(
          health.record({ active: true, deltaMs: 25, rendered: true }),
          false,
          `after interruption: frame ${frame}`
        );
      }
      assert.equal(health.record({ active: true, deltaMs: 25, rendered: true }), true);
    }
  });

  test("renders low quality at one device pixel and clamps high quality to two", () => {
    assert.equal(renderQualityDpr("low", 3), 1);
    assert.equal(renderQualityDpr("high", 3), 2);
    assert.equal(renderQualityDpr("high", 1.5), 1.5);
  });
});
