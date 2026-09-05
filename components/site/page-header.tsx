import type { ComponentPropsWithoutRef } from "react";

import { PageBackLink } from "@/components/site/page-back-link";
import { LogoEffectsSurface } from "@/features/effects/components/logo-effects-surface";
import { cn } from "@/lib/utils";

type PageHeaderProps = ComponentPropsWithoutRef<"header"> & {
  align?: "center" | "start";
  backHref?: string;
  backLabel?: string;
  visualClassName?: string;
};

export function PageHeader({
  align = "center",
  backHref,
  backLabel,
  children,
  className,
  visualClassName,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mx-auto flex max-w-[900px] flex-col items-center text-center",
        align === "start" && "mx-0 max-w-none items-start text-left",
        className
      )}
      {...props}
    >
      <PageBackLink href={backHref}>{backLabel}</PageBackLink>
      <LogoEffectsSurface
        aria-hidden="true"
        className={cn("mb-fluid-lg w-[min(100%,22rem)] max-w-full", visualClassName)}
      />
      {children}
    </header>
  );
}

export function PageHeaderEyebrow({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return <p className={cn("section-label", className)} {...props} />;
}

export function PageHeaderTitle({ children, className, ...props }: ComponentPropsWithoutRef<"h1">) {
  return (
    <h1
      className={cn(
        "text-title-xl text-bright-foreground mt-4 mb-0 font-light tracking-[-0.045em] text-balance",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export function PageHeaderDescription({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn(
        "text-lead text-muted-foreground mt-6 mb-0 max-w-[70ch] text-pretty",
        className
      )}
      {...props}
    />
  );
}

export function PageHeaderBody({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("text-muted-foreground mt-fluid-lg w-full max-w-[70ch] text-left", className)}
      {...props}
    />
  );
}

export function PageHeaderMeta({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("mt-8", className)} {...props} />;
}
