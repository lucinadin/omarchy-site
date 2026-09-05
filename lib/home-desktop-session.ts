import type { Dispatch, SetStateAction } from "react";

import { clockFormatCommand } from "@/lib/home-desktop-clock";
import {
  directionalWindow,
  insertWindow,
  parseDesktopWorkspaceId,
  removeWindow,
  resizeNearestSplit,
  swapWindows,
  toggleNearestSplit,
  windowDirectionForCode,
  type DesktopWorkspaceId,
  type LayoutNode,
  type SplitAxis,
} from "@/lib/home-desktop-layout";
import { terminalCompletionPaths } from "@/lib/home-terminal-commands";
import { TerminalLineEditor } from "@/lib/home-terminal-line-editor";
import { emptyTerminalSession, type TerminalSession } from "@/lib/home-terminal-runtime";

export type DesktopWindow = {
  id: number;
  session: TerminalSession;
  shell: TerminalLineEditor;
};

type WorkspaceState = {
  focusedWindowId: number | null;
  layout: LayoutNode | null;
  splitAxis: SplitAxis;
  windows: DesktopWindow[];
};

export type WorkspaceMap = Record<DesktopWorkspaceId, WorkspaceState>;

const esc = "\u001B[";
const reset = `${esc}0m`;
const bold = `${esc}1m`;
const cyan = `${esc}36m`;
const dim = `${esc}2m`;
const green = `${esc}32m`;
const defaultTerminalCommand = clockFormatCommand("ddd dd MMM hh:mm:ss AP");
const terminalWelcome = [
  `${cyan}${bold}Omarchy browser shell${reset}`,
  "",
  `${dim}Tab complete · ↑/↓ history · help lists commands${reset}`,
  `${dim}exit closes here · SUPER + W / Q closes windows in Omarchy${reset}`,
  `${dim}Changes apply to this browser desktop only.${reset}`,
  "",
];
const terminalPrompt = `${green}${bold}~ ❯${reset} `;
function emptyWorkspace(): WorkspaceState {
  return { focusedWindowId: null, layout: null, splitAxis: "horizontal", windows: [] };
}

export function initialWorkspaces(initialWorkspace?: DesktopWorkspaceId): WorkspaceMap {
  const workspaces: WorkspaceMap = {
    2: emptyWorkspace(),
    3: emptyWorkspace(),
    4: emptyWorkspace(),
    5: emptyWorkspace(),
  };

  if (initialWorkspace) {
    workspaces[initialWorkspace] = {
      focusedWindowId: 1,
      layout: { kind: "window", windowId: 1 },
      splitAxis: "horizontal",
      windows: [createTerminalWindow(1, true)],
    };
  }

  return workspaces;
}

export function createTerminalWindow(id: number, showWelcome = false): DesktopWindow {
  return {
    id,
    session: emptyTerminalSession(),
    shell: new TerminalLineEditor({
      completionPaths: terminalCompletionPaths,
      initialLine: defaultTerminalCommand,
      prompt: terminalPrompt,
      promptWidth: 4,
      welcome: showWelcome ? terminalWelcome : [],
    }),
  };
}

type DesktopShortcutRuntime = {
  activeWorkspace: 1 | DesktopWorkspaceId;
  changeWorkspace: (workspace: 1 | DesktopWorkspaceId) => void;
  nextWindowIdRef: { current: number };
  rootRef: { current: HTMLDivElement | null };
  setWorkspaces: Dispatch<SetStateAction<WorkspaceMap>>;
  terminalWelcomeShownRef: { current: boolean };
  workspacesRef: { current: WorkspaceMap };
};

type ActiveDesktopShortcut = DesktopShortcutRuntime & {
  workspace: WorkspaceState;
  workspaceId: DesktopWorkspaceId;
};

function cycleDesktopWindow(event: KeyboardEvent, context: ActiveDesktopShortcut) {
  const { setWorkspaces, workspace, workspaceId } = context;
  if (
    event.code === "Tab" &&
    event.altKey &&
    !event.metaKey &&
    !event.ctrlKey &&
    workspace.windows.length > 1
  ) {
    event.preventDefault();
    const currentIndex = workspace.windows.findIndex(
      (window) => window.id === workspace.focusedWindowId
    );
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex =
      (currentIndex + direction + workspace.windows.length) % workspace.windows.length;
    setWorkspaces((current) => ({
      ...current,
      [workspaceId]: {
        ...current[workspaceId],
        focusedWindowId: workspace.windows[nextIndex].id,
      },
    }));
    return true;
  }
  return false;
}

function openDesktopWindow(event: KeyboardEvent, context: ActiveDesktopShortcut) {
  const { nextWindowIdRef, setWorkspaces, terminalWelcomeShownRef, workspace, workspaceId } =
    context;
  if (
    event.code === "Enter" &&
    !event.shiftKey &&
    !event.altKey &&
    !event.ctrlKey &&
    workspace.windows.length < 4
  ) {
    event.preventDefault();
    const id = nextWindowIdRef.current;
    nextWindowIdRef.current += 1;
    const showWelcome = !terminalWelcomeShownRef.current;
    terminalWelcomeShownRef.current = true;
    setWorkspaces((current) => {
      const currentWorkspace = current[workspaceId];
      if (currentWorkspace.windows.length >= 4) return current;

      return {
        ...current,
        [workspaceId]: {
          ...currentWorkspace,
          focusedWindowId: id,
          layout: insertWindow(
            currentWorkspace.layout,
            currentWorkspace.focusedWindowId,
            id,
            currentWorkspace.splitAxis
          ),
          windows: [...currentWorkspace.windows, createTerminalWindow(id, showWelcome)],
        },
      };
    });
    return true;
  }
  return false;
}

function toggleDesktopSplit(event: KeyboardEvent, context: ActiveDesktopShortcut) {
  const { setWorkspaces, workspace, workspaceId } = context;
  if (
    event.code === "KeyJ" &&
    !event.shiftKey &&
    !event.altKey &&
    !event.ctrlKey &&
    workspace.focusedWindowId &&
    workspace.layout
  ) {
    event.preventDefault();
    setWorkspaces((current) => {
      const currentWorkspace = current[workspaceId];
      const splitAxis = currentWorkspace.splitAxis === "horizontal" ? "vertical" : "horizontal";
      const toggled =
        currentWorkspace.layout && currentWorkspace.focusedWindowId
          ? toggleNearestSplit(currentWorkspace.layout, currentWorkspace.focusedWindowId)
          : null;
      return {
        ...current,
        [workspaceId]: {
          ...currentWorkspace,
          layout: toggled?.node ?? currentWorkspace.layout,
          splitAxis,
        },
      };
    });
    return true;
  }
  return false;
}

function moveDesktopFocus(event: KeyboardEvent, context: ActiveDesktopShortcut) {
  const { setWorkspaces, workspace, workspaceId } = context;
  const direction = windowDirectionForCode(event.code);
  if (!direction || workspace.windows.length <= 1) return false;

  const targetWindowId =
    workspace.layout && workspace.focusedWindowId
      ? directionalWindow(workspace.layout, workspace.focusedWindowId, direction)
      : null;
  if (!targetWindowId) return true;

  if (event.shiftKey && !event.altKey && !event.ctrlKey && workspace.layout) {
    event.preventDefault();
    setWorkspaces((current) => ({
      ...current,
      [workspaceId]: {
        ...current[workspaceId],
        layout: current[workspaceId].layout
          ? swapWindows(
              current[workspaceId].layout,
              current[workspaceId].focusedWindowId ?? targetWindowId,
              targetWindowId
            )
          : null,
      },
    }));
    return true;
  }

  if (!event.shiftKey && !event.altKey && !event.ctrlKey) {
    event.preventDefault();
    setWorkspaces((current) => ({
      ...current,
      [workspaceId]: {
        ...current[workspaceId],
        focusedWindowId: targetWindowId,
      },
    }));
  }
  return true;
}

function resizeDesktopWindow(event: KeyboardEvent, context: ActiveDesktopShortcut) {
  const { setWorkspaces, workspace, workspaceId } = context;
  if (
    (event.code === "Minus" || event.code === "Equal") &&
    workspace.windows.length > 1 &&
    workspace.focusedWindowId &&
    workspace.layout
  ) {
    const axis: SplitAxis = event.shiftKey ? "vertical" : "horizontal";
    const step = event.altKey ? 2 : event.ctrlKey ? 12 : 6;
    const amount = event.code === "Minus" ? step : -step;
    const resized = resizeNearestSplit(workspace.layout, workspace.focusedWindowId, axis, amount);
    if (!resized.resized) return true;

    event.preventDefault();
    setWorkspaces((current) => ({
      ...current,
      [workspaceId]: { ...current[workspaceId], layout: resized.node },
    }));
    return true;
  }
  return false;
}

function moveDesktopWindowToWorkspace(event: KeyboardEvent, context: ActiveDesktopShortcut) {
  const { changeWorkspace, setWorkspaces, workspace, workspaceId, workspacesRef } = context;
  if (
    event.shiftKey &&
    !event.ctrlKey &&
    /^Digit[2-5]$/u.test(event.code) &&
    workspace.focusedWindowId
  ) {
    event.preventDefault();
    const targetWorkspaceId = parseDesktopWorkspaceId(Number(event.code.at(-1)));
    if (targetWorkspaceId === null) return true;
    if (targetWorkspaceId === workspaceId) return true;
    if (workspacesRef.current[targetWorkspaceId].windows.length >= 4) return true;
    const movingWindow = workspace.windows.find(
      (window) => window.id === workspace.focusedWindowId
    );
    if (!movingWindow) return true;

    setWorkspaces((current) => {
      const source = current[workspaceId];
      const target = current[targetWorkspaceId];
      const sourceWindows = source.windows.filter((window) => window.id !== movingWindow.id);
      return {
        ...current,
        [workspaceId]: {
          ...source,
          focusedWindowId: sourceWindows.at(-1)?.id ?? null,
          layout: removeWindow(source.layout, movingWindow.id),
          windows: sourceWindows,
        },
        [targetWorkspaceId]: {
          ...target,
          focusedWindowId: movingWindow.id,
          layout: insertWindow(
            target.layout,
            target.focusedWindowId,
            movingWindow.id,
            target.splitAxis
          ),
          windows: [...target.windows, movingWindow].slice(-4),
        },
      };
    });
    if (!event.altKey) changeWorkspace(targetWorkspaceId);
    return true;
  }
  return false;
}

export function handleDesktopShortcut(event: KeyboardEvent, runtime: DesktopShortcutRuntime) {
  if (runtime.activeWorkspace === 1 || event.repeat) return;
  const bounds = runtime.rootRef.current?.getBoundingClientRect();
  if (!bounds || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;

  const context: ActiveDesktopShortcut = {
    ...runtime,
    workspace: runtime.workspacesRef.current[runtime.activeWorkspace],
    workspaceId: runtime.activeWorkspace,
  };
  if (cycleDesktopWindow(event, context) || !event.metaKey) return;
  if (openDesktopWindow(event, context)) return;
  if (toggleDesktopSplit(event, context)) return;
  if (moveDesktopFocus(event, context)) return;
  if (resizeDesktopWindow(event, context)) return;
  moveDesktopWindowToWorkspace(event, context);
}
