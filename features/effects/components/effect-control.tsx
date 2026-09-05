"use client";

import {
  useId,
  type ButtonHTMLAttributes,
  type ComponentProps,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { ChevronDownIcon } from "@/icons";
import { cn } from "@/lib/utils";

export type ChoiceValue = number | string;

export type ChoiceOption<Value extends ChoiceValue> = {
  disabled?: boolean;
  label: string;
  value: Value;
};

export function formatDegrees(value: number) {
  return `${Math.round(value)}°`;
}

export function formatPercentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatScale(value: number) {
  return `${value.toFixed(2)}×`;
}

type RangeControlProps = {
  format?: (value: number) => string;
  label: string;
  maximum: number;
  minimum: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
};

type ChoiceControlProps<Value extends ChoiceValue> = {
  disabled?: boolean;
  label: string;
  onChange: (value: Value) => void;
  options: readonly ChoiceOption<Value>[];
  value: Value;
};

export function EffectButton({
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  return (
    <button
      className={cn(
        "focus-visible:inset-ring-primary h-7 cursor-pointer rounded-md border-0 bg-(--tuner-surface) px-2 font-[inherit] font-semibold whitespace-nowrap text-(color:--tuner-label) focus-visible:inset-ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&:hover]:bg-(--tuner-surface-active) [&:hover]:text-(color:--tuner-strong)",
        className
      )}
      {...props}
      type="button"
    />
  );
}

export function EffectActionButton({
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  return (
    <button
      className={cn(
        "focus-visible:inset-ring-primary flex h-7 flex-[0_0_28px] cursor-pointer items-center justify-center rounded-md border-0 bg-(--tuner-surface) p-0 text-(color:--tuner-label) focus-visible:inset-ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-[11px] [&:is(:hover,:focus-visible)]:bg-(--tuner-surface-active) [&:is(:hover,:focus-visible)]:text-(color:--tuner-strong)",
        className
      )}
      {...props}
      type="button"
    />
  );
}

export function EffectSelectRow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex gap-[3px] [&>:not(button)]:min-w-0 [&>:not(button)]:flex-auto",
        className
      )}
      {...props}
    />
  );
}

type EffectSelectProps = ComponentProps<"select"> & {
  label?: string;
  wrapperClassName?: string;
};

export function EffectSelect({
  children,
  className,
  label,
  wrapperClassName,
  ...props
}: EffectSelectProps) {
  return (
    <label
      className={cn(
        "group/effect-select focus-within:inset-ring-primary relative flex h-7 w-full items-center gap-[5px] overflow-hidden rounded-md bg-(--tuner-surface) px-2 font-[inherit] font-medium text-(color:--tuner-label) focus-within:inset-ring-1 focus-within:outline-none hover:bg-(--tuner-surface-hover) has-[select:disabled]:pointer-events-none has-[select:disabled]:opacity-50",
        wrapperClassName
      )}
      data-slot="effect-select-wrapper"
    >
      {label ? (
        <span className="pointer-events-none shrink-0" data-slot="effect-select-label">
          {label}
        </span>
      ) : null}
      <select
        className={cn(
          "h-full min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent p-0 pr-5 text-right font-[inherit] font-medium text-(color:--tuner-muted) capitalize [font-variant-numeric:tabular-nums] outline-none disabled:pointer-events-none disabled:cursor-not-allowed",
          className
        )}
        data-slot="effect-select"
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-(color:--tuner-muted) opacity-50 select-none"
        data-slot="effect-select-icon"
      />
    </label>
  );
}

export function EffectSelector({ children }: { children: ReactNode }) {
  return <div className="border-b border-(--tuner-border) px-0 pt-[3px] pb-[7px]">{children}</div>;
}

export function EffectSection({ children, label }: { children: ReactNode; label: string }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 border-b border-(--tuner-border) px-0 pt-[3px] pb-[7px] [min-inline-size:0] last:border-b-0">
      <legend className="float-left mb-[3px] w-full p-0 font-semibold tracking-[0.005em] text-[color:color-mix(in_srgb,var(--tuner-label)_82%,var(--tuner-muted))]">
        {label}
      </legend>
      {children}
    </fieldset>
  );
}

export function RangeControl({
  format = String,
  label,
  maximum,
  minimum,
  onChange,
  step,
  value,
}: RangeControlProps) {
  const inputId = useId();
  const progress = ((value - minimum) / (maximum - minimum)) * 100;
  const style = { "--control-progress": `${progress}%` } satisfies CSSProperties;
  const formattedValue = format(value);

  return (
    <div
      className="focus-within:inset-ring-primary relative flex h-7 w-full items-center justify-between gap-[5px] overflow-hidden rounded-md border-0 bg-(--tuner-surface) px-2 font-[inherit] font-medium text-(color:--tuner-label) focus-within:inset-ring-1 focus-within:outline-none"
      style={style}
    >
      <span
        className="pointer-events-none absolute inset-y-0 left-0 w-(--control-progress) bg-(--tuner-surface-active)"
        aria-hidden="true"
      />
      <span
        className="left-control-progress pointer-events-none absolute top-1.5 h-4 w-0.5 rounded-full bg-(--tuner-strong)"
        aria-hidden="true"
      />
      <label
        className="pointer-events-none relative z-[1] shrink-0 whitespace-nowrap"
        htmlFor={inputId}
      >
        {label}
      </label>
      <output
        className="pointer-events-none relative z-[1] ml-auto min-w-0 flex-auto truncate text-right font-[inherit] text-(color:--tuner-muted) capitalize [font-variant-numeric:tabular-nums]"
        title={formattedValue}
      >
        {formattedValue}
      </output>
      <input
        aria-label={label}
        id={inputId}
        max={maximum}
        min={minimum}
        onInput={(event) => onChange(Number(event.currentTarget.value))}
        step={step}
        className="absolute inset-0 z-[2] m-0 w-full cursor-pointer opacity-0 focus-visible:outline-none"
        type="range"
        value={value}
      />
    </div>
  );
}

export function ChoiceControl<const Value extends ChoiceValue>({
  disabled,
  label,
  onChange,
  options,
  value,
}: ChoiceControlProps<Value>) {
  return (
    <EffectSelect
      aria-label={label}
      disabled={disabled}
      label={label}
      onChange={(event) => {
        const selectedOption = options.find(
          (option) => String(option.value) === event.currentTarget.value
        );
        if (selectedOption !== undefined) onChange(selectedOption.value);
      }}
      value={value}
    >
      {options.map((option) => (
        <option disabled={option.disabled} key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </EffectSelect>
  );
}

export function ToggleControl({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      className="group focus-visible:inset-ring-primary relative flex h-7 w-full cursor-pointer items-center justify-between gap-[5px] rounded-md border-0 bg-(--tuner-surface) px-2 font-[inherit] font-medium text-(color:--tuner-label) focus-visible:inset-ring-1 focus-visible:outline-none data-[checked=true]:text-(color:--tuner-strong) [&:hover]:bg-(--tuner-surface-hover)"
      data-checked={checked}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span>{label}</span>
      <span
        className="relative block h-4 w-[30px] rounded-[10px] bg-(--tuner-surface-active) group-data-[checked=true]:bg-[color-mix(in_srgb,var(--primary)_48%,var(--tuner-surface-active))]"
        aria-hidden="true"
      >
        <span className="absolute top-0.5 left-0.5 block size-3 rounded-full bg-(--tuner-strong) transition-transform duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-data-[checked=true]:translate-x-3.5" />
      </span>
    </button>
  );
}
