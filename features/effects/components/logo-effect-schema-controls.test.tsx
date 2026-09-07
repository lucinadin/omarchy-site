import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { LogoEffectSchemaControls } from "@/features/effects/components/logo-effect-schema-controls";
import {
  parseSchemaEditorNumberList,
  parseSchemaEditorSymbol,
  parseSchemaEditorSymbolList,
  rgbToSchemaEditorHex,
  schemaEditorColorBindingWithRgb,
  schemaEditorColorBindingWithRole,
  schemaEditorRangeWithMaximum,
  schemaEditorRangeWithMinimum,
} from "@/features/effects/components/logo-effect-schema-editor-values";
import {
  literalLogoColor,
  resolveLogoEffectFallbackColor,
  themeLogoColor,
} from "@/lib/effects/logo/color-bindings";
import type { LoadedLogoEffectDefinition } from "@/lib/effects/logo/definition";
import { logoEffect as matrixLogoEffect } from "@/lib/effects/logo/definitions/matrix";
import { loadLogoEffect, LOGO_EFFECTS } from "@/lib/effects/logo/registry";
import { defineLogoEffectSchema, logoEffectField } from "@/lib/effects/logo/schema";

const proofDefinitions = await Promise.all(
  LOGO_EFFECTS.map(async ({ id }) => (await loadLogoEffect(id)).logoEffect)
);

function renderedEditablePaths(markup: string) {
  return Array.from(markup.matchAll(/data-schema-path="([^"]+)"/gu), (match) => match[1]);
}

function renderSchemaControls(definition: LoadedLogoEffectDefinition) {
  const values = definition.prepareDefaults(resolveLogoEffectFallbackColor).values;
  return {
    markup: renderToStaticMarkup(
      <LogoEffectSchemaControls definition={definition} onValuesChange={() => {}} values={values} />
    ),
    values,
  };
}

test("schema editor value parsers preserve exact typed values", () => {
  assert.equal(rgbToSchemaEditorHex([0, 170, 255]), "#00aaff");

  const literal = literalLogoColor([1, 2, 3], "Pinned test color");
  assert.deepEqual(schemaEditorColorBindingWithRgb(literal, [4, 5, 6], "Unused"), {
    kind: "literal",
    reason: "Pinned test color",
    value: [4, 5, 6],
  });
  assert.deepEqual(
    schemaEditorColorBindingWithRgb(
      themeLogoColor("accent", [7, 8, 9]),
      [10, 11, 12],
      "Customized"
    ),
    { kind: "literal", reason: "Customized", value: [10, 11, 12] }
  );
  assert.deepEqual(schemaEditorColorBindingWithRole(literal, "foreground"), {
    kind: "theme",
    role: "foreground",
    fallback: [1, 2, 3],
  });

  assert.deepEqual(
    parseSchemaEditorNumberList(
      "1, 2, 3e1",
      { integer: true, maximum: 64, minimum: 1 },
      { maximumItems: 4, minimumItems: 1 }
    ),
    { ok: true, value: [1, 2, 30] }
  );
  assert.equal(
    parseSchemaEditorNumberList("1, 2.5", { integer: true }, { minimumItems: 1 }).ok,
    false
  );
  assert.equal(parseSchemaEditorNumberList("1,,2", undefined, { minimumItems: 1 }).ok, false);

  assert.deepEqual(parseSchemaEditorSymbol("🜁"), { ok: true, value: "🜁" });
  assert.equal(parseSchemaEditorSymbol("é").ok, false);
  assert.deepEqual(parseSchemaEditorSymbolList(",\\🜁", { minimumItems: 1 }), {
    ok: true,
    value: [",", "\\", "🜁"],
  });

  assert.deepEqual(schemaEditorRangeWithMinimum([4, 8], 10), [8, 8]);
  assert.deepEqual(schemaEditorRangeWithMaximum([4, 8], 2), [4, 4]);
});

for (const definition of proofDefinitions) {
  test(`${definition.id} default schema can render editable controls`, () => {
    const { markup } = renderSchemaControls(definition);
    const paths = renderedEditablePaths(markup);
    assert.ok(paths.length > 0);
    assert.equal(new Set(paths).size, paths.length, "Each control has a unique path");
  });
}

test("conditional fields and groups follow root values while read-only metadata stays hidden", () => {
  const schema = defineLogoEffectSchema({
    enabled: logoEffectField.boolean({ label: "Enabled", tier: "identity", update: "live" }),
    amount: logoEffectField.number({
      label: "Amount",
      tier: "identity",
      editor: { minimum: 0, maximum: 10, step: 1 },
      update: "live",
      visibleWhen: { field: "enabled", equals: true },
    }),
    disabledOnly: logoEffectField.boolean({
      label: "Fallback",
      tier: "identity",
      update: "live",
      visibleWhen: { field: "enabled", equals: false },
    }),
    advanced: logoEffectField.group({
      label: "Advanced",
      tier: "advanced",
      visibleWhen: { field: "enabled", equals: true },
      fields: defineLogoEffectSchema({
        gain: logoEffectField.number({
          label: "Gain",
          tier: "advanced",
          editor: { minimum: 0, maximum: 10, step: 1 },
          update: "live",
        }),
      }),
    }),
    locked: logoEffectField.number({
      label: "Locked",
      tier: "identity",
      editor: { minimum: 0, maximum: 10, step: 1 },
      update: "live",
      readOnly: true,
    }),
    frames: logoEffectField.number({
      label: "Frames",
      tier: "identity",
      editor: { minimum: 0, maximum: 10, step: 1 },
      update: "source-metadata",
    }),
  });
  const definition: LoadedLogoEffectDefinition = { ...matrixLogoEffect, schema };
  for (const [enabled, expected] of [
    [true, ["enabled", "amount", "advanced.gain"]],
    [false, ["enabled", "disabledOnly"]],
  ] as const) {
    const markup = renderToStaticMarkup(
      <LogoEffectSchemaControls
        definition={definition}
        onValuesChange={() => {}}
        values={{
          enabled,
          amount: 2,
          disabledOnly: false,
          advanced: { gain: 3 },
          locked: 4,
          frames: 5,
        }}
      />
    );
    assert.deepEqual(renderedEditablePaths(markup), expected);
  }
});

test("renders the standalone symbol editor with an accessible Unicode input", () => {
  const schema = defineLogoEffectSchema({
    glyph: logoEffectField.symbol({
      label: "Glyph",
      tier: "identity",
      update: "live",
    }),
  });
  const definition: LoadedLogoEffectDefinition = {
    ...matrixLogoEffect,
    label: "Symbol test",
    schema,
  };
  const markup = renderToStaticMarkup(
    <LogoEffectSchemaControls
      definition={definition}
      onValuesChange={() => {}}
      values={{ glyph: "🜁" }}
    />
  );

  assert.deepEqual(renderedEditablePaths(markup), ["glyph"]);
  assert.match(markup, /data-field-kind="symbol"/u);
  assert.match(markup, /aria-label="Glyph"/u);
  assert.match(markup, /value="🜁"/u);
});
