import { getNewsFeedEntries } from "@/features/news/news-queries";
import { buildAtomFeed } from "@/lib/news-feed";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildAtomFeed(getNewsFeedEntries()), {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}
