"use client";

import { buttonVariants } from "@/components/ui/button";
import { SearchIcon } from "@/icons";
import { requestSiteSearch } from "@/lib/site-search-events";
import { cn } from "@/lib/utils";

export function SiteSearchButton({ className }: { className?: string }) {
  return (
    <button
      aria-keyshortcuts="Control+K Meta+K"
      aria-label="Search Omarchy"
      className={cn(
        buttonVariants({ variant: "secondary", size: "icon" }),
        "[@media(max-width:900px)]:hidden",
        className
      )}
      onClick={requestSiteSearch}
      title="Search Omarchy"
      type="button"
    >
      <SearchIcon aria-hidden="true" size={15} />
    </button>
  );
}
