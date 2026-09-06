"use client";

import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSecretLabUnlocked } from "@/hooks";
import { ChevronDownIcon, MenuIcon, SearchIcon, SlidersHorizontalIcon } from "@/icons";
import { openSecretLab } from "@/lib/secret-lab-access";
import { moreLinkGroups, primaryLinks, type SiteLink } from "@/lib/site-navigation";
import { requestSiteSearch } from "@/lib/site-search-events";
import { cn } from "@/lib/utils";

const navigationLinkVariants = cva("no-underline", {
  variants: {
    surface: {
      desktop:
        "text-muted-foreground hover:text-bright-foreground focus-visible:text-bright-foreground aria-[current=page]:text-bright-foreground relative inline-flex min-h-11 items-center py-2",
      mobile:
        "text-ui text-foreground hover:bg-surface hover:text-bright-foreground focus-visible:bg-surface focus-visible:text-bright-foreground aria-[current=page]:text-primary flex min-h-11 items-center justify-between px-3 py-[0.7rem] aria-[current=page]:font-medium",
      panel:
        "text-foreground hover:text-bright-foreground focus-visible:text-bright-foreground flex items-center justify-between py-[0.72rem]",
    },
  },
  defaultVariants: {
    surface: "desktop",
  },
});

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href);
}

function NavigationLink({
  className,
  link,
  onNavigate,
  pathname,
  surface,
}: {
  className?: string;
  link: SiteLink;
  onNavigate?: () => void;
  pathname: string;
  surface?: VariantProps<typeof navigationLinkVariants>["surface"];
}) {
  if (link.internal) {
    const isCurrent = isCurrentPath(pathname, link.href);
    const isNewsIndexReturn = link.href === "/news/" && pathname !== link.href && isCurrent;

    return (
      <Link
        aria-current={isCurrent ? "page" : undefined}
        className={cn(navigationLinkVariants({ surface }), className)}
        href={link.href}
        onClick={onNavigate}
        transitionTypes={[isNewsIndexReturn ? "nav-back" : "site-route"]}
      >
        {link.label}
      </Link>
    );
  }

  return (
    <a
      className={cn(navigationLinkVariants({ surface }), className)}
      href={link.href}
      onClick={onNavigate}
    >
      {link.label}
    </a>
  );
}

export function PrimaryNavigation() {
  const pathname = usePathname();
  const panelId = useId();
  const rootRef = useRef<HTMLLIElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isSecretLabAvailable = useSecretLabUnlocked();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    if (!isMoreOpen) return;

    function closeFromOutside(event: PointerEvent) {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setIsMoreOpen(false);
    }

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsMoreOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromEscape);

    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, [isMoreOpen]);

  return (
    <nav
      className="text-small flex items-center [@media(max-width:1050px)]:justify-self-center [@media(max-width:900px)]:justify-self-end"
      aria-label="Primary navigation"
    >
      <ul className="gap-fluid-lg m-0 flex list-none items-center p-0 [@media(max-width:900px)]:hidden">
        {primaryLinks.map((link) => (
          <li key={link.label}>
            <NavigationLink link={link} pathname={pathname} />
          </li>
        ))}

        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Observe focus leaving child controls; the list item is not itself interactive. */}
        <li
          className="flex items-center"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setIsMoreOpen(false);
          }}
          ref={rootRef}
        >
          <button
            aria-controls={panelId}
            aria-expanded={isMoreOpen}
            className={cn(
              navigationLinkVariants({ surface: "desktop" }),
              "aria-[expanded=true]:text-bright-foreground cursor-pointer gap-[0.35rem] border-0 bg-transparent px-0 [&>svg]:transition-transform [&>svg]:duration-150 [&[aria-expanded=true]>svg]:rotate-180"
            )}
            onClick={() => setIsMoreOpen((current) => !current)}
            ref={triggerRef}
            type="button"
          >
            More
            <ChevronDownIcon aria-hidden="true" size={13} />
          </button>

          <div
            className="border-border gap-fluid-xl p-fluid-md absolute top-full left-1/2 z-60 mt-2 grid max-h-[calc(100dvh-var(--site-chrome-height,64px)-1rem)] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 grid-cols-3 overflow-auto border bg-[color-mix(in_srgb,var(--dark-background)_96%,transparent)] [&[hidden]]:hidden"
            hidden={!isMoreOpen}
            id={panelId}
          >
            {moreLinkGroups.map((group) => (
              <section key={group.label}>
                <h2 className="text-meta text-primary mt-0 mb-3 font-medium tracking-[0.05em] uppercase">
                  {group.label}
                </h2>
                <ul className="m-0 grid list-none gap-0 p-0">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <NavigationLink
                        link={link}
                        onNavigate={() => setIsMoreOpen(false)}
                        pathname={pathname}
                        surface="panel"
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </li>
      </ul>

      <button
        className={cn(
          buttonVariants({ variant: "secondary", size: "compact" }),
          "hidden cursor-pointer font-bold [@media(max-width:900px)]:inline-flex"
        )}
        onClick={() => setIsMobileOpen(true)}
        type="button"
      >
        <MenuIcon aria-hidden="true" size={17} />
        <span className="[@media(max-width:520px)]:sr-only">Menu</span>
      </button>

      <Sheet onOpenChange={setIsMobileOpen} open={isMobileOpen}>
        <SheetContent ariaLabel="Navigation menu" data-site-navigation="">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription className="sr-only">Navigate the Omarchy website.</SheetDescription>
          </SheetHeader>

          <div className="scroll-fade-y grid gap-8 overflow-y-auto pt-2 pr-[1.4rem] pb-8 pl-[1.4rem]">
            <button
              aria-keyshortcuts="Control+K Meta+K"
              className={cn(
                navigationLinkVariants({ surface: "mobile" }),
                "w-full cursor-pointer border-0 bg-transparent text-left"
              )}
              onClick={() => {
                setIsMobileOpen(false);
                requestSiteSearch();
              }}
              type="button"
            >
              <span>Search</span>
              <SearchIcon aria-hidden="true" size={14} />
            </button>

            <ul className="m-0 grid list-none gap-1 p-0">
              {primaryLinks.map((link) => (
                <li key={link.label}>
                  <NavigationLink
                    link={link}
                    onNavigate={() => setIsMobileOpen(false)}
                    pathname={pathname}
                    surface="mobile"
                  />
                </li>
              ))}
            </ul>

            {moreLinkGroups.map((group) => (
              <section key={group.label}>
                <h2 className="text-meta text-primary mt-0 mb-2 px-3 font-medium tracking-[0.05em] uppercase">
                  {group.label}
                </h2>
                <ul className="m-0 grid list-none gap-1 p-0">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <NavigationLink
                        link={link}
                        onNavigate={() => setIsMobileOpen(false)}
                        pathname={pathname}
                        surface="mobile"
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {pathname === "/" && isSecretLabAvailable && (
              <div className="border-border border-t pt-4">
                <button
                  className="text-ui text-foreground hover:bg-surface hover:text-bright-foreground [&>svg]:text-muted-foreground flex min-h-11 w-full cursor-pointer items-center justify-between border-0 bg-transparent px-3 py-[0.7rem] text-left [&>svg]:shrink-0"
                  onClick={() => {
                    setIsMobileOpen(false);
                    openSecretLab();
                  }}
                  type="button"
                >
                  <span>Secret Lab</span>
                  <SlidersHorizontalIcon aria-hidden="true" size={13} />
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
