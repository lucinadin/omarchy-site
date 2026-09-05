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
  assert.notDeepEqual(idle, settled);
}

describe("authored logo preset idles", () => {
  test("LaserEtch runs a pilot trace after reveal", () => {
    expectAnimatedIdle(laserEtch, 350);
  });

  test("Wipe runs a directional sheen after reveal", () => {
    expectAnimatedIdle(wipe, 350);
  });

  test("Color Shift drifts its spectrum after reveal", () => {
    expectAnimatedIdle(colorShift, 2_000);
  });
});
