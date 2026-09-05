import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "focus-visible:ring-ring focus-visible:ring-offset-background inline-flex cursor-pointer items-center justify-center gap-2 border font-bold tracking-[-0.015em] transition-[background-color,color,border-color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "button-primary border-primary bg-primary hover:bg-primary/85",
        secondary:
          "border-border bg-surface text-foreground hover:border-foreground/45 hover:bg-surface-strong",
        ghost:
          "text-muted-foreground hover:bg-surface hover:text-bright-foreground border-transparent bg-transparent",
      },
      size: {
        default: "text-small h-12 min-h-11 px-5",
        compact: "text-small h-10 min-h-10 px-3",
        hero: "text-meta h-[42px] min-h-[42px] min-w-0 flex-[1_1_9rem] px-3.5 sm:flex-none",
        icon: "text-small h-10 min-h-10 w-10 shrink-0 px-0",
        compactIcon: "size-[30px] min-h-[30px] shrink-0 p-0 [&_svg]:size-[13px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

type ButtonProps = Omit<ComponentProps<"button">, "type"> & VariantProps<typeof buttonVariants>;

export function Button({ className, size, variant, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ size, variant }), className)} type="button" {...props} />
  );
}
