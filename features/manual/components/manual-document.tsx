import Link from "next/link";
import { notFound } from "next/navigation";

import { PageBackLink } from "@/components/site/page-back-link";
import { manualMdxComponents } from "@/features/manual/manual-mdx-components";
import { getManualDocument } from "@/features/manual/manual-queries";
import { ArrowLeftIcon, ArrowRightIcon } from "@/icons";
import { cn } from "@/lib/utils";

function ManualSkeletonBar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "block h-[0.82rem] w-full animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] bg-[linear-gradient(100deg,var(--surface)_25%,color-mix(in_srgb,var(--surface),var(--foreground)_13%)_45%,var(--surface)_65%)] [background-size:240%_100%]",
        className
      )}
    />
  );
}

export async function ManualArticle({ slug }: { slug: string }) {
  const document = await getManualDocument(slug);

  if (!document) {
    notFound();
  }

  return (
    <article className="reader-document">
      <header className="reader-document__header">
        <PageBackLink href={slug ? "/manual/" : "/"}>{slug ? "Manual" : "Home"}</PageBackLink>
        <p className="text-small leading-copy text-primary mt-0 mb-[1.1rem] font-medium">
          Omarchy Manual
        </p>
        <h1 className="reader-document__title">{document.chapter.title}</h1>
      </header>
      <div className="typeset typeset-manual">
        <document.Content components={manualMdxComponents} />
      </div>
      {document.previous || document.next ? (
        <nav
          className="mt-16 grid grid-cols-2 gap-4 [@media(max-width:520px)]:grid-cols-[1fr]"
          aria-label="Adjacent manual chapters"
        >
          {document.previous ? (
            <Link
              className="border-border text-foreground [&:hover]:bg-surface grid min-h-28 gap-3 border bg-[color-mix(in_srgb,var(--card)_76%,var(--background))] p-4 no-underline [&:hover]:border-[color-mix(in_srgb,var(--primary)_58%,var(--border))]"
              href={document.previous.href}
              transitionTypes={["nav-back"]}
            >
              <span className="text-meta text-primary flex items-center gap-[0.45rem]">
                <ArrowLeftIcon aria-hidden="true" size={14} />
                Previous chapter
              </span>
              <strong className="text-title-sm/ui text-foreground font-medium">
                {document.previous.title}
              </strong>
            </Link>
          ) : null}
          {document.next ? (
            <Link
              className="border-border text-foreground [&:hover]:bg-surface col-start-2 grid min-h-28 gap-3 border bg-[color-mix(in_srgb,var(--card)_76%,var(--background))] p-4 text-right no-underline [&:hover]:border-[color-mix(in_srgb,var(--primary)_58%,var(--border))] [@media(max-width:520px)]:col-start-1"
              href={document.next.href}
              transitionTypes={["nav-forward"]}
            >
              <span className="text-meta text-primary flex items-center justify-end gap-[0.45rem]">
                Next chapter
                <ArrowRightIcon aria-hidden="true" size={14} />
              </span>
              <strong className="text-title-sm/ui text-foreground font-medium">
                {document.next.title}
              </strong>
            </Link>
          ) : null}
        </nav>
      ) : null}
    </article>
  );
}

export function ManualArticleSkeleton() {
  return (
    <div className="reader-document" aria-hidden="true">
      <div className="min-h-[60vh] w-full">
        <ManualSkeletonBar className="mb-[1.7rem] h-[0.7rem] w-32" />
        <ManualSkeletonBar className="text-title-xl mb-[0.55rem] h-lh w-[82%]" />
        <ManualSkeletonBar className="text-title-xl mb-[0.55rem] h-lh w-[48%]" />
        <span className="bg-border mt-fluid-xl mb-fluid-2xl block h-px w-full" />
        <div className="grid gap-[0.9rem]">
          <ManualSkeletonBar />
          <ManualSkeletonBar />
          <ManualSkeletonBar className="w-[84%]" />
          <ManualSkeletonBar />
          <ManualSkeletonBar className="w-[63%]" />
        </div>
      </div>
    </div>
  );
}
