import { TerminalWindow } from "@/components/home/terminal-window";
import type { LayoutNode } from "@/lib/home-desktop-layout";
import type { DesktopWindow } from "@/lib/home-desktop-session";
import type { TerminalSubmitResult } from "@/lib/home-terminal-line-editor";
import type { CursorStyle } from "@/lib/home-terminal-runtime";

export function SplitLayout({
  active,
  cursorBlink,
  cursorStyle,
  focusedWindowId,
  node,
  onClear,
  onFocus,
  onInterrupt,
  onSubmit,
  windows,
}: {
  active: boolean;
  cursorBlink: boolean;
  cursorStyle: CursorStyle;
  focusedWindowId: number | null;
  node: LayoutNode;
  onClear: (windowId: number) => void;
  onFocus: (windowId: number) => void;
  onInterrupt: (windowId: number) => void;
  onSubmit: (windowId: number, command: string) => TerminalSubmitResult;
  windows: DesktopWindow[];
}) {
  if (node.kind === "window") {
    const desktopWindow = windows.find((window) => window.id === node.windowId);
    if (!desktopWindow) return null;

    return (
      <section
        aria-label="Omarchy terminal window"
        className="home-desktop-window"
        data-focused={focusedWindowId === desktopWindow.id}
        onFocusCapture={() => onFocus(desktopWindow.id)}
      >
        <TerminalWindow
          active={active}
          cursorBlink={cursorBlink}
          cursorStyle={cursorStyle}
          focused={focusedWindowId === desktopWindow.id}
          onClear={() => onClear(desktopWindow.id)}
          onInterrupt={() => onInterrupt(desktopWindow.id)}
          onSubmit={(command) => onSubmit(desktopWindow.id, command)}
          shell={desktopWindow.shell}
        />
      </section>
    );
  }

  const style =
    node.axis === "horizontal"
      ? { gridTemplateColumns: `minmax(0, ${node.ratio}fr) minmax(0, ${100 - node.ratio}fr)` }
      : { gridTemplateRows: `minmax(0, ${node.ratio}fr) minmax(0, ${100 - node.ratio}fr)` };

  return (
    <div className="home-desktop-split" data-axis={node.axis} style={style}>
      <SplitLayout
        active={active}
        cursorBlink={cursorBlink}
        cursorStyle={cursorStyle}
        focusedWindowId={focusedWindowId}
        node={node.first}
        onClear={onClear}
        onFocus={onFocus}
        onInterrupt={onInterrupt}
        onSubmit={onSubmit}
        windows={windows}
      />
      <SplitLayout
        active={active}
        cursorBlink={cursorBlink}
        cursorStyle={cursorStyle}
        focusedWindowId={focusedWindowId}
        node={node.second}
        onClear={onClear}
        onFocus={onFocus}
        onInterrupt={onInterrupt}
        onSubmit={onSubmit}
        windows={windows}
      />
    </div>
  );
}
