import "server-only";
import type { MDXContent } from "mdx/types";
import { cache } from "react";

import { newsContent } from "@/features/news/news-content";
import type { NewsFeedEntry } from "@/lib/news-feed";

type NewsSummary = {
  author: string;
  date: string;
  dateTime: string;
  excerpt: string;
  href: string;
  slug: string;
  title: string;
};

type NewsPost = NewsSummary & {
  Content: MDXContent;
};

const newsDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

function formatDate(publishedOn: string) {
  return newsDateFormatter.format(new Date(`${publishedOn}T00:00:00Z`));
}

function toSummary(entry: (typeof newsContent)[number]): NewsSummary {
  return {
    author: entry.author,
    date: formatDate(entry.publishedOn),
    dateTime: entry.dateTime,
    excerpt: entry.description,
    href: `/news/${entry.slug}/`,
    slug: entry.slug,
    title: entry.title,
  };
}

export function getNewsSummaries(): NewsSummary[] {
  return newsContent
    .toSorted((left, right) => right.dateTime.localeCompare(left.dateTime))
    .map(toSummary);
}

export function getNewsFeedEntries(): NewsFeedEntry[] {
  return Array.from(newsContent, ({ author, authorUrl, dateTime, description, slug, title }) => ({
    author,
    authorUrl,
    dateTime,
    description,
    path: `/news/${slug}/`,
    title,
  })).toSorted((left, right) => right.dateTime.localeCompare(left.dateTime));
}

export function getNewsStaticParams() {
  return [{ slug: undefined }, ...newsContent.map(({ slug }) => ({ slug: slug.split("/") }))];
}

export const getNewsPost = cache((slug: string): NewsPost | null => {
  const entry = newsContent.find((candidate) => candidate.slug === slug);
  return entry ? { ...toSummary(entry), Content: entry.Content } : null;
});
