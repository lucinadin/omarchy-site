import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { resolveLogoEffectFallbackColor } from "@/lib/effects/logo/color-bindings";
import { logoEffect as colorShift } from "@/lib/effects/logo/definitions/colorshift";
import { logoEffect as laserEtch } from "@/lib/effects/logo/definitions/laseretch";
import { logoEffect as wipe } from "@/lib/effects/logo/definitions/wipe";
import { OMARCHY_MARK } from "@/lib/effects/logo/mark";
import { createLogoCells } from "@/lib/effects/logo/runtime/grid";
import { LOGO_EFFECT_TICK_MS } from "@/lib/effects/logo/sampled-runtime";
import type {
  GlyphParticle,
  LogoEffectContext,
  LogoGlyphChannel,
  LogoInteraction,
  LogoEffectRuntimeCore,
} from "@/lib/effects/logo/types";

const NO_INTERACTION: LogoInteraction = {
  current: null,
  inside: false,
  pointerType: "mouse",
  pressed: false,
  previous: null,
  primaryDown: false,
  released: false,
  trail: [],
  velocity: { columnPerSecond: 0, rowPerSecond: 0 },
};

const CONTEXT = {
  cells: createLogoCells(OMARCHY_MARK),
  palette: {
    bright: [240, 244, 255],
    ciphertext: [
      [122, 162, 247],
      [158, 206, 106],
      [68, 157, 171],
    ],
    final: [122, 162, 247],
    laser: [
      [240, 244, 255],
      [68, 157, 171],
      [122, 162, 247],
    ],
    muted: [120, 130, 170],
  },
  seed: 172_773_191,
} as const satisfies LogoEffectContext;

function collectInstances(runtime: LogoEffectRuntimeCore) {
  const instances: (GlyphParticle & { channel: LogoGlyphChannel })[] = [];
  runtime.writeInstances({
    capacity: runtime.instanceCapacity,
    get count() {
      return instances.length;
    },
    push(particle, channel) {
      instances.push({ ...particle, channel });
    },
  });
  return instances;
}

function expectAnimatedIdle(
  definition: typeof colorShift | typeof laserEtch | typeof wipe,
  elapsedMs: number
) {
  const runtime = definition.prepareDefaults(resolveLogoEffectFallbackColor).createRuntime(CONTEXT);
  runtime.settle();
  assert.equal(runtime.status, "ambient");
  const settled = collectInstances(runtime);
  runtime.step({ deltaTicks: elapsedMs / LOGO_EFFECT_TICK_MS, interaction: NO_INTERACTION });
  const idle = collectInstances(runtime);
  assert.ok(settled.length > 0);
  assert.ok(idle.length > 0);
  for (const particle of idle) {
    assert.ok(Number.isFinite(particle.column) && Number.isFinite(particle.row));
    assert.ok(
      particle.color.every((channel) => Number.isFinite(channel) && channel >= 0 && channel <= 255)
    );
  }
  assert.notDeepEqual(idle, settled);
}

describe("authored logo preset idles", () => {
  test("LaserEtch emits finite, non-static idle frames after settling", () => {
    expectAnimatedIdle(laserEtch, 350);
  });

  test("Wipe emits finite, non-static idle frames after settling", () => {
    expectAnimatedIdle(wipe, 350);
  });

  test("Color Shift emits finite, non-static idle frames after settling", () => {
    expectAnimatedIdle(colorShift, 2_000);
  });
});
