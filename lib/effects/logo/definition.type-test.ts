import type { Rgb } from "@/lib/color";
import {
  literalLogoColor,
  themeLogoColor,
  type LogoEffectColorBinding,
} from "@/lib/effects/logo/color-bindings";
import {
  defineLogoEffect,
  type LogoEffectAuthorRuntime,
  type LogoEffectDefinitionModule,
} from "@/lib/effects/logo/definition";
import {
  defineLogoEffectSchema,
  logoEffectField,
  type LogoEffectAuthorValues,
  type LogoEffectRuntimeValues,
} from "@/lib/effects/logo/schema";
import type { LogoEffectContext } from "@/lib/effects/logo/types";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Condition extends true> = Condition;

const fixtureSchema = defineLogoEffectSchema({
  colors: logoEffectField.colors({
    label: "Colors",
    tier: "identity",
    update: "restart",
  }),
  controls: logoEffectField.group({
    fields: {
      glyph: logoEffectField.symbol({
        label: "Glyph",
        tier: "identity",
        update: "restart",
      }),
      pointer: logoEffectField.boolean({
        label: "Pointer",
        tier: "interaction",
        update: "live",
      }),
    },
    label: "Controls",
    tier: "interaction",
  }),
  direction: logoEffectField.choice({
    label: "Direction",
    options: ["forward", "reverse"],
    tier: "advanced",
    update: "rebuild",
  }),
  intensity: logoEffectField.number({
    editor: { maximum: 8, minimum: 1, step: 1 },
    label: "Intensity",
    tier: "advanced",
    update: "live",
  }),
  sourceFrames: logoEffectField.number({
    constraint: { integer: true, minimum: 1 },
    editor: { maximum: 16, minimum: 1, step: 1 },
    label: "Source frames",
    tier: "advanced",
    update: "source-metadata",
  }),
});

type FixtureAuthorValues = LogoEffectAuthorValues<typeof fixtureSchema>;
type FixtureRuntimeValues = LogoEffectRuntimeValues<typeof fixtureSchema>;

export type LogoEffectAuthorInferenceFixture = Expect<
  Equal<
    FixtureAuthorValues,
    {
      readonly colors: readonly LogoEffectColorBinding[];
      readonly controls: {
        readonly glyph: string;
        readonly pointer: boolean;
      };
      readonly direction: "forward" | "reverse";
      readonly intensity: number;
      readonly sourceFrames: number;
    }
  >
>;

export type LogoEffectRuntimeInferenceFixture = Expect<
  Equal<
    FixtureRuntimeValues,
    {
      readonly colors: readonly Rgb[];
      readonly controls: {
        readonly glyph: string;
        readonly pointer: boolean;
      };
      readonly direction: "forward" | "reverse";
      readonly intensity: number;
    }
  >
>;

function noFixtureRuntimeBehavior() {
  // This fixture exists only to prove the author/runtime type boundary.
}

function createFixtureRuntime(
  context: LogoEffectContext,
  initialValues: FixtureRuntimeValues
): LogoEffectAuthorRuntime<FixtureRuntimeValues> {
  let values = initialValues;
  return {
    configure(nextValues) {
      values = nextValues;
    },
    get instanceCapacity() {
      return context.cells.length + values.intensity;
    },
    pointerEnabled() {
      return values.controls.pointer;
    },
    reset: noFixtureRuntimeBehavior,
    settle: noFixtureRuntimeBehavior,
    status: "settled",
    step: noFixtureRuntimeBehavior,
    usesPointer: true,
    writeInstances: noFixtureRuntimeBehavior,
  };
}

const fixtureEffect = defineLogoEffect({
  createRuntime: createFixtureRuntime,
  defaults: {
    capabilities: { ambient: true },
    playback: { mode: "once", revealRate: 1 },
    presentation: {
      contrast: 1,
      glow: 1,
      grayscale: 0,
      glyphs: { default: { kind: "source" }, overrides: {} },
      pixelSize: 1,
      saturation: 1,
      scanlines: 0,
    },
    values: {
      colors: [
        themeLogoColor("accent", [255, 159, 10]),
        literalLogoColor([255, 255, 255], "Pinned source parity"),
      ],
      controls: { glyph: "*", pointer: false },
      direction: "forward",
      intensity: 4,
      sourceFrames: 4,
    },
  },
  id: "fixture",
  label: "Fixture",
  schema: fixtureSchema,
  source: {
    attribution: "TTFX",
    commit: "7203e354498462064b7c0a89375051f65cf2ce99",
    effect: "laseretch",
    project: "ttfx",
    repository: "https://github.com/omacom/ttfx",
    sourceUrl:
      "https://github.com/omacom/ttfx/blob/7203e354498462064b7c0a89375051f65cf2ce99/src/effects/laseretch.rs",
    version: "0.3.2",
  },
});

export type LogoEffectCapabilityFixture = Expect<Equal<typeof fixtureEffect.id, "fixture">>;

export const logoEffectDefinitionModuleFixture = {
  logoEffect: fixtureEffect,
} satisfies LogoEffectDefinitionModule<"fixture">;
