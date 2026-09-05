import "server-only";
import type { MDXContent } from "mdx/types";
import { cache } from "react";

import { manualContent, manualTableOfContents } from "@/features/manual/manual-content";

export type ManualChapter = {
  href: string;
  slug: string;
  title: string;
};

type ManualDocument = {
  Content: MDXContent;
  chapter: ManualChapter;
  chapters: ManualChapter[];
  next?: ManualChapter;
  previous?: ManualChapter;
};

export function getManualChapters(): ManualChapter[] {
  return manualContent.map(({ href, slug, title }) => ({ href, slug, title }));
}

export function getManualStaticParams() {
  const params: { slug: string[] | undefined }[] = [{ slug: undefined }];
  for (const { slug } of manualContent) {
    if (slug) params.push({ slug: [slug] });
  }
  params.push({ slug: [manualTableOfContents.slug] });
  return params;
}

export const getManualDocument = cache((slug: string): ManualDocument | null => {
  if (slug === manualTableOfContents.slug) {
    return {
      Content: manualTableOfContents.Content,
      chapter: manualTableOfContents,
      chapters: getManualChapters(),
    };
  }

  const chapterIndex = manualContent.findIndex((candidate) => candidate.slug === slug);
  const entry = manualContent[chapterIndex];

  if (!entry) {
    return null;
  }

  const chapters = getManualChapters();
  return {
    Content: entry.Content,
    chapter: chapters[chapterIndex],
    chapters,
    next: chapters[chapterIndex + 1],
    previous: chapters[chapterIndex - 1],
  };
});
