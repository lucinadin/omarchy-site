import Link from "next/link";
import { ViewTransition } from "react";

import { Card, CardFooter } from "@/components/ui/card";
import { getNewsSummaries } from "@/features/news/news-queries";
import { getNewsTitleTransitionName } from "@/features/news/news-transitions";
import { cn } from "@/lib/utils";

type NewsIndexProps = {
  className?: string;
  limit?: number;
};

export async function NewsIndex({
  className,
  heading: Heading = "h2",
  limit,
}: NewsIndexProps & { heading?: "h2" | "h3" }) {
  const summaries = await getNewsSummaries();
  const visibleSummaries = limit ? summaries.slice(0, limit) : summaries;

  return (
    <div className={cn("gap-fluid-sm grid grid-cols-1 sm:grid-cols-2", className)}>
      {visibleSummaries.map((post) => (
        <Card
          as="article"
          key={post.href}
          className="group relative h-full min-w-0 gap-0 overflow-hidden bg-transparent transition-[background-color,border-color,transform] duration-[180ms] ease-[ease] hover:[transform:translateY(-0.2rem)] hover:border-[color-mix(in_srgb,var(--primary),var(--border)_35%)] hover:bg-[color-mix(in_srgb,var(--card)_88%,var(--primary)_12%)]"
        >
          <div className="p-fluid-md grid gap-4">
            <p className="text-meta text-muted-foreground m-0 flex items-center gap-x-[0.8rem] gap-y-[0.55rem]">
              <span className="text-primary">{post.author}</span>
              <time dateTime={post.dateTime}>{post.date}</time>
            </p>
            <ViewTransition
              default="none"
              name={getNewsTitleTransitionName(post.slug)}
              share="news-title-morph"
            >
              <Heading className="text-title-sm leading-ui text-foreground m-0 font-medium tracking-[-0.03em]">
                <Link
                  aria-label={`Read ${post.title}`}
                  className="group-hover:text-primary no-underline after:absolute after:inset-0 after:z-[1] after:content-['']"
                  href={post.href}
                  transitionTypes={["nav-forward"]}
                >
                  {post.title}
                </Link>
              </Heading>
            </ViewTransition>
          </div>
          <p className="px-fluid-md pb-fluid-lg text-small leading-copy text-muted-foreground m-0 pt-0">
            {post.excerpt}
          </p>
          <CardFooter
            className="text-meta text-link px-fluid-md pb-fluid-sm mt-auto justify-between gap-[0.45rem] pt-0"
            aria-hidden="true"
          >
            Read more <span className="text-primary">→</span>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export function NewsIndexSkeleton({ className, limit = 6 }: NewsIndexProps) {
  return (
    <div
      className={cn("gap-fluid-sm grid grid-cols-1 sm:grid-cols-2", className)}
      aria-hidden="true"
    >
      {Array.from({ length: limit }, (_, index) => (
        <Card
          className="min-h-72 [animation:skeleton-shimmer_1.6s_ease-in-out_infinite] gap-0 bg-[linear-gradient(100deg,var(--card)_25%,color-mix(in_srgb,var(--card),var(--foreground)_12%)_45%,var(--card)_65%)] [background-size:240%_100%]"
          key={index}
        />
      ))}
    </div>
  );
}
