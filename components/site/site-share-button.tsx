"use client";

import { buttonVariants } from "@/components/ui/button";
import { ShareIcon } from "@/icons";
import { shareOrCopy } from "@/lib/browser-sharing";
import { siteTagline } from "@/lib/site-brand";
import { notifySite } from "@/lib/site-notification-events";
import { cn } from "@/lib/utils";
import { unreachable } from "@/lib/validation";

type SiteShareButtonProps = {
  className?: string;
  context?: "article" | "page";
  label?: string;
  shareDescription?: string;
};

async function shareCurrentPage(description: string, notificationLabel: string) {
  const result = await shareOrCopy(document.title, description, window.location.href);

  switch (result) {
    case "shared":
      notifySite(`${notificationLabel} shared`);
      break;
    case "copied":
      notifySite(`${notificationLabel} link copied`);
      break;
    case "unavailable":
      notifySite("Sharing is unavailable in this browser");
      break;
    case "failed":
      notifySite(`Could not share this ${notificationLabel.toLowerCase()}`);
      break;
    case "cancelled":
      break;
    default:
      unreachable(result);
  }
}

export function SiteShareButton({
  className,
  context = "page",
  label,
  shareDescription,
}: SiteShareButtonProps) {
  const labeled = Boolean(label);
  const description = shareDescription ?? `${siteTagline}.`;
  const notificationLabel = context === "article" ? "Article" : "Page";
  const title = context === "article" ? "Share this article" : "Share this page";

  return (
    <button
      aria-label={title}
      className={cn(
        buttonVariants({
          variant: labeled ? "secondary" : "primary",
          size: labeled ? "compact" : "icon",
        }),
        labeled ? "shrink-0" : "border-l-primary-foreground/25 focus-visible:z-10 md:hidden",
        className
      )}
      onClick={() => void shareCurrentPage(description, notificationLabel)}
      title={title}
      type="button"
    >
      <ShareIcon aria-hidden="true" size={labeled ? 14 : 16} />
      {label ? <span>{label}</span> : null}
    </button>
  );
}
