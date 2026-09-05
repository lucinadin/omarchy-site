"use client";
import { Terminal, type WTerm } from "@wterm/react";
import { useEffect, useRef, type CSSProperties } from "react";

import type {
  TerminalLineEditor,
  TerminalSubmitResult,
  TerminalSurface,
} from "@/lib/home-terminal-line-editor";
import type { CursorStyle } from "@/lib/home-terminal-runtime";

function createTerminalSurface(terminal: WTerm): TerminalSurface {
  return {
    get cols() {
      return terminal.cols;
    },
    write(data: string) {
      terminal.write(data);
    },
  };
}

export function TerminalWindow({
  active,
  cursorBlink,
  cursorStyle,
  focused,
  onClear,
  onInterrupt,
  onSubmit,
  shell,
}: {
  active: boolean;
  cursorBlink: boolean;
  cursorStyle: CursorStyle;
  focused: boolean;
  onClear: () => void;
  onInterrupt: () => void;
  onSubmit: (command: string) => TerminalSubmitResult;
  shell: TerminalLineEditor;
}) {
  const terminalRef = useRef<WTerm | null>(null);
  const surfaceRef = useRef<TerminalSurface | null>(null);
  const callbacksRef = useRef({ onClear, onInterrupt, onSubmit });

  useEffect(() => {
    callbacksRef.current = { onClear, onInterrupt, onSubmit };
  }, [onClear, onInterrupt, onSubmit]);

  useEffect(() => {
    shell.configure({
      onClear: () => callbacksRef.current.onClear(),
      onInterrupt: () => callbacksRef.current.onInterrupt(),
      onSubmit: (command) => callbacksRef.current.onSubmit(command),
    });
  }, [shell]);

  useEffect(
    () => () => {
      const surface = surfaceRef.current;
      if (surface) shell.detach(surface);
      surfaceRef.current = null;
    },
    [shell]
  );

  useEffect(() => {
    if (!active || !focused) return;
    const frame = requestAnimationFrame(() => terminalRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [active, focused]);

  // oxlint-disable omarchy/no-unscaled-typography -- terminal cell metrics must remain synchronized with its grid.
  const terminalStyle = {
    "--term-font-size": "8.5px",
    "--term-row-height": "11px",
    fontSize: "8.5px",
    height: "100%",
    lineHeight: "11px",
    padding: "8px",
  } satisfies CSSProperties;
  // oxlint-enable omarchy/no-unscaled-typography

  return (
    <Terminal
      aria-label="Omarchy terminal"
      autoResize
      className="omarchy-terminal home-desktop-terminal shadow-none"
      cols={80}
      cursorBlink={cursorBlink}
      data-cursor-style={cursorStyle}
      onData={(data) => shell.handleInput(data)}
      onReady={(terminal) => {
        terminalRef.current = terminal;
        const surface = createTerminalSurface(terminal);
        surfaceRef.current = surface;
        shell.attach(surface);
      }}
      rows={28}
      style={terminalStyle}
    />
  );
}
