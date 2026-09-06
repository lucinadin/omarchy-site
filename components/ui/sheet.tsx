"use client";

import {
  createContext,
  useContext,
  type DialogHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { CloseIcon } from "@/icons";
import { Modal } from "@/lib/ui/modal";
import { cn } from "@/lib/utils";

type SheetContextValue = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const context = useContext(SheetContext);
  if (!context) throw new Error("SheetContent must be rendered inside Sheet.");
  return context;
}

function Sheet({ children, onOpenChange, open }: SheetContextValue & { children: ReactNode }) {
  return <SheetContext value={{ onOpenChange, open }}>{children}</SheetContext>;
}

function SheetContent({
  ariaLabel,
  children,
  className,
  ...props
}: DialogHTMLAttributes<HTMLDialogElement> & {
  ariaLabel: string;
}) {
  const { onOpenChange, open } = useSheetContext();

  return (
    <Modal
      ariaLabel={ariaLabel}
      className={cn(
        "border-border bg-background text-foreground fixed inset-y-0 right-0 z-[211] flex h-dvh w-[min(28rem,100vw)] max-w-full animate-[sheet-from-right_220ms_cubic-bezier(0.22,1,0.36,1)_both] flex-col overflow-hidden border outline-none",
        className
      )}
      data-slot="sheet-content"
      onOpenChange={onOpenChange}
      open={open}
      overlayClassName="fixed inset-0 z-[210] animate-[modal-fade-in_180ms_ease_both] bg-[color-mix(in_srgb,var(--darker-background)_72%,transparent)] opacity-100 backdrop-blur-[3px]"
      {...props}
    >
      {children}
      <button
        aria-label="Close"
        className="border-border text-muted-foreground hover:border-primary hover:text-primary absolute top-5 right-5 inline-flex size-9 cursor-pointer items-center justify-center border bg-transparent p-0"
        data-slot="sheet-close"
        onClick={() => onOpenChange(false)}
        type="button"
      >
        <CloseIcon aria-hidden size={17} />
      </button>
    </Modal>
  );
}

function SheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("grid gap-[0.45rem] pt-[1.4rem] pr-[4.75rem] pb-5 pl-[1.4rem]", className)}
      data-slot="sheet-header"
      {...props}
    />
  );
}

function SheetTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-body text-bright-foreground m-0 font-medium", className)}
      data-slot="sheet-title"
      {...props}
    >
      {children}
    </h2>
  );
}

function SheetDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-meta text-muted-foreground m-0", className)}
      data-slot="sheet-description"
      {...props}
    />
  );
}

export { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle };
