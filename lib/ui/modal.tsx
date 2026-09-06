"use client";

import {
  useLayoutEffect,
  useRef,
  type DialogHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { isolateModal } from "@/lib/ui/modal-isolation";
import { cn } from "@/lib/utils";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type DataAttributes = {
  [attribute: `data-${string}`]: boolean | number | string | undefined;
};

function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(":disabled") &&
      !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
      element.checkVisibility({ visibilityProperty: true })
  );
}

type ModalProps = Omit<DialogHTMLAttributes<HTMLDialogElement>, "children" | "open"> & {
  ariaLabel: string;
  children: ReactNode;
  initialFocus?: "content" | "first";
  onOpenChange: (open: boolean) => void;
  open: boolean;
  overlayClassName?: string;
  overlayProps?: Omit<
    HTMLAttributes<HTMLDivElement>,
    "aria-hidden" | "children" | "className" | "onClick"
  > &
    DataAttributes;
  portalContainer?: HTMLElement | null;
  renderOverlay?: (overlay: ReactNode) => ReactNode;
};

export function Modal({
  ariaLabel,
  children,
  className,
  initialFocus = "first",
  onKeyDown,
  onOpenChange,
  open,
  overlayClassName,
  overlayProps,
  portalContainer,
  renderOverlay,
  ...contentProps
}: ModalProps) {
  const contentRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const portalTarget = portalContainer ?? (typeof document === "undefined" ? null : document.body);

  useLayoutEffect(() => {
    if (!open) return;

    const content = contentRef.current;
    const portal = content?.parentElement;
    if (!content || !portal || portal.parentElement !== portalTarget) return;

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseIsolation = isolateModal(portal);

    const focusable = focusableElements(content);
    const requestedFocus =
      initialFocus === "content"
        ? content
        : focusable.find((element) => element.hasAttribute("autofocus"));
    const focusTarget = requestedFocus ?? focusable[0] ?? content;
    focusTarget.focus({ preventScroll: true });

    const containFocus = (event: FocusEvent) => {
      if (content.closest("[inert]")) return;
      if (event.target instanceof Node && !content.contains(event.target)) {
        (focusableElements(content)[0] ?? content).focus({ preventScroll: true });
      }
    };
    document.addEventListener("focusin", containFocus);

    return () => {
      document.removeEventListener("focusin", containFocus);
      releaseIsolation();
      if (returnFocusRef.current?.isConnected)
        returnFocusRef.current.focus({ preventScroll: true });
      returnFocusRef.current = null;
    };
  }, [initialFocus, open, portalTarget]);

  if (!open) return null;

  if (!portalTarget) return null;

  const overlay = (
    <div
      {...overlayProps}
      aria-hidden="true"
      className={overlayClassName}
      data-slot="modal-overlay"
      onClick={(event) => {
        if (event.button === 0 && event.target === event.currentTarget) onOpenChange(false);
      }}
    />
  );

  return createPortal(
    <div data-slot="modal-portal">
      {renderOverlay ? renderOverlay(overlay) : overlay}
      <dialog
        {...contentProps}
        aria-label={ariaLabel}
        aria-modal="true"
        className={cn(
          "m-0 max-h-none max-w-none border-0 bg-transparent p-0 text-inherit",
          className
        )}
        data-slot="modal-content"
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) return;
          if (event.key === "Escape") {
            event.preventDefault();
            onOpenChange(false);
            return;
          }

          if (event.key !== "Tab") return;

          const content = contentRef.current;
          if (!content) return;
          const focusable = focusableElements(content);
          if (focusable.length === 0) {
            event.preventDefault();
            content.focus();
            return;
          }

          const first = focusable[0];
          const last = focusable.at(-1);
          const active = document.activeElement;
          const outsideControls = active === content || !content.contains(active);
          if (event.shiftKey && (active === first || outsideControls)) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && (active === last || outsideControls)) {
            event.preventDefault();
            first.focus();
          }
        }}
        open
        ref={contentRef}
        tabIndex={-1}
      >
        {children}
      </dialog>
    </div>,
    portalTarget
  );
}
