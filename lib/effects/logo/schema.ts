import type { Rgb } from "@/lib/color";
import {
  isLogoEffectColorBinding,
  type LogoEffectColorBinding,
  type LogoEffectColorResolver,
} from "@/lib/effects/logo/color-bindings";
import {
  isJsonArray,
  isJsonObject,
  jsonValuesEqual,
  type JsonObject as LogoEffectJsonObject,
  type JsonPrimitive,
  type JsonValue as LogoEffectJsonValue,
} from "@/lib/json";
import { isFiniteNumber } from "@/lib/validation";

type LogoEffectFieldUpdateMode = "live" | "rebuild" | "restart";
type LogoEffectFieldRuntimePolicy = LogoEffectFieldUpdateMode | "source-metadata";
export type LogoEffectChangeMode = "none" | LogoEffectFieldUpdateMode;
type LogoEffectFieldTier = "advanced" | "identity" | "interaction";

export function isLogoEffectBoolean(value: LogoEffectJsonValue | undefined): value is boolean {
  return value === true || value === false;
}

export function isLogoEffectSingleSymbol(value: LogoEffectJsonValue | undefined): value is string {
  return typeof value === "string" && Array.from(value).length === 1;
}

export function isLogoEffectChoiceValue(
  value: LogoEffectJsonValue | undefined,
  options: readonly string[]
): value is string {
  return typeof value === "string" && options.some((option) => option === value);
}

export type LogoEffectNumberConstraint = {
  integer?: boolean;
  maximum?: number;
  minimum?: number;
};

type LogoEffectNumberEditor = {
  maximum: number;
  minimum: number;
  step: number;
};

type LogoEffectNumberRandomizer = {
  distribution?: "integer" | "uniform";
  maximum: number;
  minimum: number;
};

type LogoEffectFieldVisibility = {
  equals: JsonPrimitive;
  /** Top-level schema key, evaluated against the complete effect value object. */
  field: string;
};

type LogoEffectFieldUpdateCondition = LogoEffectFieldVisibility & {
  mode: LogoEffectFieldUpdateMode;
};

type LogoEffectFieldBase = {
  description?: string;
  label: string;
  readOnly?: boolean;
  tier: LogoEffectFieldTier;
  update: LogoEffectFieldRuntimePolicy;
  updateWhen?: LogoEffectFieldUpdateCondition;
  visibleWhen?: LogoEffectFieldVisibility;
};

type LogoEffectNumberField = LogoEffectFieldBase & {
  constraint?: LogoEffectNumberConstraint;
  editor: LogoEffectNumberEditor;
  kind: "number";
  randomizer?: LogoEffectNumberRandomizer;
  unit?: string;
};

type LogoEffectBooleanField = LogoEffectFieldBase & {
  kind: "boolean";
};

type LogoEffectChoiceField<Options extends readonly string[] = readonly string[]> =
  LogoEffectFieldBase & {
    kind: "choice";
    options: Options;
  };

type LogoEffectColorField = LogoEffectFieldBase & {
  kind: "color";
};

type LogoEffectSymbolField = LogoEffectFieldBase & {
  kind: "symbol";
};

export type LogoEffectListConstraint = {
  maximumItems?: number;
  minimumItems?: number;
};

type LogoEffectColorListField = LogoEffectFieldBase & {
  constraint?: LogoEffectListConstraint;
  kind: "color-list";
};

type LogoEffectNumberListField = LogoEffectFieldBase & {
  constraint?: LogoEffectListConstraint;
  itemConstraint?: LogoEffectNumberConstraint;
  kind: "number-list";
};

type LogoEffectSymbolListField = LogoEffectFieldBase & {
  constraint?: LogoEffectListConstraint;
  kind: "symbol-list";
};

type LogoEffectNumberRangeField = LogoEffectFieldBase & {
  constraint?: LogoEffectNumberConstraint;
  editor: LogoEffectNumberEditor;
  kind: "number-range";
};

type LogoEffectGroupField<Fields extends LogoEffectSchema = LogoEffectSchema> = {
  description?: string;
  fields: Fields;
  kind: "group";
  label: string;
  readOnly?: boolean;
  tier: LogoEffectFieldTier;
  visibleWhen?: LogoEffectFieldVisibility;
};

export type LogoEffectSchemaField =
  | LogoEffectBooleanField
  | LogoEffectChoiceField
  | LogoEffectColorField
  | LogoEffectColorListField
  | LogoEffectGroupField
  | LogoEffectNumberField
  | LogoEffectNumberListField
  | LogoEffectNumberRangeField
  | LogoEffectSymbolField
  | LogoEffectSymbolListField;

export type LogoEffectSchema = {
  readonly [key: string]: LogoEffectSchemaField;
};

type LogoEffectFieldAuthorValue<Field extends LogoEffectSchemaField> =
  Field extends LogoEffectNumberField
    ? number
    : Field extends LogoEffectBooleanField
      ? boolean
      : Field extends LogoEffectChoiceField<infer Options>
        ? Options[number]
        : Field extends LogoEffectColorField
          ? LogoEffectColorBinding
          : Field extends LogoEffectColorListField
            ? readonly LogoEffectColorBinding[]
            : Field extends LogoEffectNumberListField
              ? readonly number[]
              : Field extends LogoEffectNumberRangeField
                ? readonly [minimum: number, maximum: number]
                : Field extends LogoEffectSymbolField
                  ? string
                  : Field extends LogoEffectSymbolListField
                    ? readonly string[]
                    : Field extends LogoEffectGroupField<infer Fields>
                      ? LogoEffectAuthorValues<Fields>
                      : never;

type LogoEffectFieldRuntimeValue<Field extends LogoEffectSchemaField> = Field extends {
  readonly update: "source-metadata";
}
  ? never
  : Field extends LogoEffectColorField
    ? Rgb
    : Field extends LogoEffectColorListField
      ? readonly Rgb[]
      : Field extends LogoEffectGroupField<infer Fields>
        ? LogoEffectRuntimeValues<Fields>
        : LogoEffectFieldAuthorValue<Field>;

export type LogoEffectAuthorValues<Schema extends LogoEffectSchema> = {
  readonly [Key in keyof Schema]: LogoEffectFieldAuthorValue<Schema[Key]>;
};

export type LogoEffectRuntimeValues<Schema extends LogoEffectSchema> = {
  readonly [
    Key in keyof Schema as Schema[Key] extends {
      readonly update: "source-metadata";
    }
      ? never
      : Key
  ]: LogoEffectFieldRuntimeValue<Schema[Key]>;
};

type LogoEffectFieldOptions<Field extends { kind: string }> = Omit<Field, "kind">;

function booleanField<const Field extends LogoEffectFieldOptions<LogoEffectBooleanField>>(
  options: Field
): Field & { readonly kind: "boolean" } {
  return { ...options, kind: "boolean" };
}

function choiceField<
  const Field extends LogoEffectFieldOptions<LogoEffectChoiceField<readonly string[]>>,
>(options: Field): Field & { readonly kind: "choice" } {
  return { ...options, kind: "choice" };
}

function colorField<const Field extends LogoEffectFieldOptions<LogoEffectColorField>>(
  options: Field
): Field & { readonly kind: "color" } {
  return { ...options, kind: "color" };
}

function colorListField<const Field extends LogoEffectFieldOptions<LogoEffectColorListField>>(
  options: Field
): Field & { readonly kind: "color-list" } {
  return { ...options, kind: "color-list" };
}

function groupField<
  const Field extends LogoEffectFieldOptions<LogoEffectGroupField<LogoEffectSchema>>,
>(options: Field): Field & { readonly kind: "group" } {
  return { ...options, kind: "group" };
}

function numberField<const Field extends LogoEffectFieldOptions<LogoEffectNumberField>>(
  options: Field
): Field & { readonly kind: "number" } {
  return { ...options, kind: "number" };
}

function numberListField<const Field extends LogoEffectFieldOptions<LogoEffectNumberListField>>(
  options: Field
): Field & { readonly kind: "number-list" } {
  return { ...options, kind: "number-list" };
}

function numberRangeField<const Field extends LogoEffectFieldOptions<LogoEffectNumberRangeField>>(
  options: Field
): Field & { readonly kind: "number-range" } {
  return { ...options, kind: "number-range" };
}

function symbolField<const Field extends LogoEffectFieldOptions<LogoEffectSymbolField>>(
  options: Field
): Field & { readonly kind: "symbol" } {
  return { ...options, kind: "symbol" };
}

function symbolListField<const Field extends LogoEffectFieldOptions<LogoEffectSymbolListField>>(
  options: Field
): Field & { readonly kind: "symbol-list" } {
  return { ...options, kind: "symbol-list" };
}

export const logoEffectField = {
  boolean: booleanField,
  choice: choiceField,
  color: colorField,
  colors: colorListField,
  group: groupField,
  number: numberField,
  numberList: numberListField,
  range: numberRangeField,
  symbol: symbolField,
  symbols: symbolListField,
} as const;

export function defineLogoEffectSchema<const Schema extends LogoEffectSchema>(
  schema: Schema
): Schema {
  return schema;
}

export function isLogoEffectSchemaFieldVisible(
  field: LogoEffectSchemaField,
  rootValues: LogoEffectJsonObject
) {
  const condition = field.visibleWhen;
  return condition === undefined || rootValues[condition.field] === condition.equals;
}

function schemaValueError(path: string, message: string): never {
  throw new TypeError(`Invalid logo effect value at ${path}: ${message}`);
}

function unreachableSchemaField(field: never): never {
  throw new TypeError(`Unsupported logo effect field: ${String(field)}`);
}

function validateNumber(
  value: LogoEffectJsonValue | undefined,
  constraint: LogoEffectNumberConstraint | undefined,
  path: string
): number {
  if (!isFiniteNumber(value)) {
    return schemaValueError(path, "expected a finite number");
  }
  if (constraint?.integer && !Number.isInteger(value)) {
    return schemaValueError(path, "expected an integer");
  }
  if (constraint?.minimum !== undefined && value < constraint.minimum) {
    return schemaValueError(path, `expected at least ${constraint.minimum}`);
  }
  if (constraint?.maximum !== undefined && value > constraint.maximum) {
    return schemaValueError(path, `expected at most ${constraint.maximum}`);
  }
  return value;
}

function validateListLength(
  values: readonly LogoEffectJsonValue[],
  constraint: LogoEffectListConstraint | undefined,
  path: string
) {
  if (constraint?.minimumItems !== undefined && values.length < constraint.minimumItems) {
    schemaValueError(path, `expected at least ${constraint.minimumItems} items`);
  }
  if (constraint?.maximumItems !== undefined && values.length > constraint.maximumItems) {
    schemaValueError(path, `expected at most ${constraint.maximumItems} items`);
  }
}

function validateChoice(
  value: LogoEffectJsonValue | undefined,
  options: readonly string[],
  path: string
) {
  return isLogoEffectChoiceValue(value, options)
    ? value
    : schemaValueError(path, `expected one of ${options.join(", ")}`);
}

function validateNumberRange(
  value: LogoEffectJsonValue | undefined,
  constraint: LogoEffectNumberConstraint | undefined,
  path: string
) {
  if (!isJsonArray(value) || value.length !== 2) {
    return schemaValueError(path, "expected a two-value number range");
  }
  const minimum = validateNumber(value[0], constraint, `${path}.0`);
  const maximum = validateNumber(value[1], constraint, `${path}.1`);
  if (minimum > maximum) return schemaValueError(path, "range minimum exceeds maximum");
  return [minimum, maximum];
}

function parseSchemaField(
  field: LogoEffectSchemaField,
  value: LogoEffectJsonValue | undefined,
  path: string
): LogoEffectJsonValue {
  switch (field.kind) {
    case "boolean":
      return isLogoEffectBoolean(value) ? value : schemaValueError(path, "expected a boolean");
    case "choice":
      return validateChoice(value, field.options, path);
    case "color":
      return isLogoEffectColorBinding(value)
        ? value
        : schemaValueError(path, "expected a theme or literal color binding");
    case "color-list": {
      if (!isJsonArray(value)) return schemaValueError(path, "expected a color list");
      validateListLength(value, field.constraint, path);
      return value.map((item, index) =>
        isLogoEffectColorBinding(item)
          ? item
          : schemaValueError(`${path}.${index}`, "expected a theme or literal color binding")
      );
    }
    case "group":
      return isJsonObject(value)
        ? parseSchemaObject(field.fields, value, path)
        : schemaValueError(path, "expected a settings group");
    case "number":
      return validateNumber(value, field.constraint, path);
    case "number-list": {
      if (!isJsonArray(value)) return schemaValueError(path, "expected a number list");
      validateListLength(value, field.constraint, path);
      return value.map((item, index) =>
        validateNumber(item, field.itemConstraint, `${path}.${index}`)
      );
    }
    case "number-range":
      return validateNumberRange(value, field.constraint, path);
    case "symbol":
      return isLogoEffectSingleSymbol(value)
        ? value
        : schemaValueError(path, "expected one Unicode scalar");
    case "symbol-list": {
      if (!isJsonArray(value)) return schemaValueError(path, "expected a symbol list");
      validateListLength(value, field.constraint, path);
      return value.map((item, index) =>
        isLogoEffectSingleSymbol(item)
          ? item
          : schemaValueError(`${path}.${index}`, "expected one Unicode scalar")
      );
    }
    default:
      return unreachableSchemaField(field);
  }
}

function parseSchemaObject(
  schema: LogoEffectSchema,
  input: LogoEffectJsonObject,
  parentPath: string
): LogoEffectJsonObject {
  const parsed: Record<string, LogoEffectJsonValue> = {};
  for (const key of Object.keys(schema)) {
    const field = schema[key];
    parsed[key] = parseSchemaField(field, input[key], `${parentPath}.${key}`);
  }
  return parsed;
}

function authorValuesAsJson<Schema extends LogoEffectSchema>(
  values: LogoEffectAuthorValues<Schema>
): LogoEffectJsonObject {
  // SAFETY: Every author value produced by LogoEffectFieldAuthorValue is JSON data.
  return values as LogoEffectAuthorValues<Schema> & LogoEffectJsonObject;
}

function runtimeValuesAsJson<Schema extends LogoEffectSchema>(
  values: LogoEffectRuntimeValues<Schema>
): LogoEffectJsonObject {
  // SAFETY: Runtime values only replace color bindings with JSON-compatible RGB tuples.
  return values as LogoEffectRuntimeValues<Schema> & LogoEffectJsonObject;
}

export function parseLogoEffectSchemaValues<Schema extends LogoEffectSchema>(
  schema: Schema,
  input: LogoEffectJsonObject
): LogoEffectAuthorValues<Schema> {
  const parsed = parseSchemaObject(schema, input, "settings");
  // SAFETY: parseSchemaObject validates every key against the matching field descriptor.
  return parsed as LogoEffectJsonObject & LogoEffectAuthorValues<Schema>;
}

export function serializeLogoEffectSchemaValues<Schema extends LogoEffectSchema>(
  schema: Schema,
  values: LogoEffectAuthorValues<Schema>
): LogoEffectJsonObject {
  return parseSchemaObject(schema, authorValuesAsJson(values), "settings");
}

function resolveSchemaField(
  field: LogoEffectSchemaField,
  value: LogoEffectJsonValue | undefined,
  resolveColor: LogoEffectColorResolver,
  path: string
): LogoEffectJsonValue {
  const parsed = parseSchemaField(field, value, path);
  if (field.kind === "color") {
    if (!isLogoEffectColorBinding(parsed)) {
      return schemaValueError(path, "expected a color binding after validation");
    }
    return resolveColor(parsed);
  }
  if (field.kind === "color-list") {
    if (!isJsonArray(parsed)) {
      return schemaValueError(path, "expected a color list after validation");
    }
    return parsed.map((item, index) =>
      isLogoEffectColorBinding(item)
        ? resolveColor(item)
        : schemaValueError(`${path}.${index}`, "expected a color binding after validation")
    );
  }
  if (field.kind === "group") {
    if (!isJsonObject(parsed)) {
      return schemaValueError(path, "expected a settings group after validation");
    }
    return resolveSchemaObject(field.fields, parsed, resolveColor, path);
  }
  return parsed;
}

function resolveSchemaObject(
  schema: LogoEffectSchema,
  input: LogoEffectJsonObject,
  resolveColor: LogoEffectColorResolver,
  parentPath: string
): LogoEffectJsonObject {
  const resolved: Record<string, LogoEffectJsonValue> = {};
  for (const key of Object.keys(schema)) {
    const field = schema[key];
    if ("update" in field && field.update === "source-metadata") continue;
    resolved[key] = resolveSchemaField(field, input[key], resolveColor, `${parentPath}.${key}`);
  }
  return resolved;
}

export function resolveLogoEffectSchemaValues<Schema extends LogoEffectSchema>(
  schema: Schema,
  values: LogoEffectAuthorValues<Schema>,
  resolveColor: LogoEffectColorResolver
): LogoEffectRuntimeValues<Schema> {
  const resolved = resolveSchemaObject(
    schema,
    authorValuesAsJson(values),
    resolveColor,
    "settings"
  );
  // SAFETY: resolveSchemaObject validates all fields and replaces each color binding with Rgb.
  return resolved as LogoEffectJsonObject & LogoEffectRuntimeValues<Schema>;
}

function strongerChangeMode(
  current: LogoEffectChangeMode,
  candidate: LogoEffectChangeMode
): LogoEffectChangeMode {
  if (current === "rebuild" || candidate === "rebuild") return "rebuild";
  if (current === "restart" || candidate === "restart") return "restart";
  if (current === "live" || candidate === "live") return "live";
  return "none";
}

function schemaFieldChangeMode(
  field: Exclude<LogoEffectSchemaField, LogoEffectGroupField>,
  rootValues: LogoEffectJsonObject
): LogoEffectChangeMode {
  if (field.update === "source-metadata") return "none";

  const condition = field.updateWhen;
  return condition !== undefined && rootValues[condition.field] === condition.equals
    ? condition.mode
    : field.update;
}

function schemaObjectChangeMode(
  schema: LogoEffectSchema,
  previous: LogoEffectJsonObject,
  next: LogoEffectJsonObject,
  previousRoot: LogoEffectJsonObject,
  nextRoot: LogoEffectJsonObject,
  previousAncestorVisible: boolean,
  nextAncestorVisible: boolean
): LogoEffectChangeMode {
  let result: LogoEffectChangeMode = "none";
  for (const key of Object.keys(schema)) {
    const field = schema[key];
    const wasVisible =
      previousAncestorVisible && isLogoEffectSchemaFieldVisible(field, previousRoot);
    const isVisible = nextAncestorVisible && isLogoEffectSchemaFieldVisible(field, nextRoot);
    if (!wasVisible && !isVisible) continue;

    const previousValue = previous[key];
    const nextValue = next[key];
    let fieldResult: LogoEffectChangeMode;
    if (field.kind === "group") {
      if (!isJsonObject(previousValue) || !isJsonObject(nextValue)) {
        return schemaValueError(`settings.${key}`, "expected resolved settings groups");
      }
      fieldResult = schemaObjectChangeMode(
        field.fields,
        previousValue,
        nextValue,
        previousRoot,
        nextRoot,
        wasVisible,
        isVisible
      );
    } else {
      if (field.update === "source-metadata") continue;
      const changed = wasVisible !== isVisible || !jsonValuesEqual(previousValue, nextValue);
      fieldResult = changed
        ? strongerChangeMode(
            wasVisible ? schemaFieldChangeMode(field, previousRoot) : "none",
            isVisible ? schemaFieldChangeMode(field, nextRoot) : "none"
          )
        : "none";
    }
    result = strongerChangeMode(result, fieldResult);
  }
  return result;
}

export function getLogoEffectUpdateMode<Schema extends LogoEffectSchema>(
  schema: Schema,
  previous: LogoEffectRuntimeValues<Schema>,
  next: LogoEffectRuntimeValues<Schema>
): LogoEffectChangeMode {
  const previousValues = runtimeValuesAsJson(previous);
  const nextValues = runtimeValuesAsJson(next);
  return schemaObjectChangeMode(
    schema,
    previousValues,
    nextValues,
    previousValues,
    nextValues,
    true,
    true
  );
}
