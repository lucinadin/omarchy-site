import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  defaultLogoEffectIdle,
  logoIdleGradientAngle,
  resolveLogoEffectIdle,
} from "@/lib/effects/logo/idle";
import { applyLogoIdleFrame, type LogoIdleEmission } from "@/lib/effects/logo/idle-frame";
import { LOGO_EFFECTS } from "@/lib/effects/logo/registry";

const EMISSIONS = [
  { channel: "finalText", particle: { color: [255, 0, 0], column: 0, glyph: "A", row: 0 } },
  { channel: "finalText", particle: { color: [0, 255, 0], column: 8, glyph: "B", row: 0 } },
  { channel: "finalText", particle: { color: [0, 0, 255], column: 0, glyph: "C", row: 8 } },
  {
    channel: "finalText",
    particle: { color: [255, 255, 255], column: 8, glyph: "D", row: 8 },
  },
] as const satisfies readonly LogoIdleEmission[];

describe("shared logo idle frames", () => {
  test("defines an enabled configurable idle for every registered effect", () => {
    assert.ok(LOGO_EFFECTS.length > 0);
    for (const effect of LOGO_EFFECTS) {
      const idle = defaultLogoEffectIdle(effect.id);
      assert.equal(idle.enabled, true, effect.id);
      assert.ok(idle.speed > 0, effect.id);
      assert.ok(idle.intensity >= 0, effect.id);
    }
  });

  test("animates the preset's emitted final colors", () => {
    const idle = resolveLogoEffectIdle("matrix", {
      animateGradient: true,
      gradientDirection: "horizontal",
      gradientSpeed: 0.25,
      intensity: 0,
    });
    const animated = applyLogoIdleFrame(EMISSIONS, idle, 1_000);
    assert.deepEqual(
      animated.map((emission) => emission.particle.color),
      [
        [255, 255, 255],
        [0, 0, 255],
        [255, 0, 0],
        [0, 255, 0],
      ]
    );
    assert.deepEqual(
      animated.map(({ particle: { column, row, glyph } }) => [column, row, glyph]),
      [
        [0, 0, "A"],
        [8, 0, "B"],
        [0, 8, "C"],
        [8, 8, "D"],
      ]
    );
  });

  test("uses the user's custom gradient angle", () => {
    const horizontal = resolveLogoEffectIdle("matrix", {
      animateGradient: true,
      gradientDirection: "custom",
      gradientAngle: 0,
      gradientSpeed: 0.25,
      intensity: 0,
    });
    const vertical = { ...horizontal, gradientAngle: 90 };
    assert.equal(logoIdleGradientAngle(horizontal), 0);
    assert.equal(logoIdleGradientAngle(vertical), 90);
    assert.deepEqual(
      applyLogoIdleFrame(EMISSIONS, horizontal, 1_000).map(({ particle }) => particle.color),
      [
        [255, 255, 255],
        [0, 0, 255],
        [255, 0, 0],
        [0, 255, 0],
      ]
    );
    assert.deepEqual(
      applyLogoIdleFrame(EMISSIONS, vertical, 1_000).map(({ particle }) => particle.color),
      [
        [255, 255, 255],
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
      ]
    );
  });
});
