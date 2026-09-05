import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

type KbdProps = Omit<ComponentProps<"kbd">, "className"> & {
  variant?: VariantProps<typeof kbdVariants>["variant"];
};

const kbdVariants = cva("inline-flex items-center border font-mono font-semibold", {
  variants: {
    variant: {
      default:
        "border-border bg-surface-strong text-meta/none text-bright-foreground inset-shadow-keycap min-h-6 px-1.5",
      hint: "border-foreground/15 bg-background/70 text-meta/none text-foreground/70 min-h-4 px-1",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const kbdSymbolVariants = cva(
  "inline-flex items-center justify-center border font-mono font-semibold",
  {
    variants: {
      variant: {
        default:
          "border-border bg-surface-strong text-ui/none text-bright-foreground inset-shadow-keycap size-6 min-h-0 p-0",
        hint: "border-foreground/15 bg-background/70 text-meta/none text-foreground/70 size-4 min-h-0 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Kbd({ variant = "default", ...props }: KbdProps) {
  return <kbd className={kbdVariants({ variant })} {...props} />;
}

export function KbdShortcut({
  children,
  modifierLabel,
  modifierSymbol,
  variant = "default",
}: {
  children: string;
  modifierLabel: string;
  modifierSymbol: string;
  variant?: VariantProps<typeof kbdVariants>["variant"];
}) {
  return (
    <span className="inline-flex flex-nowrap items-center gap-0.5">
      <kbd aria-label={modifierLabel} className={kbdSymbolVariants({ variant })}>
        <span aria-hidden="true" className="kbd-symbol__glyph">
          {modifierSymbol}
        </span>
      </kbd>
      <span aria-hidden="true">+</span>
      <Kbd variant={variant}>{children}</Kbd>
    </span>
  );
}
