"use client";

import type { HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

import { SearchIcon } from "@/icons";
import {
  CommandInputPrimitive,
  CommandItemPrimitive,
  CommandListPrimitive,
  CommandRoot,
  type CommandItemPrimitiveProps,
} from "@/lib/ui/command";
import { Modal } from "@/lib/ui/modal";
import { cn } from "@/lib/utils";

type CommandDialogProps = {
  children: ReactNode;
  className?: string;
  description: string;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  overlayClassName: string;
  placement?: "desktop" | "viewport";
  portalContainer?: HTMLElement | null;
  title: string;
};

function CommandDialog({
  children,
  className,
  description,
  inputValue,
  onInputValueChange,
  onOpenChange,
  open,
  overlayClassName,
  placement = "viewport",
  portalContainer,
  title,
}: CommandDialogProps) {
  return (
    <Modal
      ariaLabel={title}
      className={cn("outline-none", className)}
      data-placement={placement}
      onOpenChange={onOpenChange}
      open={open}
      overlayClassName={cn("isolate", overlayClassName)}
      overlayProps={{ "data-placement": placement }}
      portalContainer={portalContainer}
    >
      <div className="sr-only">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <CommandRoot inputValue={inputValue} onInputValueChange={onInputValueChange}>
        {children}
      </CommandRoot>
    </Modal>
  );
}

type CommandInputProps = InputHTMLAttributes<HTMLInputElement> & {
  wrapperClassName?: string;
};

function CommandInput({ className, wrapperClassName, ...props }: CommandInputProps) {
  return (
    <div
      className={cn("flex h-12 items-center gap-2 border-b px-3", wrapperClassName)}
      data-slot="command-input-wrapper"
    >
      <SearchIcon aria-hidden className="size-5 shrink-0 opacity-50" />
      <CommandInputPrimitive
        className={cn(
          "text-ui placeholder:text-muted-foreground flex h-12 w-full rounded-md bg-transparent py-3 outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        data-slot="command-input"
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <CommandListPrimitive
      className={cn(
        "scroll-fade-y max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto",
        className
      )}
      data-slot="command-list"
      {...props}
    />
  );
}

function CommandItem({ className, ...props }: CommandItemPrimitiveProps) {
  return (
    <CommandItemPrimitive
      className={cn(
        "text-ui data-highlighted:bg-accent data-highlighted:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      data-slot="command-item"
      {...props}
    />
  );
}

export { CommandDialog, CommandInput, CommandItem, CommandList };
