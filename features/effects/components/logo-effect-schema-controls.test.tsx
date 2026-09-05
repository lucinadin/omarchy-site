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
import {
  defineLogoEffectSchema,
  isLogoEffectSchemaFieldVisible,
  logoEffectField,
  type LogoEffectSchema,
} from "@/lib/effects/logo/schema";
import type { JsonObject as LogoEffectJsonObject } from "@/lib/json";

const proofDefinitions = await Promise.all(
  LOGO_EFFECTS.map(async ({ id }) => (await loadLogoEffect(id)).logoEffect)
);

function expectedEditablePaths(
  schema: LogoEffectSchema,
  rootValues: LogoEffectJsonObject,
  parentPath = ""
): string[] {
  const paths: string[] = [];
  for (const [key, field] of Object.entries(schema)) {
    if (field.readOnly === true || !isLogoEffectSchemaFieldVisible(field, rootValues)) continue;

    const path = parentPath.length === 0 ? key : `${parentPath}.${key}`;
    if (field.kind === "group") {
      paths.push(...expectedEditablePaths(field.fields, rootValues, path));
    } else if (field.update !== "source-metadata") {
      paths.push(path);
    }
  }
  return paths;
}

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
    literalLogoColor([10, 11, 12], "Customized")
  );
  assert.deepEqual(
    schemaEditorColorBindingWithRole(literal, "foreground"),
    themeLogoColor("foreground", [1, 2, 3])
  );

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
  test(`${definition.id} renders every visible writable schema field`, () => {
    const { markup, values } = renderSchemaControls(definition);
    assert.deepEqual(
      renderedEditablePaths(markup).toSorted(),
      expectedEditablePaths(definition.schema, values).toSorted()
    );
  });
}

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
