import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { resolveLogoEffectFallbackColor } from "@/lib/effects/logo/color-bindings";
import { logoEffect as colorshift } from "@/lib/effects/logo/definitions/colorshift";
import { logoEffect as matrix } from "@/lib/effects/logo/definitions/matrix";
import { logoEffect as thunderstorm } from "@/lib/effects/logo/definitions/thunderstorm";
import { logoEffect as wipe } from "@/lib/effects/logo/definitions/wipe";
import { collectColorBindingKinds } from "@/lib/effects/logo/test-utils";

const effectCases = [
  {
    ambient: false,
    definition: matrix,
    groupFields: [
      matrix.schema.rainChoreography,
      matrix.schema.fillChoreography,
      matrix.schema.resolveChoreography,
    ],
  },
  { ambient: true, definition: colorshift, groupFields: [colorshift.schema.idle] },
  { ambient: true, definition: wipe, groupFields: [wipe.schema.idle] },
  {
    ambient: false,
    definition: thunderstorm,
    groupFields: [
      thunderstorm.schema.rain,
      thunderstorm.schema.lightning,
      thunderstorm.schema.sparks,
      thunderstorm.schema.text,
    ],
  },
] as const;

for (const { ambient, definition, groupFields } of effectCases) {
  describe(`${definition.id} definition`, () => {
    test("keeps one source configuration with its authored controls", () => {
      for (const field of groupFields) assert.equal(field.kind, "group");
      assert.equal("implementation" in definition.schema, false);
      assert.equal(
        Object.keys(definition.defaults.values).some((key) => key.startsWith("website")),
        false
      );
      assert.equal(definition.defaults.playback.mode, ambient ? "ambient" : "once");
      if (ambient) assert.equal(definition.capabilities.ambient, true);
      assert.equal(definition.source?.project, "ttfx");
    });

    test("declares theme bindings rather than literal colors in its defaults", () => {
      const kinds: string[] = [];
      collectColorBindingKinds(definition.defaults.values, kinds);
      assert.ok(kinds.length > 0);
      assert.equal(
        kinds.every((kind) => kind === "theme"),
        true
      );
    });

    test("prepares the canonical defaults without variant metadata", () => {
      const prepared = definition.prepareDefaults(resolveLogoEffectFallbackColor);
      assert.equal(prepared.values.implementation, undefined);
      assert.equal(
        Object.keys(prepared.values).some((key) => key.startsWith("website")),
        false
      );
    });
  });
}
