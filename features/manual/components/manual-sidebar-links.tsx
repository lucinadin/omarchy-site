"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ManualMobileNavigation } from "@/features/manual/components/manual-mobile-navigation";
import type { ManualChapter } from "@/features/manual/manual-queries";

export function ManualNavigation({ chapters }: { chapters: ManualChapter[] }) {
  const pathname = usePathname();
  const currentHref = pathname.endsWith("/") ? pathname : `${pathname}/`;

  return (
    <>
      <aside className="scrollbar-thumb-muted scrollbar-track-background border-border sticky top-16 h-[calc(100vh-64px)] overflow-y-auto border-r pt-14 pr-8 pb-12 [@media(max-width:800px)]:hidden">
        <p className="text-ui text-bright-foreground m-0 mb-6 font-bold">The Manual</p>
        <nav aria-label="Manual chapters">
          <ol className="m-0 list-none p-0">
            {chapters.map((chapter) => (
              <li key={chapter.href}>
                <Link
                  aria-current={chapter.href === currentHref ? "page" : undefined}
                  className="text-meta text-muted-foreground [&:hover]:text-primary aria-[current=page]:text-primary block py-[0.47rem] no-underline"
                  href={chapter.href}
                  transitionTypes={["site-route"]}
                >
                  {chapter.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </aside>
      <ManualMobileNavigation chapters={chapters} currentHref={currentHref} />
    </>
  );
}
