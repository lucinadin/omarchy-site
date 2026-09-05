import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  resolveLogoEffectFallbackColor,
  type LogoEffectColorResolver,
} from "@/lib/effects/logo/color-bindings";
import { logoEffect as colorShiftEffect } from "@/lib/effects/logo/definitions/colorshift";
import { logoEffect as laserEtchEffect } from "@/lib/effects/logo/definitions/laseretch";
import { logoEffect as matrixEffect } from "@/lib/effects/logo/definitions/matrix";
import { logoEffect as thunderstormEffect } from "@/lib/effects/logo/definitions/thunderstorm";
import { logoEffect as wipeEffect } from "@/lib/effects/logo/definitions/wipe";
import {
  defineLogoEffectSchema,
  getLogoEffectUpdateMode,
  logoEffectField,
  resolveLogoEffectSchemaValues,
  type LogoEffectAuthorValues,
  type LogoEffectSchema,
} from "@/lib/effects/logo/schema";

const updateModeSchema = defineLogoEffectSchema({
  liveValue: logoEffectField.boolean({
    label: "Live value",
    tier: "advanced",
    update: "live",
  }),
  restartValue: logoEffectField.boolean({
    label: "Restart value",
    tier: "advanced",
    update: "restart",
  }),
  rebuildValue: logoEffectField.boolean({
    label: "Rebuild value",
    tier: "advanced",
    update: "rebuild",
  }),
});

const unchangedValues = {
  liveValue: false,
  rebuildValue: false,
  restartValue: false,
};

const visibilitySchema = defineLogoEffectSchema({
  implementation: logoEffectField.choice({
    label: "Implementation",
    options: ["source", "custom"] as const,
    tier: "identity",
    update: "live",
  }),
  sourceOnly: logoEffectField.number({
    editor: { maximum: 10, minimum: 0, step: 1 },
    label: "Source only",
    tier: "identity",
    update: "restart",
    visibleWhen: { equals: "source", field: "implementation" },
  }),
  customGroup: logoEffectField.group({
    fields: defineLogoEffectSchema({
      customOnly: logoEffectField.boolean({
        label: "Custom only",
        tier: "advanced",
        update: "rebuild",
      }),
    }),
    label: "Custom group",
    tier: "advanced",
    visibleWhen: { equals: "custom", field: "implementation" },
  }),
});

const sourceVisibilityValues = {
  implementation: "source" as const,
  sourceOnly: 1,
  customGroup: { customOnly: false },
};

const conditionalUpdateSchema = defineLogoEffectSchema({
  implementation: logoEffectField.choice({
    label: "Implementation",
    options: ["source", "custom"] as const,
    tier: "identity",
    update: "live",
  }),
  rebuildValue: logoEffectField.boolean({
    label: "Rebuild value",
    tier: "identity",
    update: "rebuild",
    updateWhen: { equals: "custom", field: "implementation", mode: "live" },
  }),
  restartValue: logoEffectField.boolean({
    label: "Restart value",
    tier: "identity",
    update: "restart",
    updateWhen: { equals: "custom", field: "implementation", mode: "live" },
  }),
});

const sourceConditionalValues = {
  implementation: "source" as const,
  rebuildValue: false,
  restartValue: false,
};

const alternateThemeResolver: LogoEffectColorResolver = (binding) =>
  binding.kind === "literal" ? binding.value : [1, 2, 3];

function getThemeUpdateMode<Schema extends LogoEffectSchema>(
  schema: Schema,
  values: LogoEffectAuthorValues<Schema>
) {
  return getLogoEffectUpdateMode(
    schema,
    resolveLogoEffectSchemaValues(schema, values, resolveLogoEffectFallbackColor),
    resolveLogoEffectSchemaValues(schema, values, alternateThemeResolver)
  );
}

describe("getLogoEffectUpdateMode", () => {
  test("returns live when only a live field changes", () => {
    assert.equal(
      getLogoEffectUpdateMode(updateModeSchema, unchangedValues, {
        ...unchangedValues,
        liveValue: true,
      }),
      "live"
    );
  });

  test("uses rebuild over restart over live for mixed changes", () => {
    assert.equal(
      getLogoEffectUpdateMode(updateModeSchema, unchangedValues, {
        ...unchangedValues,
        liveValue: true,
        restartValue: true,
      }),
      "restart"
    );
    assert.equal(
      getLogoEffectUpdateMode(updateModeSchema, unchangedValues, {
        ...unchangedValues,
        liveValue: true,
        rebuildValue: true,
      }),
      "rebuild"
    );
    assert.equal(
      getLogoEffectUpdateMode(updateModeSchema, unchangedValues, {
        ...unchangedValues,
        rebuildValue: true,
        restartValue: true,
      }),
      "rebuild"
    );
  });

  test("applies conditional live updates on Custom without weakening Source modes", () => {
    assert.equal(
      getLogoEffectUpdateMode(conditionalUpdateSchema, sourceConditionalValues, {
        ...sourceConditionalValues,
        restartValue: true,
      }),
      "restart"
    );
    assert.equal(
      getLogoEffectUpdateMode(conditionalUpdateSchema, sourceConditionalValues, {
        ...sourceConditionalValues,
        rebuildValue: true,
      }),
      "rebuild"
    );

    const customValues = {
      ...sourceConditionalValues,
      implementation: "custom" as const,
    };
    assert.equal(
      getLogoEffectUpdateMode(conditionalUpdateSchema, customValues, {
        ...customValues,
        restartValue: true,
      }),
      "live"
    );
    assert.equal(
      getLogoEffectUpdateMode(conditionalUpdateSchema, customValues, {
        ...customValues,
        rebuildValue: true,
      }),
      "live"
    );
  });

  test("uses the strongest visible policy when a condition changes with its field", () => {
    assert.equal(
      getLogoEffectUpdateMode(conditionalUpdateSchema, sourceConditionalValues, {
        ...sourceConditionalValues,
        implementation: "custom",
        restartValue: true,
      }),
      "restart"
    );
    assert.equal(
      getLogoEffectUpdateMode(
        conditionalUpdateSchema,
        { ...sourceConditionalValues, implementation: "custom", rebuildValue: true },
        sourceConditionalValues
      ),
      "rebuild"
    );
  });

  test("ignores values hidden in both states", () => {
    assert.equal(
      getLogoEffectUpdateMode(visibilitySchema, sourceVisibilityValues, {
        ...sourceVisibilityValues,
        customGroup: { customOnly: true },
      }),
      "none"
    );
    const customValues = {
      ...sourceVisibilityValues,
      implementation: "custom" as const,
    };
    assert.equal(
      getLogoEffectUpdateMode(visibilitySchema, customValues, {
        ...customValues,
        sourceOnly: 9,
      }),
      "none"
    );
  });

  test("counts fields whose root visibility changes, including inside groups", () => {
    assert.equal(
      getLogoEffectUpdateMode(visibilitySchema, sourceVisibilityValues, {
        ...sourceVisibilityValues,
        implementation: "custom",
      }),
      "rebuild"
    );
    assert.equal(
      getLogoEffectUpdateMode(
        visibilitySchema,
        { ...sourceVisibilityValues, implementation: "custom" },
        sourceVisibilityValues
      ),
      "rebuild"
    );
  });

  test("rebuilds source-faithful runtimes when their theme colors change", () => {
    assert.equal(
      getThemeUpdateMode(colorShiftEffect.schema, colorShiftEffect.defaults.values),
      "rebuild"
    );
    assert.equal(
      getThemeUpdateMode(laserEtchEffect.schema, laserEtchEffect.defaults.values),
      "rebuild"
    );
    assert.equal(getThemeUpdateMode(matrixEffect.schema, matrixEffect.defaults.values), "rebuild");
    assert.equal(
      getThemeUpdateMode(thunderstormEffect.schema, thunderstormEffect.defaults.values),
      "rebuild"
    );
    assert.equal(getThemeUpdateMode(wipeEffect.schema, wipeEffect.defaults.values), "rebuild");
  });
});
