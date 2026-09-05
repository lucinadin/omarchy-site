import type * as React from "react";

import { cn } from "@/lib/utils";

export function Card({
  as: Element = "div",
  className,
  ...props
}: React.ComponentProps<"div"> & { as?: "div" | "article" }) {
  return (
    <Element
      className={cn("bg-card text-card-foreground border-border flex flex-col border", className)}
      data-slot="card"
      {...props}
    />
  );
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center", className)} data-slot="card-footer" {...props} />;
}
