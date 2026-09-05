"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useHomeDesktopPortalHost } from "@/hooks";
import { getVisibleHomeDesktopCommandHost } from "@/lib/home-desktop-events";
import { getSiteNotificationDetail, siteNotificationEvent } from "@/lib/site-notification-events";

type Notification = {
  id: number;
  message: string;
};

export function SiteNotificationRuntime() {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [portalHost, setPortalHost] = useHomeDesktopPortalHost(notification !== null);

  useEffect(() => {
    function showNotification(event: Event) {
      const detail = getSiteNotificationDetail(event);
      if (!detail) return;

      setPortalHost(getVisibleHomeDesktopCommandHost());
      setNotification({ id: Date.now(), message: detail.message });
    }

    window.addEventListener(siteNotificationEvent, showNotification);
    return () => window.removeEventListener(siteNotificationEvent, showNotification);
  }, [setPortalHost]);

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(null), 1800);
    return () => window.clearTimeout(timer);
  }, [notification]);

  if (!notification) return null;

  const notice = (
    <output
      aria-live="polite"
      className="home-desktop-notification site-notification shadow-notification"
      key={notification.id}
    >
      {notification.message}
    </output>
  );

  return portalHost ? createPortal(notice, portalHost) : notice;
}
