import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createFrameHealthMonitor, renderQualityDpr } from "./adaptive-quality";

const SIXTY_FPS_FRAME_MS = 1_000 / 60;
const THIRTY_FPS_FRAME_MS = 1_000 / 30;

describe("adaptive rendering quality", () => {
  test("keeps high quality when presented frames meet the display target", () => {
    const health = createFrameHealthMonitor();
    let downgrade = false;
    for (let frame = 0; frame < 180; frame += 1) {
      downgrade = health.record({ active: true, deltaMs: SIXTY_FPS_FRAME_MS, rendered: true });
    }
    assert.equal(downgrade, false);
  });

  test("requests low quality after two active seconds below the target", () => {
    const health = createFrameHealthMonitor();
    let downgrade = false;
    for (let frame = 0; frame < 90; frame += 1) {
      downgrade = health.record({ active: true, deltaMs: THIRTY_FPS_FRAME_MS, rendered: true });
    }
    assert.equal(downgrade, true);
  });

  test("judges a fixed-step animation by its presentation target, not display refresh", () => {
    const health = createFrameHealthMonitor();
    let downgrade = false;
    for (let frame = 0; frame < 360; frame += 1) {
      downgrade = health.record({
        active: true,
        deltaMs: 1_000 / 120,
        rendered: frame % 2 === 0,
        targetFps: 60,
      });
    }
    assert.equal(downgrade, false);
  });

  test("does not count hidden time or a suspended frame as poor performance", () => {
    const health = createFrameHealthMonitor();
    for (let frame = 0; frame < 50; frame += 1) {
      health.record({ active: true, deltaMs: THIRTY_FPS_FRAME_MS, rendered: true });
    }
    health.record({ active: false, deltaMs: 1_000, rendered: false });

    let downgrade = false;
    for (let frame = 0; frame < 30; frame += 1) {
      downgrade = health.record({ active: true, deltaMs: SIXTY_FPS_FRAME_MS, rendered: true });
    }
    assert.equal(downgrade, false);
  });

  test("renders low quality at one device pixel and clamps high quality to two", () => {
    assert.equal(renderQualityDpr("low", 3), 1);
    assert.equal(renderQualityDpr("high", 3), 2);
    assert.equal(renderQualityDpr("high", 1.5), 1.5);
  });
});
