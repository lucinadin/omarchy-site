"use client";

import { lazy, useEffect, useEffectEvent, useState } from "react";

import type { ThemePreviewItem, ReadyThemePreview } from "@/features/themes/theme-preview-model";
import { notifySite } from "@/lib/site-notification-events";
import { loadThemeOption } from "@/lib/themes/client-catalog";
import { getAppliedThemeId, getSavedTheme, getThemeById } from "@/lib/themes/theme-runtime";

const InstallThemeDialog = lazy(() =>
  import("./install-theme-dialog").then((module) => ({ default: module.InstallThemeDialog }))
);

const ThemeSwitcher = lazy(() =>
  import("./theme-switcher").then((module) => ({ default: module.ThemeSwitcher }))
);

export function ThemePreviewDialog({
  theme,
  onClose,
}: {
  theme: ThemePreviewItem;
  onClose: () => void;
}) {
  return theme.availability === "install" ? (
    <InstallThemeDialog theme={theme} onClose={onClose} />
  ) : (
    <ReadyThemeDialog theme={theme} onClose={onClose} />
  );
}

function ReadyThemeDialog({ theme, onClose }: { theme: ReadyThemePreview; onClose: () => void }) {
  const [session, setSession] = useState(() => ({
    initialTheme: getThemeById(getAppliedThemeId()) ?? getSavedTheme(),
    selection: getThemeById(theme.id),
  }));
  const closeFromEffect = useEffectEvent(onClose);
  useEffect(() => {
    if (session.selection) return;
    let cancelled = false;
    void loadThemeOption(theme.id)
      .then((loaded) => {
        if (!cancelled) setSession((current) => ({ ...current, selection: loaded }));
      })
      .catch(() => {
        if (cancelled) return;
        notifySite("Community themes could not be loaded");
        closeFromEffect();
      });
    return () => {
      cancelled = true;
    };
  }, [session.selection, theme.id]);

  return session.selection ? (
    <ThemeSwitcher
      initialTheme={session.initialTheme}
      initialSelection={session.selection}
      onClose={onClose}
      placement="viewport"
      portalContainer={null}
    />
  ) : null;
}
