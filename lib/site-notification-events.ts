import { parseJsonObject, type JsonObject } from "@/lib/json";

export const siteNotificationEvent = "omarchy:site-notification";

type SiteNotificationDetail = {
  message: string;
};

function isSiteNotificationDetail(value: JsonObject): value is JsonObject & SiteNotificationDetail {
  return typeof value.message === "string" && value.message.trim().length > 0;
}

export function getSiteNotificationDetail(event: Event): SiteNotificationDetail | null {
  if (!(event instanceof CustomEvent)) return null;
  const detail = parseJsonObject(event.detail);
  if (detail === null || !isSiteNotificationDetail(detail)) return null;
  return { message: detail.message };
}

export function notifySite(message: string) {
  window.dispatchEvent(
    new CustomEvent<SiteNotificationDetail>(siteNotificationEvent, { detail: { message } })
  );
}
