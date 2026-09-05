"use client";

import { useRouter } from "next/navigation";
import { Activity, useEffect, useEffectEvent, useRef, useState } from "react";

import { SplitLayout } from "@/components/home/desktop-layout";
import { HomeDesktopShortcutHints } from "@/components/home/home-desktop-shortcut-hints";
import { HomeEmptyWorkspace } from "@/components/home/home-empty-workspace";
import {
  desktopWorkspaceIds,
  insertWindow,
  removeWindow,
  type BarPosition,
  type DesktopWorkspaceId,
} from "@/lib/home-desktop-layout";
import {
  createTerminalWindow,
  handleDesktopShortcut,
  initialWorkspaces,
  type WorkspaceMap,
} from "@/lib/home-desktop-session";
import { terminalCompletionPaths } from "@/lib/home-terminal-commands";
import type { TerminalSubmitResult } from "@/lib/home-terminal-line-editor";
import {
  type CursorStyle,
  type DesktopCommandState,
  emptyTerminalSession,
  runTerminalCommand,
} from "@/lib/home-terminal-runtime";
import { omarchyIsoDownloadUrl } from "@/lib/site-links";

type HomeDesktopWorkspacesProps = {
  activeWorkspace: 1 | DesktopWorkspaceId;
  activeThemeId: string;
  barPosition: BarPosition;
  barTransparent: boolean;
  barVisible: boolean;
  clockFormat: string;
  initialWorkspace: DesktopWorkspaceId;
  mediaPluginEnabled: boolean;
  onBarPositionChange: (position: BarPosition) => void;
  onBarTransparencyChange: (transparent: boolean) => void;
  onBarVisibilityChange: (visible: boolean) => void;
  onClockFormatChange: (format: string) => void;
  onMediaPluginChange: (enabled: boolean) => void;
  onNextTheme: () => void;
  onThemeChange: (themeId: string) => void;
  onWorkspaceChange: (workspace: 1 | DesktopWorkspaceId) => void;
};

function downloadOmarchyIso() {
  const download = document.createElement("a");
  download.download = "";
  download.href = omarchyIsoDownloadUrl;
  download.rel = "noopener";
  document.body.append(download);
  download.click();
  download.remove();
}

function desktopStateChanged(current: DesktopCommandState, next: DesktopCommandState) {
  return (
    current.barPosition !== next.barPosition ||
    current.barTransparent !== next.barTransparent ||
    current.barVisible !== next.barVisible ||
    current.clockFormat !== next.clockFormat ||
    current.cursorBlink !== next.cursorBlink ||
    current.cursorStyle !== next.cursorStyle ||
    current.mediaPluginEnabled !== next.mediaPluginEnabled ||
    current.themeId !== next.themeId
  );
}

export function HomeDesktopWorkspaces({
  activeWorkspace,
  activeThemeId,
  barPosition,
  barTransparent,
  barVisible,
  clockFormat,
  initialWorkspace,
  mediaPluginEnabled,
  onBarPositionChange,
  onBarTransparencyChange,
  onBarVisibilityChange,
  onClockFormatChange,
  onMediaPluginChange,
  onNextTheme,
  onThemeChange,
  onWorkspaceChange,
}: HomeDesktopWorkspacesProps) {
  const changeWorkspace = useEffectEvent(onWorkspaceChange);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const nextWindowIdRef = useRef(2);
  const terminalWelcomeShownRef = useRef(true);
  const desktopHistoryRef = useRef<DesktopCommandState[]>([]);
  const [cursorBlink, setCursorBlink] = useState(false);
  const [cursorStyle, setCursorStyle] = useState<CursorStyle>("block");
  const [notification, setNotification] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceMap>(() =>
    initialWorkspaces(initialWorkspace)
  );
  const workspacesRef = useRef(workspaces);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    workspacesRef.current = workspaces;
  }, [workspaces]);

  function showNotification(message: string) {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    setNotification(message);
    notificationTimerRef.current = setTimeout(() => setNotification(null), 1800);
  }

  function currentDesktopState(): DesktopCommandState {
    return {
      barPosition,
      barTransparent,
      barVisible,
      clockFormat,
      cursorBlink,
      cursorStyle,
      mediaPluginEnabled,
      themeId: activeThemeId,
    };
  }

  function applyDesktopState(state: DesktopCommandState) {
    onBarPositionChange(state.barPosition);
    onBarTransparencyChange(state.barTransparent);
    onBarVisibilityChange(state.barVisible);
    onClockFormatChange(state.clockFormat);
    setCursorBlink(state.cursorBlink);
    setCursorStyle(state.cursorStyle);
    onMediaPluginChange(state.mediaPluginEnabled);
    onThemeChange(state.themeId);
  }

  function changeDesktop(patch: Partial<DesktopCommandState>, notificationMessage: string) {
    const current = currentDesktopState();
    const next = { ...current, ...patch };
    if (!desktopStateChanged(current, next)) return false;

    desktopHistoryRef.current.push(current);
    applyDesktopState(next);
    showNotification(notificationMessage);
    return true;
  }

  function closeTerminal(workspaceId: DesktopWorkspaceId, windowId: number) {
    setWorkspaces((current) => {
      const workspace = current[workspaceId];
      if (!workspace.windows.some((window) => window.id === windowId)) return current;

      const windows = workspace.windows.filter((window) => window.id !== windowId);
      return {
        ...current,
        [workspaceId]: {
          ...workspace,
          focusedWindowId:
            workspace.focusedWindowId === windowId
              ? (windows.at(-1)?.id ?? null)
              : workspace.focusedWindowId,
          layout: removeWindow(workspace.layout, windowId),
          windows,
        },
      };
    });
  }

  function openTerminal(workspaceId: DesktopWorkspaceId) {
    const id = nextWindowIdRef.current;
    nextWindowIdRef.current += 1;
    const showWelcome = !terminalWelcomeShownRef.current;
    terminalWelcomeShownRef.current = true;

    setWorkspaces((current) => {
      const workspace = current[workspaceId];
      if (workspace.windows.length >= 4) return current;

      return {
        ...current,
        [workspaceId]: {
          ...workspace,
          focusedWindowId: id,
          layout: insertWindow(
            workspace.layout,
            workspace.focusedWindowId,
            id,
            workspace.splitAxis
          ),
          windows: [...workspace.windows, createTerminalWindow(id, showWelcome)],
        },
      };
    });
  }

  function resetTerminalPrompt(workspaceId: DesktopWorkspaceId, windowId: number) {
    const current = workspacesRef.current;
    const next = {
      ...current,
      [workspaceId]: {
        ...current[workspaceId],
        windows: current[workspaceId].windows.map((window) =>
          window.id === windowId
            ? {
                ...window,
                session: emptyTerminalSession(),
              }
            : window
        ),
      },
    };
    workspacesRef.current = next;
    setWorkspaces(next);
  }

  function submitTerminalCommand(
    workspaceId: DesktopWorkspaceId,
    windowId: number,
    command: string
  ): TerminalSubmitResult {
    if (command.trim() === "exit") {
      closeTerminal(workspaceId, windowId);
      return { action: "close" };
    }

    if (command.trim() === "clear") {
      resetTerminalPrompt(workspaceId, windowId);
      return { action: "clear", completionPaths: terminalCompletionPaths };
    }

    const target = workspacesRef.current[workspaceId].windows.find(
      (window) => window.id === windowId
    );
    if (!target) return {};

    const response = runTerminalCommand(command, target.session, {
      applyDesktopState,
      changeDesktop,
      desktopHistoryRef,
      downloadIso: downloadOmarchyIso,
      openExternal: (href) => window.open(href, "_blank", "noopener,noreferrer"),
      routerPush: (href) => router.push(href),
      showNotification,
      state: currentDesktopState(),
    });
    const current = workspacesRef.current;
    const next = {
      ...current,
      [workspaceId]: {
        ...current[workspaceId],
        windows: current[workspaceId].windows.map((window) =>
          window.id === windowId
            ? {
                ...window,
                session: response.session,
              }
            : window
        ),
      },
    };
    workspacesRef.current = next;
    setWorkspaces(next);

    return {
      completionPaths: response.completionPaths,
      output: response.output,
    };
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) =>
      handleDesktopShortcut(event, {
        activeWorkspace,
        changeWorkspace,
        nextWindowIdRef,
        rootRef,
        setWorkspaces,
        terminalWelcomeShownRef,
        workspacesRef,
      });

    window.addEventListener("keydown", handleShortcut, true);
    return () => window.removeEventListener("keydown", handleShortcut, true);
  }, [activeWorkspace]);

  useEffect(
    () => () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (activeWorkspace !== 1 || !rootRef.current?.contains(document.activeElement)) return;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, [activeWorkspace]);

  const showShortcutHints =
    activeWorkspace === 1 || workspaces[activeWorkspace].windows.length === 0;

  return (
    <div className="home-desktop-workspaces" ref={rootRef}>
      {showShortcutHints ? (
        <HomeDesktopShortcutHints
          onNextTheme={onNextTheme}
          onOpenTerminal={() => {
            if (activeWorkspace !== 1) openTerminal(activeWorkspace);
          }}
          showTerminalShortcut={activeWorkspace !== 1}
        />
      ) : null}
      {desktopWorkspaceIds.map((workspaceId) => {
        const workspace = workspaces[workspaceId];
        const active = activeWorkspace === workspaceId;

        return (
          <Activity key={workspaceId} mode={active ? "visible" : "hidden"}>
            <div
              aria-hidden={!active}
              className="home-desktop-workspace"
              data-active={active}
              data-window-count={workspace.windows.length}
            >
              {workspace.layout ? (
                <div
                  className="home-desktop-layout-root"
                  style={{ "--window-count": workspace.windows.length }}
                >
                  <SplitLayout
                    active={active}
                    cursorBlink={cursorBlink}
                    cursorStyle={cursorStyle}
                    focusedWindowId={workspace.focusedWindowId}
                    node={workspace.layout}
                    onClear={(windowId) => resetTerminalPrompt(workspaceId, windowId)}
                    onFocus={(windowId) => {
                      setWorkspaces((current) => ({
                        ...current,
                        [workspaceId]: {
                          ...current[workspaceId],
                          focusedWindowId: windowId,
                        },
                      }));
                    }}
                    onInterrupt={(windowId) => resetTerminalPrompt(workspaceId, windowId)}
                    onSubmit={(windowId, command) =>
                      submitTerminalCommand(workspaceId, windowId, command)
                    }
                    windows={workspace.windows}
                  />
                </div>
              ) : (
                <HomeEmptyWorkspace onOpenTerminal={() => openTerminal(workspaceId)} />
              )}
            </div>
          </Activity>
        );
      })}

      {notification ? (
        <output aria-live="polite" className="home-desktop-notification shadow-notification">
          {notification}
        </output>
      ) : null}
    </div>
  );
}
