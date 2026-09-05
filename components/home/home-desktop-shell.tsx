"use client";

import { Activity, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";

import { HomeDesktopShortcutHints } from "@/components/home/home-desktop-shortcut-hints";
import { HomeEmptyWorkspace } from "@/components/home/home-empty-workspace";
import { ScreenOverlayTarget } from "@/features/effects/components/screen-overlay-target";
import { useAppliedTheme } from "@/hooks";
import {
  BatteryMediumIcon,
  BluetoothIcon,
  ComputerIcon,
  MusicNoteIcon,
  OmarchyLogoIcon,
  VolumeHighIcon,
  WifiFullSignalIcon,
  WorkspaceActiveIcon,
} from "@/icons";
import {
  defaultDesktopClockFormat,
  desktopClockFormatRefreshInterval,
  formatDesktopClock,
  getDesktopClockBootstrapScript,
} from "@/lib/home-desktop-clock";
import {
  parseWorkspaceId,
  workspaceIds,
  type BarPosition,
  type DesktopWorkspaceId,
  type WorkspaceId,
} from "@/lib/home-desktop-layout";
import { requestSiteSearch } from "@/lib/site-search-events";
import {
  cycleThemePreference,
  getThemeById,
  saveThemePreference,
} from "@/lib/themes/theme-runtime";

const DeferredDesktopWorkspaces = lazy(() =>
  import("@/components/home/home-desktop-workspaces").then((module) => ({
    default: module.HomeDesktopWorkspaces,
  }))
);

function changeDesktopTheme(themeId: string) {
  const theme = getThemeById(themeId);
  if (theme) saveThemePreference(theme);
}

export function HomeDesktopShell({ children }: { children: ReactNode }) {
  const desktopClockId = "home-desktop-clock";
  const desktopRef = useRef<HTMLDivElement>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>(1);
  const [barPosition, setBarPosition] = useState<BarPosition>("top");
  const [barTransparent, setBarTransparent] = useState(false);
  const [barVisible, setBarVisible] = useState(true);
  const [barTime, setBarTime] = useState(() =>
    typeof window === "undefined" ? "Omarchy" : formatDesktopClock(defaultDesktopClockFormat)
  );
  const [clockFormat, setClockFormat] = useState(defaultDesktopClockFormat);
  const [initialTerminalWorkspace, setInitialTerminalWorkspace] =
    useState<DesktopWorkspaceId | null>(null);
  const [mediaPluginEnabled, setMediaPluginEnabled] = useState(false);
  const activeThemeId = useAppliedTheme();

  useEffect(() => {
    const updateClock = () => setBarTime(formatDesktopClock(clockFormat));
    updateClock();
    const timer = window.setInterval(updateClock, desktopClockFormatRefreshInterval(clockFormat));
    return () => window.clearInterval(timer);
  }, [clockFormat]);

  const verticalBar = barPosition === "left" || barPosition === "right";
  const displayedBarTime = verticalBar ? formatDesktopClock("HH\n—\nmm") : barTime;

  function activateWorkspace(workspaceId: WorkspaceId) {
    setActiveWorkspace(workspaceId);
  }

  useEffect(() => {
    const handleWorkspaceShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;

      const bounds = desktopRef.current?.getBoundingClientRect();
      if (!bounds || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;

      if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

      if (event.code === "Enter" && activeWorkspace !== 1 && initialTerminalWorkspace === null) {
        event.preventDefault();
        setInitialTerminalWorkspace(activeWorkspace);
        return;
      }

      if (!/^[1-5]$/u.test(event.key)) return;

      event.preventDefault();
      const workspaceId = parseWorkspaceId(Number(event.key));
      if (workspaceId === null) return;
      setActiveWorkspace(workspaceId);
    };

    window.addEventListener("keydown", handleWorkspaceShortcut, true);
    return () => window.removeEventListener("keydown", handleWorkspaceShortcut, true);
  }, [activeWorkspace, initialTerminalWorkspace]);

  return (
    <div
      className="home-desktop h-full max-h-full min-h-0 md:h-auto md:max-h-none md:flex-1"
      data-active-workspace={activeWorkspace}
      data-bar-position={barPosition}
      data-bar-transparent={barTransparent}
      data-bar-visible={barVisible}
      ref={desktopRef}
    >
      {barVisible ? (
        <div className="home-desktop__bar">
          <div className="home-desktop__bar-start">
            <button
              aria-label="Open the Omarchy menu"
              className="home-desktop__launcher"
              onClick={requestSiteSearch}
              title="Open menu · Super + Space"
              type="button"
            >
              <OmarchyLogoIcon aria-hidden="true" />
            </button>

            <div className="home-desktop__workspaces">
              {workspaceIds.map((workspaceId) => {
                const active = workspaceId === activeWorkspace;

                return (
                  <button
                    aria-label={`Workspace ${workspaceId}`}
                    aria-pressed={active}
                    className="home-desktop__workspace"
                    data-active={active}
                    key={workspaceId}
                    onClick={() => activateWorkspace(workspaceId)}
                    title={`Workspace ${workspaceId} · Super + ${workspaceId}`}
                    type="button"
                  >
                    {active ? <WorkspaceActiveIcon /> : workspaceId}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="home-desktop__bar-center">
            {mediaPluginEnabled ? (
              <span className="home-desktop__status-slot home-desktop__media" title="omarchy.media">
                <MusicNoteIcon aria-hidden="true" />
              </span>
            ) : null}
            <time className="home-desktop__clock" id={desktopClockId} suppressHydrationWarning>
              {displayedBarTime}
            </time>
            <script
              suppressHydrationWarning
              type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
            >
              {getDesktopClockBootstrapScript(desktopClockId)}
            </script>
          </div>

          <div aria-hidden="true" className="home-desktop__status">
            <span className="home-desktop__status-slot">
              <BluetoothIcon aria-hidden="true" />
            </span>
            <span className="home-desktop__status-slot">
              <WifiFullSignalIcon aria-hidden="true" />
            </span>
            <span className="home-desktop__status-slot">
              <VolumeHighIcon aria-hidden="true" />
            </span>
            <span className="home-desktop__status-slot">
              <ComputerIcon aria-hidden="true" />
            </span>
            <span className="home-desktop__status-slot">
              <BatteryMediumIcon aria-hidden="true" />
            </span>
          </div>
        </div>
      ) : null}

      <div className="home-desktop__screen" data-wallpaper-theme={activeThemeId}>
        {initialTerminalWorkspace === null ? (
          <HomeDesktopShortcutHints
            onNextTheme={cycleThemePreference}
            onOpenTerminal={() => {
              if (activeWorkspace !== 1) setInitialTerminalWorkspace(activeWorkspace);
            }}
            showTerminalShortcut={activeWorkspace !== 1}
          />
        ) : null}
        <div aria-hidden="true" className="home-desktop__wallpaper" />
        <div
          aria-hidden="true"
          className="from-background/75 via-background/60 pointer-events-none absolute inset-0 z-0 bg-linear-to-t via-[60%] to-transparent to-[80%] sm:hidden"
        />
        <div className="home-desktop__workspace-stage" data-workspace={activeWorkspace}>
          <div
            aria-hidden={activeWorkspace !== 1}
            className="home-desktop__workspace-one-layer"
            data-active={activeWorkspace === 1}
          >
            {children}
          </div>
          <Activity
            mode={activeWorkspace !== 1 && initialTerminalWorkspace === null ? "visible" : "hidden"}
          >
            <HomeEmptyWorkspace
              onOpenTerminal={() => {
                if (activeWorkspace !== 1) setInitialTerminalWorkspace(activeWorkspace);
              }}
            />
          </Activity>
          {initialTerminalWorkspace !== null ? (
            <Suspense
              fallback={
                <div aria-hidden="true" className="flex h-full items-center justify-center" />
              }
            >
              <DeferredDesktopWorkspaces
                activeWorkspace={activeWorkspace}
                activeThemeId={activeThemeId}
                barPosition={barPosition}
                barTransparent={barTransparent}
                barVisible={barVisible}
                clockFormat={clockFormat}
                initialWorkspace={initialTerminalWorkspace}
                mediaPluginEnabled={mediaPluginEnabled}
                onBarPositionChange={setBarPosition}
                onBarTransparencyChange={setBarTransparent}
                onBarVisibilityChange={setBarVisible}
                onClockFormatChange={setClockFormat}
                onMediaPluginChange={setMediaPluginEnabled}
                onNextTheme={cycleThemePreference}
                onThemeChange={changeDesktopTheme}
                onWorkspaceChange={activateWorkspace}
              />
            </Suspense>
          ) : null}
        </div>
        <ScreenOverlayTarget target="hero" />
        <div className="home-desktop__overlay-host" id="home-desktop-command-host" />
      </div>
    </div>
  );
}
