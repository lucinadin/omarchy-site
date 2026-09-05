"use client";

import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type SegmentedControlContextValue = {
  name: string;
  onValueChange: (value: string) => void;
  value: string;
};

const SegmentedControlContext = createContext<SegmentedControlContextValue | null>(null);

type SegmentedControlProps = Omit<ComponentProps<"fieldset">, "onChange"> & {
  onValueChange: (value: string) => void;
  value: string;
};

export function SegmentedControl({
  children,
  className,
  onValueChange,
  value,
  ...props
}: SegmentedControlProps) {
  const name = useId();
  return (
    <SegmentedControlContext value={{ name, onValueChange, value }}>
      <fieldset
        className={cn(
          "border-border bg-background m-0 inline-grid h-8 w-fit auto-cols-fr grid-flow-col overflow-hidden border p-0",
          className
        )}
        data-slot="segmented-control"
        {...props}
      >
        {children}
      </fieldset>
    </SegmentedControlContext>
  );
}

type SegmentedControlItemProps = Omit<
  ComponentProps<"input">,
  "checked" | "children" | "className" | "name" | "onChange" | "type" | "value"
> & {
  children: ReactNode;
  className?: string;
  value: string;
};

export function SegmentedControlItem({
  children,
  className,
  value,
  ...props
}: SegmentedControlItemProps) {
  const context = useContext(SegmentedControlContext);
  if (!context) throw new Error("SegmentedControlItem must be inside SegmentedControl");

  return (
    <label
      className={cn(
        "border-border text-micro/ui text-muted-foreground hover:bg-surface hover:text-bright-foreground has-[:focus-visible]:outline-ring has-[:checked]:bg-primary has-[:checked]:text-primary-foreground relative inline-flex min-h-8 min-w-0 cursor-pointer items-center justify-center border-l px-2.5 font-medium first:border-l-0 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:z-[1] has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2",
        className
      )}
      data-slot="segmented-control-item"
    >
      <input
        checked={context.value === value}
        className="sr-only"
        name={context.name}
        onChange={() => context.onValueChange(value)}
        type="radio"
        value={value}
        {...props}
      />
      <span>{children}</span>
    </label>
  );
}
