"use client";

import { useEffect, useEffectEvent, useRef, useState, type ComponentType } from "react";

import type { ThemeSwitcherProps } from "@/features/themes/components/theme-switcher";
import { useHomeDesktopPortalHost } from "@/hooks";
import {
  getHomeDesktopSurfaceEventDetail,
  homeDesktopSurfaceEvent,
  prepareHomeDesktopCommandHost,
} from "@/lib/home-desktop-events";
import { notifySite } from "@/lib/site-notification-events";
import { siteSearchEvent } from "@/lib/site-search-events";
import { getAppliedThemeId, getSavedTheme, getThemeById } from "@/lib/themes/theme-runtime";
import { useThemePreferenceRequest } from "@/providers";

function loadHomeThemeSurface() {
  return import("@/features/themes/components/theme-switcher");
}

export function HomeCommandRuntime() {
  const { cancelPendingTheme } = useThemePreferenceRequest();
  const requestRef = useRef(0);
  const openingRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [themeSurface, setThemeSurface] = useState<ComponentType<ThemeSwitcherProps> | null>(null);
  const [portalHost, setPortalHost] = useHomeDesktopPortalHost(isOpen);

  const close = () => {
    requestRef.current += 1;
    openingRef.current = false;
    setIsOpen(false);
    setPortalHost(null);
  };

  const open = async () => {
    cancelPendingTheme();
    const request = requestRef.current + 1;
    requestRef.current = request;
    openingRef.current = true;

    try {
      const [module, nextPortalHost] = await Promise.all([
        themeSurface ? { ThemeSwitcher: themeSurface } : loadHomeThemeSurface(),
        prepareHomeDesktopCommandHost(),
      ]);
      if (requestRef.current !== request) return;

      openingRef.current = false;
      setPortalHost(nextPortalHost);
      setThemeSurface(() => module.ThemeSwitcher);
      setIsOpen(true);
    } catch {
      if (requestRef.current !== request) return;
      close();
      notifySite("Community themes could not be loaded");
    }
  };
  const closeFromEffect = useEffectEvent(close);
  const openFromEffect = useEffectEvent(open);

  useEffect(
    () => () => {
      requestRef.current += 1;
    },
    []
  );

  useEffect(() => {
    const handleSurfaceRequest = (event: Event) => {
      const detail = getHomeDesktopSurfaceEventDetail(event);
      if (detail?.surface !== "theme") return;
      if (isOpen || openingRef.current) closeFromEffect();
      else void openFromEffect();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (event.key === "Escape" && (isOpen || openingRef.current)) {
        event.preventDefault();
        closeFromEffect();
        return;
      }

      const wantsTheme =
        event.code === "Space" && event.ctrlKey && event.shiftKey && !event.altKey && event.metaKey;
      if (!wantsTheme) return;

      event.preventDefault();
      if (isOpen || openingRef.current) closeFromEffect();
      else void openFromEffect();
    };

    window.addEventListener(homeDesktopSurfaceEvent, handleSurfaceRequest);
    window.addEventListener(siteSearchEvent, closeFromEffect);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener(homeDesktopSurfaceEvent, handleSurfaceRequest);
      window.removeEventListener(siteSearchEvent, closeFromEffect);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const placement = portalHost ? "desktop" : "viewport";
  if (themeSurface) {
    const ThemeSurface = themeSurface;
    const initialTheme = getThemeById(getAppliedThemeId()) ?? getSavedTheme();
    return (
      <ThemeSurface
        initialTheme={initialTheme}
        onClose={close}
        placement={placement}
        portalContainer={portalHost}
      />
    );
  }

  return null;
}
