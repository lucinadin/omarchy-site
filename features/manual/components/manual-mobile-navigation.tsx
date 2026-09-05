"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ManualChapter } from "@/features/manual/manual-queries";
import { ChevronLeftIcon, ChevronRightIcon, ListTreeIcon } from "@/icons";

export function ManualMobileNavigation({
  chapters,
  currentHref,
}: {
  chapters: ManualChapter[];
  currentHref: string;
}) {
  const currentIndex = Math.max(
    0,
    chapters.findIndex((chapter) => chapter.href === currentHref)
  );
  const current = chapters[currentIndex];
  const previous = chapters[currentIndex - 1];
  const next = chapters[currentIndex + 1];
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const frame = requestAnimationFrame(() => {
      activeLinkRef.current?.scrollIntoView({ block: "center" });
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  return (
    <nav
      className="hidden [@media(max-width:800px)]:sticky [@media(max-width:800px)]:top-16 [@media(max-width:800px)]:z-[45] [@media(max-width:800px)]:[margin-inline:calc(-1_*_var(--page-gutter))] [@media(max-width:800px)]:grid [@media(max-width:800px)]:min-h-16 [@media(max-width:800px)]:grid-cols-[44px_minmax(0,1fr)_44px] [@media(max-width:800px)]:items-center [@media(max-width:800px)]:gap-[0.55rem] [@media(max-width:800px)]:bg-[color-mix(in_srgb,var(--dark-background)_94%,transparent)] [@media(max-width:800px)]:px-(--page-gutter) [@media(max-width:800px)]:py-[0.65rem] [@media(max-width:800px)]:backdrop-blur-[12px]"
      aria-label="Manual chapter navigation"
    >
      {previous ? (
        <Link
          aria-label={`Previous chapter: ${previous.title}`}
          className="border-border text-foreground [&:hover]:border-primary [&:hover]:bg-surface [&:hover]:text-bright-foreground inline-flex size-11 items-center justify-center border bg-[color-mix(in_srgb,var(--surface)_58%,transparent)] no-underline"
          href={previous.href}
          transitionTypes={["nav-back"]}
        >
          <ChevronLeftIcon aria-hidden="true" size={18} />
        </Link>
      ) : (
        <span aria-hidden="true" className="size-11" />
      )}

      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="border-border text-foreground [&:hover]:bg-surface aria-[expanded=true]:bg-surface grid min-h-11 min-w-0 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border bg-[color-mix(in_srgb,var(--surface)_58%,transparent)] px-[0.7rem] py-[0.45rem] text-left aria-[expanded=true]:border-[color-mix(in_srgb,var(--foreground)_42%,var(--border))] [&:hover]:border-[color-mix(in_srgb,var(--foreground)_42%,var(--border))]"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <span className="grid min-w-0 gap-[0.12rem]">
          <small className="text-micro text-primary leading-tight">Current chapter</small>
          <strong className="text-meta text-bright-foreground overflow-hidden font-medium text-ellipsis whitespace-nowrap">
            {current.title}
          </strong>
        </span>
        <ListTreeIcon aria-hidden="true" size={17} />
      </button>

      <Sheet onOpenChange={setIsOpen} open={isOpen}>
        <SheetContent ariaLabel="Manual chapters" className="w-[min(30rem,100vw)]">
          <SheetHeader>
            <SheetTitle>The Manual</SheetTitle>
            <SheetDescription>Choose a chapter.</SheetDescription>
          </SheetHeader>
          <ol className="scroll-fade-y m-0 grid list-none gap-[0.2rem] overflow-y-auto px-5 pt-2 pb-8">
            {chapters.map((chapter) => {
              const isCurrent = chapter.href === currentHref;

              return (
                <li key={chapter.href}>
                  <Link
                    aria-current={isCurrent ? "page" : undefined}
                    className="text-small text-muted-foreground [&:hover]:bg-surface [&:hover]:text-bright-foreground aria-[current=page]:bg-surface aria-[current=page]:text-bright-foreground aria-[current=page]:border-l-primary block min-h-[42px] border-l-2 border-l-transparent px-3 py-[0.65rem] no-underline"
                    href={chapter.href}
                    transitionTypes={["site-route"]}
                    onClick={() => setIsOpen(false)}
                    ref={isCurrent ? activeLinkRef : undefined}
                  >
                    {chapter.title}
                  </Link>
                </li>
              );
            })}
          </ol>
        </SheetContent>
      </Sheet>

      {next ? (
        <Link
          aria-label={`Next chapter: ${next.title}`}
          className="border-border text-foreground [&:hover]:border-primary [&:hover]:bg-surface [&:hover]:text-bright-foreground inline-flex size-11 items-center justify-center border bg-[color-mix(in_srgb,var(--surface)_58%,transparent)] no-underline"
          href={next.href}
          transitionTypes={["nav-forward"]}
        >
          <ChevronRightIcon aria-hidden="true" size={18} />
        </Link>
      ) : (
        <span aria-hidden="true" className="size-11" />
      )}
    </nav>
  );
}
