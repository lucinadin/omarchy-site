"use client";

import type { PointerEvent, ReactNode } from "react";

import { KbdShortcut } from "@/components/ui/kbd";
import { useHostModifierLabel } from "@/hooks";
import { requestHomeDesktopSurface } from "@/lib/home-desktop-events";
import { requestSiteSearch } from "@/lib/site-search-events";

function preventPointerFocus(event: PointerEvent<HTMLButtonElement>) {
  event.preventDefault();
}

function ShortcutAction({
  accessibleLabel,
  children,
  onClick,
  title,
}: {
  accessibleLabel: string;
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      aria-label={accessibleLabel}
      className="font-inherit pointer-events-auto inline-flex cursor-default items-center gap-1 border-0 bg-transparent p-0 text-inherit outline-none select-none"
      onClick={onClick}
      onPointerDown={preventPointerFocus}
      tabIndex={-1}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

export function HomeDesktopShortcutHints({
  onNextTheme,
  onOpenTerminal,
  showTerminalShortcut,
}: {
  onNextTheme: () => void;
  onOpenTerminal: () => void;
  showTerminalShortcut: boolean;
}) {
  const hostModifierLabel = useHostModifierLabel();
  const superShortcutLabel =
    hostModifierLabel === "Super" ? "Super" : `Super (${hostModifierLabel})`;
  const hyperShortcutLabel = `Hyper (${hostModifierLabel} + Ctrl + Shift)`;

  return (
    <>
      <div
        aria-hidden="true"
        className="from-background/45 pointer-events-none absolute inset-x-0 top-0 z-[2] hidden h-20 bg-linear-to-b to-transparent sm:block"
      />
      <div
        aria-label="Keyboard shortcuts"
        className="text-meta/none text-foreground/45 pointer-events-none absolute top-2 left-1/2 z-[3] hidden w-max -translate-x-1/2 items-center gap-2 font-mono whitespace-nowrap select-none sm:flex"
      >
        <ShortcutAction
          accessibleLabel={`Search, ${superShortcutLabel} plus Space`}
          onClick={requestSiteSearch}
          title={`Search · ${superShortcutLabel} + Space`}
        >
          <span>Search</span>
          <KbdShortcut modifierLabel="Super" modifierSymbol="❖" variant="hint">
            Space
          </KbdShortcut>
        </ShortcutAction>
        <span aria-hidden="true" className="text-foreground/25">
          ·
        </span>
        <ShortcutAction
          accessibleLabel={`Themes, ${hyperShortcutLabel} plus Space`}
          onClick={() => requestHomeDesktopSurface("theme")}
          title={`Themes · ${hyperShortcutLabel} + Space`}
        >
          <span>Themes</span>
          <KbdShortcut modifierLabel="Hyper" modifierSymbol="✦" variant="hint">
            Space
          </KbdShortcut>
        </ShortcutAction>
        <span aria-hidden="true" className="text-foreground/25">
          ·
        </span>
        <ShortcutAction
          accessibleLabel={`Next theme in this preview, ${hyperShortcutLabel} plus T`}
          onClick={onNextTheme}
          title={`Next theme · ${hyperShortcutLabel} + T`}
        >
          <span>
            Next theme<span className="sr-only"> in this preview</span>
          </span>
          <KbdShortcut modifierLabel="Hyper" modifierSymbol="✦" variant="hint">
            T
          </KbdShortcut>
        </ShortcutAction>
        {showTerminalShortcut ? (
          <>
            <span aria-hidden="true" className="text-foreground/25">
              ·
            </span>
            <ShortcutAction
              accessibleLabel={`Terminal, ${superShortcutLabel} plus Enter`}
              onClick={onOpenTerminal}
              title={`Terminal · ${superShortcutLabel} + Enter`}
            >
              <span>Terminal</span>
              <KbdShortcut modifierLabel="Super" modifierSymbol="❖" variant="hint">
                Enter
              </KbdShortcut>
            </ShortcutAction>
          </>
        ) : null}
      </div>
    </>
  );
}
