import { readdirSync } from "node:fs";

import { resolveLogoEffectFallbackColor } from "@/lib/effects/logo/color-bindings";
import { OMARCHY_MARK } from "@/lib/effects/logo/mark";
import { LOGO_EFFECTS, loadLogoEffect } from "@/lib/effects/logo/registry";
import { createLogoCells } from "@/lib/effects/logo/runtime/grid";
import type {
  GlyphParticle,
  LogoEffectInstanceWriter,
  LogoInteraction,
  LogoPalette,
  LogoEffectRuntimeCore,
} from "@/lib/effects/logo/types";

const SOURCE_EFFECT_IDS = readdirSync("lib/effects/logo/definitions")
  .filter((file) => !file.endsWith(".test.ts"))
  .map((file) => file.slice(0, -3))
  .toSorted();

const EMPTY_INTERACTION: LogoInteraction = {
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

const PALETTE: LogoPalette = {
  bright: [238, 241, 255],
  ciphertext: [
    [158, 206, 106],
    [159, 224, 68],
    [68, 157, 171],
  ],
  final: [122, 162, 247],
  laser: [
    [224, 175, 104],
    [255, 158, 100],
    [68, 157, 171],
  ],
  muted: [120, 130, 170],
};

const cells = createLogoCells(OMARCHY_MARK);

function capture(runtime: LogoEffectRuntimeCore) {
  const particles: GlyphParticle[] = [];
  const writer: LogoEffectInstanceWriter = {
    capacity: runtime.instanceCapacity,
    get count() {
      return particles.length;
    },
    push(particle) {
      if (particles.length >= runtime.instanceCapacity) {
        throw new RangeError(
          `Effect emitted more than its declared ${runtime.instanceCapacity} instances`
        );
      }
      particles.push(particle);
    },
  };
  runtime.writeInstances(writer);
  return { count: particles.length, serialized: JSON.stringify(particles) };
}

function assertEqual<Actual, Expected>(actual: Actual, expected: Expected, message: string) {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

async function auditRuntime(effectId: (typeof LOGO_EFFECTS)[number]["id"]) {
  const effect = await loadLogoEffect(effectId);
  assertEqual(Object.keys(effect).toSorted().join(","), "logoEffect", `${effectId} module exports`);
  assertEqual(effect.logoEffect.id, effectId, `${effectId} definition identity`);
  const source = effect.logoEffect.source;
  if (source === undefined) {
    throw new Error(`${effectId} is missing its TTFX source reference`);
  }
  assertEqual(source.attribution, "TTFX", `${effectId} source attribution`);
  assertEqual(source.effect, effectId, `${effectId} source effect`);
  assertEqual(source.project, "ttfx", `${effectId} source project`);
  if (!source.sourceUrl.startsWith(`${source.repository}/blob/${source.commit}/src/effects/`)) {
    throw new Error(`${effectId} has an invalid pinned TTFX source URL`);
  }
  if (Object.keys(effect.logoEffect.schema).length === 0) {
    throw new Error(`${effectId} has no schema-owned settings`);
  }
  const context = { cells, palette: PALETTE, seed: 0x0a11_ce55 };
  const prepared = effect.logoEffect.prepareDefaults(resolveLogoEffectFallbackColor);
  assertEqual(prepared.presentation.scanlines, 0, `${effectId} default scanlines`);
  const first = prepared.createRuntime(context);
  const second = prepared.createRuntime(context);
  first.reset();
  second.reset();
  let maxInstances = 0;

  for (let frame = 0; frame < 5_000; frame += 1) {
    const firstFrame = capture(first);
    const secondFrame = capture(second);
    assertEqual(
      firstFrame.serialized,
      secondFrame.serialized,
      `${effectId} diverged at frame ${frame}`
    );
    maxInstances = Math.max(maxInstances, firstFrame.count);
    if (first.status !== "revealing" && second.status !== "revealing") break;
    first.step({ deltaTicks: 4, interaction: EMPTY_INTERACTION });
    second.step({ deltaTicks: 4, interaction: EMPTY_INTERACTION });
    if (frame === 4_999) {
      throw new Error(`${effectId} did not settle`);
    }
  }

  first.settle();
  second.settle();
  assertEqual(first.status === "revealing", false, `${effectId} reduced-motion settle failed`);
  const settled = capture(first);
  const settledAgain = capture(first);
  assertEqual(
    settled.serialized,
    settledAgain.serialized,
    `${effectId} settled frame is not stable`
  );
  assertEqual(
    settled.serialized,
    capture(second).serialized,
    `${effectId} reduced-motion output diverged`
  );
  return Math.max(maxInstances, settled.count);
}

const catalogIds = LOGO_EFFECTS.map(({ id }) => id).toSorted();
assertEqual(
  catalogIds.join(","),
  [...SOURCE_EFFECT_IDS].toSorted().join(","),
  "source catalog parity"
);

const results: { capacity: number; effect: string; maximum: number }[] = [];
for (const { id } of LOGO_EFFECTS) {
  const effect = await loadLogoEffect(id);
  const capacity = effect.logoEffect
    .prepareDefaults(resolveLogoEffectFallbackColor)
    .createRuntime({ cells, palette: PALETTE, seed: 0x0a11_ce55 }).instanceCapacity;
  const maximum = await auditRuntime(id);
  results.push({ capacity, effect: id, maximum });
}

console.table(results);
console.log(
  `Audited ${results.length} schema-owned effects: catalog parity, source references, module shape, zero default scanlines, deterministic replay, instance capacity, and reduced-motion settling all passed.`
);
