"use client";

import { useEffect, useState } from "react";

import { getVisibleHomeDesktopCommandHost } from "@/lib/home-desktop-events";

export function useHomeDesktopPortalHost(active: boolean) {
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const updatePlacement = () => setPortalHost(getVisibleHomeDesktopCommandHost());
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, { passive: true });
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement);
    };
  }, [active]);

  return [portalHost, setPortalHost] as const;
}
