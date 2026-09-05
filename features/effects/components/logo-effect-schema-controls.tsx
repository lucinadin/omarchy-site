"use client";

import { useId, useState, type ReactNode } from "react";

import {
  ChoiceControl,
  EffectActionButton,
  EffectSection,
  EffectSelect,
  EffectSelectRow,
  RangeControl,
  ToggleControl,
} from "@/features/effects/components/effect-control";
import {
  parseSchemaEditorNumberList,
  parseSchemaEditorSymbol,
  parseSchemaEditorSymbolList,
  rgbToSchemaEditorHex,
  isSchemaEditorNumberAllowed,
  schemaEditorColorBindingWithRgb,
  schemaEditorColorBindingWithRole,
  schemaEditorRangeWithMaximum,
  schemaEditorRangeWithMinimum,
  type SchemaEditorParseResult,
} from "@/features/effects/components/logo-effect-schema-editor-values";
import { GripVerticalIcon, MinusIcon, PlusIcon } from "@/icons";
import { parseHexColor, type Rgb } from "@/lib/color";
import {
  isLogoEffectColorBinding,
  isLogoEffectThemeColorRole,
  LOGO_EFFECT_THEME_COLOR_PROPERTIES,
  literalLogoColor,
  type LogoEffectColorBinding,
} from "@/lib/effects/logo/color-bindings";
import type { LoadedLogoEffectDefinition } from "@/lib/effects/logo/definition";
import {
  isLogoEffectBoolean,
  isLogoEffectChoiceValue,
  isLogoEffectSchemaFieldVisible,
  isLogoEffectSingleSymbol,
} from "@/lib/effects/logo/schema";
import type {
  LogoEffectListConstraint,
  LogoEffectSchema,
  LogoEffectSchemaField,
} from "@/lib/effects/logo/schema";
import {
  isJsonObject,
  type JsonObject as LogoEffectJsonObject,
  type JsonValue as LogoEffectJsonValue,
} from "@/lib/json";
import { isFiniteNumber } from "@/lib/validation";

type LogoEffectSchemaControlsProps = {
  definition: LoadedLogoEffectDefinition;
  onValuesChange: LogoEffectValuesUpdate;
  values: LogoEffectJsonObject;
};

type LogoEffectValuesUpdate = (
  update: (currentValues: LogoEffectJsonObject) => LogoEffectJsonObject
) => void;

type SchemaLevelProps = {
  label: string;
  onValuesChange: LogoEffectValuesUpdate;
  path: string;
  rootValues: LogoEffectJsonObject;
  schema: LogoEffectSchema;
  values: LogoEffectJsonObject;
};

type ListControlProps = {
  constraint: LogoEffectListConstraint | undefined;
  createItem: (items: readonly LogoEffectColorBinding[]) => LogoEffectColorBinding;
  items: readonly LogoEffectColorBinding[];
  label: string;
  onChange: (items: readonly LogoEffectColorBinding[]) => void;
  renderItem: (
    item: LogoEffectColorBinding,
    index: number,
    onItemChange: (nextItem: LogoEffectColorBinding) => void
  ) => ReactNode;
};

const listItemKeys = new WeakMap<object, number>();
let nextListItemKey = 0;

function getListItemKey(item: LogoEffectColorBinding) {
  const existingKey = listItemKeys.get(item);
  if (existingKey !== undefined) return existingKey;

  nextListItemKey += 1;
  listItemKeys.set(item, nextListItemKey);
  return nextListItemKey;
}

function moveListItem<Item>(items: readonly Item[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= items.length) return items;
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  if (movedItem === undefined) return items;
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function isColorList(
  value: LogoEffectJsonValue | undefined
): value is readonly LogoEffectColorBinding[] {
  return Array.isArray(value) && value.every(isLogoEffectColorBinding);
}

function isNumberList(value: LogoEffectJsonValue | undefined): value is readonly number[] {
  return Array.isArray(value) && value.every(isFiniteNumber);
}

function isNumberRange(
  value: LogoEffectJsonValue | undefined
): value is readonly [minimum: number, maximum: number] {
  return Array.isArray(value) && value.length === 2 && value.every(isFiniteNumber);
}

function isSymbolList(value: LogoEffectJsonValue | undefined): value is readonly string[] {
  return Array.isArray(value) && value.every(isLogoEffectSingleSymbol);
}

function colorBindingRgb(binding: LogoEffectColorBinding) {
  return binding.kind === "literal" ? binding.value : binding.fallback;
}

function resolvedThemeBindingRgb(binding: LogoEffectColorBinding, source: Element): Rgb {
  if (binding.kind === "literal") return binding.value;

  const property = LOGO_EFFECT_THEME_COLOR_PROPERTIES[binding.role];
  return (
    parseHexColor(getComputedStyle(source).getPropertyValue(property).trim()) ?? binding.fallback
  );
}

function customColorReason(label: string) {
  return `Customized in Secret Lab: ${label}`;
}

function ColorControl({
  binding,
  displayLabel,
  label,
  onChange,
}: {
  binding: LogoEffectColorBinding;
  displayLabel?: string;
  label: string;
  onChange: (binding: LogoEffectColorBinding) => void;
}) {
  const hex = rgbToSchemaEditorHex(colorBindingRgb(binding));
  const swatchColor =
    binding.kind === "theme" ? `var(${LOGO_EFFECT_THEME_COLOR_PROPERTIES[binding.role]})` : hex;

  return (
    <fieldset
      aria-label={label}
      className="focus-within:inset-ring-primary relative m-0 flex h-7 w-full min-w-0 items-center justify-between gap-[5px] overflow-hidden rounded-md border-0 bg-(--tuner-surface) px-2 font-[inherit] font-medium text-(color:--tuner-label) [min-inline-size:0] focus-within:inset-ring-1 focus-within:outline-none [&:hover]:bg-(--tuner-surface-hover)"
    >
      <span className="pointer-events-none relative z-[1] shrink-0">{displayLabel ?? label}</span>
      <EffectSelect
        aria-label={`${label} binding`}
        className="max-w-1/2"
        onChange={(event) => {
          const nextBinding = event.currentTarget.value;
          if (nextBinding === "literal") {
            if (binding.kind === "theme") {
              onChange(
                literalLogoColor(
                  resolvedThemeBindingRgb(binding, event.currentTarget),
                  customColorReason(label)
                )
              );
            }
            return;
          }
          if (!isLogoEffectThemeColorRole(nextBinding)) return;
          onChange(schemaEditorColorBindingWithRole(binding, nextBinding));
        }}
        value={binding.kind === "theme" ? binding.role : "literal"}
      >
        <option value="literal">literal</option>
        {Object.keys(LOGO_EFFECT_THEME_COLOR_PROPERTIES).map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </EffectSelect>
      <label className="relative flex h-3.5 flex-[0_0_14px] cursor-pointer">
        <span
          aria-hidden="true"
          className="h-3.5 flex-[0_0_14px] rounded-[3px] border border-[color-mix(in_srgb,var(--tuner-strong)_32%,transparent)]"
          style={{ backgroundColor: swatchColor }}
        />
        <input
          aria-label={`${label} color`}
          className="absolute inset-0 z-[2] size-full cursor-pointer opacity-0"
          onInput={(event) => {
            const rgb = parseHexColor(event.currentTarget.value);
            if (rgb === null) return;
            onChange(schemaEditorColorBindingWithRgb(binding, rgb, customColorReason(label)));
          }}
          type="color"
          value={hex}
        />
      </label>
    </fieldset>
  );
}

function CommittedTextControl<Value>({
  displayLabel,
  label,
  onCommit,
  parse,
  value,
}: {
  displayLabel?: string;
  label: string;
  onCommit: (value: Value) => void;
  parse: (draft: string) => SchemaEditorParseResult<Value>;
  value: string;
}) {
  const errorId = useId();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const result = parse(draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onCommit(result.value);
  };

  return (
    <label className="focus-within:inset-ring-primary relative flex h-7 w-full items-center justify-between gap-[5px] overflow-hidden rounded-md border-0 bg-(--tuner-surface) px-2 font-[inherit] font-medium text-(color:--tuner-label) focus-within:inset-ring-1 focus-within:outline-none [&:hover]:bg-(--tuner-surface-hover)">
      <span className="pointer-events-none relative z-[1] shrink-0">{displayLabel ?? label}</span>
      <input
        aria-describedby={error === null ? undefined : errorId}
        aria-invalid={error === null ? undefined : true}
        aria-label={label}
        autoComplete="off"
        className="ml-auto w-1/2 min-w-0 flex-auto border-0 bg-transparent p-0 text-right font-[inherit] text-(color:--tuner-muted) [font-variant-numeric:tabular-nums] outline-none [&[aria-invalid=true]]:text-(color:--ansi-red)"
        onBlur={commit}
        onChange={(event) => {
          setDraft(event.currentTarget.value);
          if (error !== null) setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setDraft(value);
            setError(null);
          }
        }}
        spellCheck={false}
        title={error ?? undefined}
        type="text"
        value={draft}
      />
      <span aria-live="polite" className="sr-only" id={errorId}>
        {error}
      </span>
    </label>
  );
}

function ListControl({
  constraint,
  createItem,
  items,
  label,
  onChange,
  renderItem,
}: ListControlProps) {
  const canAdd = constraint?.maximumItems === undefined || items.length < constraint.maximumItems;
  const canRemove =
    constraint?.minimumItems === undefined || items.length > constraint.minimumItems;

  return (
    <fieldset
      aria-label={label}
      className="m-0 flex min-w-0 flex-col border-0 p-0 [min-inline-size:0]"
    >
      <EffectSelectRow>
        <div className="relative flex h-7 w-full items-center justify-between gap-[5px] overflow-hidden rounded-md border-0 bg-(--tuner-surface) px-2 font-[inherit] font-medium text-(color:--tuner-label) [&:hover]:bg-(--tuner-surface-hover)">
          <span className="pointer-events-none relative z-[1] shrink-0">{label}</span>
          <span className="pointer-events-none relative z-[1] ml-auto min-w-0 truncate font-[inherit] text-(color:--tuner-muted) capitalize [font-variant-numeric:tabular-nums]">
            {items.length}
          </span>
        </div>
        {canAdd ? (
          <EffectActionButton
            aria-label={`Add ${label}`}
            onClick={() => onChange([...items, createItem(items)])}
            title={`Add ${label}`}
          >
            <PlusIcon aria-hidden="true" />
          </EffectActionButton>
        ) : null}
      </EffectSelectRow>
      {items.map((item, index) => (
        <EffectSelectRow
          className="mt-[3px]"
          key={getListItemKey(item)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const fromIndex = Number(event.dataTransfer.getData("text/plain"));
            if (Number.isInteger(fromIndex)) onChange(moveListItem(items, fromIndex, index));
          }}
        >
          <EffectActionButton
            aria-label={`Reorder ${label} ${index + 1}`}
            className="cursor-grab active:cursor-grabbing"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", String(index));
            }}
            onKeyDown={(event) => {
              const nextIndex =
                event.key === "ArrowUp" ? index - 1 : event.key === "ArrowDown" ? index + 1 : index;
              if (nextIndex === index || nextIndex < 0 || nextIndex >= items.length) return;
              event.preventDefault();
              onChange(moveListItem(items, index, nextIndex));
            }}
            title="Drag to reorder · Arrow keys also work"
          >
            <GripVerticalIcon aria-hidden="true" />
          </EffectActionButton>
          {renderItem(item, index, (nextItem) =>
            onChange(
              items.map((currentItem, currentIndex) =>
                currentIndex === index ? nextItem : currentItem
              )
            )
          )}
          {canRemove ? (
            <EffectActionButton
              aria-label={`Remove ${label} ${index + 1}`}
              onClick={() => onChange([...items.slice(0, index), ...items.slice(index + 1)])}
              title={`Remove ${label} ${index + 1}`}
            >
              <MinusIcon aria-hidden="true" />
            </EffectActionButton>
          ) : null}
        </EffectSelectRow>
      ))}
    </fieldset>
  );
}

function isEditableLeaf(
  field: LogoEffectSchemaField,
  value: LogoEffectJsonValue | undefined,
  rootValues: LogoEffectJsonObject
) {
  if (
    field.kind === "group" ||
    field.readOnly === true ||
    field.update === "source-metadata" ||
    !isLogoEffectSchemaFieldVisible(field, rootValues)
  ) {
    return false;
  }

  switch (field.kind) {
    case "boolean":
      return isLogoEffectBoolean(value);
    case "choice":
      return isLogoEffectChoiceValue(value, field.options);
    case "color":
      return isLogoEffectColorBinding(value);
    case "color-list":
      return isColorList(value);
    case "number":
      return isFiniteNumber(value);
    case "number-list":
      return isNumberList(value);
    case "number-range":
      return isNumberRange(value);
    case "symbol":
      return isLogoEffectSingleSymbol(value);
    case "symbol-list":
      return isSymbolList(value);
    default:
      return unreachableControlField(field);
  }
}

function unreachableControlField(field: never): never {
  throw new TypeError(`Unsupported logo effect control field: ${String(field)}`);
}

function renderNumberControl(
  field: Extract<LogoEffectSchemaField, { kind: "number" }>,
  value: LogoEffectJsonValue | undefined,
  onValueChange: (nextValue: LogoEffectJsonValue) => void
) {
  if (!isFiniteNumber(value)) return null;
  const format =
    field.unit === undefined ? undefined : (nextValue: number) => `${nextValue} ${field.unit}`;
  return (
    <RangeControl
      format={format}
      label={field.label}
      maximum={field.editor.maximum}
      minimum={field.editor.minimum}
      onChange={onValueChange}
      step={field.editor.step}
      value={value}
    />
  );
}

function renderLeafControl(
  field: LogoEffectSchemaField,
  value: LogoEffectJsonValue | undefined,
  onValueChange: (nextValue: LogoEffectJsonValue) => void
): ReactNode {
  switch (field.kind) {
    case "boolean":
      return isLogoEffectBoolean(value) ? (
        <ToggleControl checked={value} label={field.label} onChange={onValueChange} />
      ) : null;
    case "choice":
      return isLogoEffectChoiceValue(value, field.options) ? (
        <ChoiceControl
          label={field.label}
          onChange={onValueChange}
          options={field.options.map((option) => ({
            label: option,
            value: option,
          }))}
          value={value}
        />
      ) : null;
    case "color":
      return isLogoEffectColorBinding(value) ? (
        <ColorControl binding={value} label={field.label} onChange={onValueChange} />
      ) : null;
    case "color-list":
      return isColorList(value) ? (
        <ListControl
          constraint={field.constraint}
          createItem={(items) => {
            const lastItem = items.at(-1);
            return lastItem
              ? { ...lastItem }
              : literalLogoColor([255, 255, 255], customColorReason(field.label));
          }}
          items={value}
          label={field.label}
          onChange={onValueChange}
          renderItem={(binding, index, onBindingChange) => (
            <ColorControl
              binding={binding}
              displayLabel={String(index + 1)}
              label={`${field.label} ${index + 1}`}
              onChange={onBindingChange}
            />
          )}
        />
      ) : null;
    case "number":
      return renderNumberControl(field, value, onValueChange);
    case "number-list":
      if (!isNumberList(value)) return null;
      return (
        <CommittedTextControl
          key={value.join(", ")}
          label={field.label}
          onCommit={onValueChange}
          parse={(draft) =>
            parseSchemaEditorNumberList(draft, field.itemConstraint, field.constraint)
          }
          value={value.join(", ")}
        />
      );
    case "number-range":
      return isNumberRange(value) ? (
        <>
          <RangeControl
            label={`${field.label} minimum`}
            maximum={field.editor.maximum}
            minimum={field.editor.minimum}
            onChange={(minimum) => {
              if (isSchemaEditorNumberAllowed(minimum, field.constraint)) {
                onValueChange(schemaEditorRangeWithMinimum(value, minimum));
              }
            }}
            step={field.editor.step}
            value={value[0]}
          />
          <RangeControl
            label={`${field.label} maximum`}
            maximum={field.editor.maximum}
            minimum={field.editor.minimum}
            onChange={(maximum) => {
              if (isSchemaEditorNumberAllowed(maximum, field.constraint)) {
                onValueChange(schemaEditorRangeWithMaximum(value, maximum));
              }
            }}
            step={field.editor.step}
            value={value[1]}
          />
        </>
      ) : null;
    case "symbol":
      return isLogoEffectSingleSymbol(value) ? (
        <CommittedTextControl
          key={value}
          label={field.label}
          onCommit={onValueChange}
          parse={parseSchemaEditorSymbol}
          value={value}
        />
      ) : null;
    case "symbol-list":
      return isSymbolList(value) ? (
        <CommittedTextControl
          key={value.join("")}
          label={field.label}
          onCommit={onValueChange}
          parse={(draft) => parseSchemaEditorSymbolList(draft, field.constraint)}
          value={value.join("")}
        />
      ) : null;
    case "group":
      return null;
    default:
      return unreachableControlField(field);
  }
}

function SchemaLevel({
  label,
  onValuesChange,
  path,
  rootValues,
  schema,
  values,
}: SchemaLevelProps) {
  const editableLeaves = Object.entries(schema).filter(([key, field]) =>
    isEditableLeaf(field, values[key], rootValues)
  );

  return (
    <>
      {editableLeaves.length > 0 ? (
        <EffectSection label={label}>
          {editableLeaves.map(([key, field]) => (
            <div
              className="flex min-w-0 flex-col gap-1"
              data-field-kind={field.kind}
              data-schema-path={path.length === 0 ? key : `${path}.${key}`}
              key={key}
            >
              {renderLeafControl(field, values[key], (nextValue) =>
                onValuesChange((currentValues) => ({
                  ...currentValues,
                  [key]: nextValue,
                }))
              )}
            </div>
          ))}
        </EffectSection>
      ) : null}

      {Object.entries(schema).map(([key, field]) => {
        if (
          field.kind !== "group" ||
          field.readOnly === true ||
          !isLogoEffectSchemaFieldVisible(field, rootValues)
        ) {
          return null;
        }
        const groupValues = values[key];
        if (!isJsonObject(groupValues)) return null;
        return (
          <SchemaLevel
            key={key}
            label={field.label}
            onValuesChange={(updateGroupValues) => {
              onValuesChange((currentValues) => {
                const currentGroupValues = currentValues[key];
                if (!isJsonObject(currentGroupValues)) return currentValues;
                return {
                  ...currentValues,
                  [key]: updateGroupValues(currentGroupValues),
                };
              });
            }}
            path={path.length === 0 ? key : `${path}.${key}`}
            rootValues={rootValues}
            schema={field.fields}
            values={groupValues}
          />
        );
      })}
    </>
  );
}

export function LogoEffectSchemaControls({
  definition,
  onValuesChange,
  values,
}: LogoEffectSchemaControlsProps) {
  return (
    <SchemaLevel
      label="Parameters"
      onValuesChange={onValuesChange}
      path=""
      rootValues={values}
      schema={definition.schema}
      values={values}
    />
  );
}
