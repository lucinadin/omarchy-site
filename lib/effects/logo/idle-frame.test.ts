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
  test("defines an enabled configurable idle for all 37 presets", () => {
    assert.equal(LOGO_EFFECTS.length, 37);
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
    assert.notDeepEqual(
      animated.map((emission) => emission.particle.color),
      EMISSIONS.map((emission) => emission.particle.color)
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
    assert.notDeepEqual(
      applyLogoIdleFrame(EMISSIONS, horizontal, 1_000),
      applyLogoIdleFrame(EMISSIONS, vertical, 1_000)
    );
  });
});
