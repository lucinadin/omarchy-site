"use client";

import { shareOrCopy, writeClipboardText } from "@/lib/browser-sharing";
import { notifySite } from "@/lib/site-notification-events";
import { getThemeShareHref, type ThemeShareReference } from "@/lib/themes/theme-sharing";
import { unreachable } from "@/lib/validation";

export async function copyThemeInstallValue(value: string, successMessage: string) {
  const result = await writeClipboardText(value);
  notifySite(result === "copied" ? successMessage : "Could not copy to the clipboard");
}

export async function shareThemeLink({
  name,
  reference,
}: {
  name: string;
  reference: ThemeShareReference;
}) {
  const url = new URL(getThemeShareHref(reference), window.location.origin).href;
  const qualifier = reference.kind === "official" ? "an official" : "a community";

  const result = await shareOrCopy(
    `${name} — Omarchy Theme`,
    `${name} — ${qualifier} Omarchy theme.`,
    url
  );

  switch (result) {
    case "shared":
      notifySite(`${name} shared`);
      break;
    case "copied":
      notifySite(`${name} link copied`);
      break;
    case "unavailable":
      notifySite("Sharing is unavailable in this browser");
      break;
    case "failed":
      notifySite("Could not share this theme");
      break;
    case "cancelled":
      break;
    default:
      unreachable(result);
  }
}
