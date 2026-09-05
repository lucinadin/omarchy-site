import type { Rgb } from "@/lib/color";
import {
  literalLogoColor,
  themeLogoColor,
  type LogoEffectColorBinding,
  type LogoEffectThemeColorRole,
} from "@/lib/effects/logo/color-bindings";
import type {
  LogoEffectListConstraint,
  LogoEffectNumberConstraint,
} from "@/lib/effects/logo/schema";

export type SchemaEditorParseResult<Value> =
  | { error: string; ok: false }
  | { ok: true; value: Value };

const JSON_NUMBER_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/iu;

function listLengthError(length: number, constraint: LogoEffectListConstraint | undefined) {
  if (constraint?.minimumItems !== undefined && length < constraint.minimumItems) {
    return `Expected at least ${constraint.minimumItems} items.`;
  }
  if (constraint?.maximumItems !== undefined && length > constraint.maximumItems) {
    return `Expected at most ${constraint.maximumItems} items.`;
  }
  return null;
}

export function isSchemaEditorNumberAllowed(
  value: number,
  constraint: LogoEffectNumberConstraint | undefined
) {
  return (
    Number.isFinite(value) &&
    (!constraint?.integer || Number.isInteger(value)) &&
    (constraint?.minimum === undefined || value >= constraint.minimum) &&
    (constraint?.maximum === undefined || value <= constraint.maximum)
  );
}

export function rgbToSchemaEditorHex([red, green, blue]: Rgb) {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function schemaEditorColorBindingWithRgb(
  binding: LogoEffectColorBinding,
  value: Rgb,
  reason: string
): LogoEffectColorBinding {
  return binding.kind === "literal" ? { ...binding, value } : literalLogoColor(value, reason);
}

export function schemaEditorColorBindingWithRole(
  binding: LogoEffectColorBinding,
  role: LogoEffectThemeColorRole
): LogoEffectColorBinding {
  const fallback = binding.kind === "literal" ? binding.value : binding.fallback;
  return themeLogoColor(role, fallback);
}

export function parseSchemaEditorNumberList(
  draft: string,
  itemConstraint: LogoEffectNumberConstraint | undefined,
  listConstraint: LogoEffectListConstraint | undefined
): SchemaEditorParseResult<readonly number[]> {
  const parts = draft.length === 0 ? [] : draft.split(",").map((part) => part.trim());
  if (parts.some((part) => !JSON_NUMBER_PATTERN.test(part))) {
    return { error: "Enter comma-separated numbers.", ok: false };
  }

  const values = parts.map(Number);
  const lengthError = listLengthError(values.length, listConstraint);
  if (lengthError !== null) return { error: lengthError, ok: false };

  const invalidIndex = values.findIndex(
    (value) => !isSchemaEditorNumberAllowed(value, itemConstraint)
  );
  if (invalidIndex !== -1) {
    return { error: `Item ${invalidIndex + 1} is outside its allowed range.`, ok: false };
  }
  return { ok: true, value: values };
}

export function parseSchemaEditorSymbol(draft: string): SchemaEditorParseResult<string> {
  const symbols = Array.from(draft);
  return symbols.length === 1
    ? { ok: true, value: symbols[0] }
    : { error: "Enter one Unicode scalar.", ok: false };
}

export function parseSchemaEditorSymbolList(
  draft: string,
  constraint: LogoEffectListConstraint | undefined
): SchemaEditorParseResult<readonly string[]> {
  const symbols = Array.from(draft);
  const lengthError = listLengthError(symbols.length, constraint);
  return lengthError === null ? { ok: true, value: symbols } : { error: lengthError, ok: false };
}

export function schemaEditorRangeWithMinimum(
  range: readonly [minimum: number, maximum: number],
  minimum: number
): readonly [minimum: number, maximum: number] {
  return [Math.min(minimum, range[1]), range[1]];
}

export function schemaEditorRangeWithMaximum(
  range: readonly [minimum: number, maximum: number],
  maximum: number
): readonly [minimum: number, maximum: number] {
  return [range[0], Math.max(maximum, range[0])];
}
