import Link from "next/link";

import { PrimaryNavigation } from "@/components/site/primary-navigation";
import { SiteSearchButton } from "@/components/site/site-search-button";
import { SiteShareButton } from "@/components/site/site-share-button";
import { buttonVariants } from "@/components/ui/button";
import { OmarchyLogoIcon } from "@/icons";
import { omarchyIsoDownloadUrl } from "@/lib/site-links";

export function SiteHeader() {
  return (
    <header
      className="site-header px-site-frame fixed inset-x-0 top-0 z-[192] grid h-(--site-header-height,64px) grid-cols-[1fr_auto_1fr] items-center bg-[color-mix(in_srgb,var(--background)_90%,transparent)] backdrop-blur-[12px] [transition:background-color_180ms_ease,top_160ms_ease] [@media(max-width:1050px)]:grid-cols-[auto_1fr_auto] [@media(max-width:900px)]:grid-cols-[1fr_auto_auto] [@media(max-width:900px)]:gap-3"
      style={{ viewTransitionName: "site-header" }}
    >
      <Link
        aria-label="Omarchy home"
        className="text-ui text-bright-foreground inline-flex items-center gap-[0.55rem] justify-self-start font-bold no-underline"
        href="/"
        transitionTypes={["nav-home"]}
      >
        <OmarchyLogoIcon className="text-primary size-6" />
        <span>Omarchy</span>
      </Link>
      <PrimaryNavigation />
      <div className="flex items-center justify-self-end">
        <SiteSearchButton className="mr-2" />
        <a
          className={buttonVariants({ variant: "primary", size: "compact" })}
          href={omarchyIsoDownloadUrl}
        >
          <span className="md:hidden">Get ISO</span>
          <span className="hidden md:inline">Get the ISO</span>
        </a>
        <SiteShareButton />
      </div>
    </header>
  );
}
