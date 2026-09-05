import { getNewsFeedEntries } from "@/features/news/news-queries";
import { buildRssFeed } from "@/lib/news-feed";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildRssFeed(getNewsFeedEntries()), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
