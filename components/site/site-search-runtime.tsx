"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { useHomeDesktopPortalHost } from "@/hooks";
import {
  getVisibleHomeDesktopCommandHost,
  homeDesktopSurfaceEvent,
  prepareHomeDesktopCommandHost,
} from "@/lib/home-desktop-events";
import {
  requestedSiteSearchView,
  siteSearchEvent,
  type SiteSearchView,
} from "@/lib/site-search-events";
import { isEditableTarget } from "@/lib/ui/editable-target";

const SiteSearchDialog = lazy(() =>
  import("@/components/site/site-search-dialog").then((module) => ({
    default: module.SiteSearchDialog,
  }))
);

type SearchShortcut = {
  toggle: boolean;
  view: SiteSearchView;
};

function searchShortcut(event: KeyboardEvent): SearchShortcut | null {
  const command =
    event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey) && !event.altKey;
  const slash =
    (event.key === "/" || event.code === "Slash") &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !isEditableTarget(event.target);

  if (event.code === "Space" && event.metaKey && !event.ctrlKey && !event.shiftKey) {
    return event.altKey ? { toggle: false, view: "apps" } : { toggle: true, view: "root" };
  }
  if (command) return { toggle: true, view: "root" };
  if (slash) return { toggle: false, view: "root" };
  return null;
}

export function SiteSearchRuntime() {
  const requestRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<SiteSearchView>("root");
  const [portalHost, setPortalHost] = useHomeDesktopPortalHost(isOpen);

  useEffect(() => {
    const openSearch = async (nextView: SiteSearchView = "root") => {
      const request = requestRef.current + 1;
      requestRef.current = request;
      const nextPortalHost = await prepareHomeDesktopCommandHost();
      if (requestRef.current !== request) return;

      setPortalHost(nextPortalHost);
      setView(nextView);
      setIsOpen(true);
    };
    const closeSearch = () => {
      requestRef.current += 1;
      setIsOpen(false);
      setPortalHost(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const shortcut = searchShortcut(event);
      if (!shortcut) return;
      event.preventDefault();

      if (shortcut.toggle && isOpen) closeSearch();
      else void openSearch(shortcut.view);
    };

    const handleSearchRequest = (event: Event) => void openSearch(requestedSiteSearchView(event));
    window.addEventListener(siteSearchEvent, handleSearchRequest);
    window.addEventListener(homeDesktopSurfaceEvent, closeSearch);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener(siteSearchEvent, handleSearchRequest);
      window.removeEventListener(homeDesktopSurfaceEvent, closeSearch);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setPortalHost]);

  if (!isOpen) return null;

  return (
    <Suspense fallback={null}>
      <SiteSearchDialog
        initialView={view}
        key={view}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setPortalHost(getVisibleHomeDesktopCommandHost());
            setIsOpen(true);
          } else {
            setIsOpen(false);
            setPortalHost(null);
          }
        }}
        open={isOpen}
        placement={portalHost ? "desktop" : "viewport"}
        portalContainer={portalHost}
      />
    </Suspense>
  );
}
