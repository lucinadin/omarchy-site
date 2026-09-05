import "server-only";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import GithubSlugger from "github-slugger";

import { omarchyApplications } from "@/content/omarchy-applications";
import { projectResources, sitePages, type SitePage } from "@/features/discovery/site-pages";
import type { SearchEntry, SearchIndex } from "@/features/discovery/types";
import { manualContent, manualTableOfContents } from "@/features/manual/manual-content";
import { newsContent } from "@/features/news/news-content";
import { siteTagline } from "@/lib/site-brand";
import { absoluteUrl } from "@/lib/site-links";

type SourceDocument = {
  source: string;
  title: string;
  url: string;
};

type NewsSourceDocument = SourceDocument & {
  author: string;
  authorUrl?: string;
  dateTime: string;
  description: string;
  slug: string;
};

type ManualSourceDocument = SourceDocument & {
  slug: string;
};

type DiscoveryCorpus = {
  manual: ManualSourceDocument[];
  news: NewsSourceDocument[];
};

type SitemapRecord = {
  lastModified?: string;
  url: string;
};

const manualDirectory = path.join(process.cwd(), "content/manual");
const newsDirectory = path.join(process.cwd(), "content/news");

let corpusPromise: Promise<DiscoveryCorpus> | undefined;

function normalizeMarkdown(markdown: string) {
  return `${markdown.trim()}\n`;
}

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/<!--([\s\S]*?)-->/gu, " ")
    .replace(/```[^\n]*\n([\s\S]*?)```/gu, "$1")
    .replace(/~~~[^\n]*\n([\s\S]*?)~~~/gu, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/<((?:https?:\/\/|mailto:)[^>]+)>/gu, "$1")
    .replace(/<[^>]+>/gu, " ")
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-+*]|\d+[.)])\s+/gmu, "")
    .replace(/[*_~]/gu, "")
    .replace(/\\([\\`*{}[\]()#+.!_>-])/gu, "$1")
    .replace(/\|/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function headingTitle(markdown: string) {
  return stripMarkdown(markdown.replace(/\s+#+\s*$/u, ""));
}

function entriesFromMarkdown(
  document: SourceDocument,
  kind: "manual" | "news",
  collectionTitle: string
) {
  const entries: SearchEntry[] = [];
  const headings = [...document.source.matchAll(/^(#{2,6})\s+(.+?)\s*$/gmu)];
  const slugger = new GithubSlugger();

  const openingText = stripMarkdown(
    document.source.slice(0, headings[0]?.index ?? document.source.length)
  );
  if (openingText || headings.length === 0) {
    entries.push({
      kind,
      parent: collectionTitle,
      text: openingText,
      title: document.title,
      url: document.url,
    });
  }

  headings.forEach((heading, index) => {
    const title = headingTitle(heading[2]);
    const bodyStart = (heading.index ?? 0) + heading[0].length;
    const bodyEnd = headings[index + 1]?.index ?? document.source.length;
    entries.push({
      kind,
      parent: document.title,
      text: stripMarkdown(document.source.slice(bodyStart, bodyEnd)),
      title,
      url: `${document.url}#${slugger.slug(title)}`,
    });
  });

  return entries;
}

async function readManualSources(): Promise<ManualSourceDocument[]> {
  const filenames = await readdir(manualDirectory);
  const entries = [...manualContent, manualTableOfContents];

  return Promise.all(
    entries.map(async ({ href, slug, title }) => {
      const filename =
        slug === "toc"
          ? "toc.mdx"
          : filenames.find((candidate) =>
              slug ? candidate.endsWith(`-${slug}.mdx`) : candidate.startsWith("01-")
            );

      if (!filename) {
        throw new Error(`No manual source file found for ${href}`);
      }

      return {
        slug,
        source: normalizeMarkdown(await readFile(path.join(manualDirectory, filename), "utf-8")),
        title,
        url: href,
      };
    })
  );
}

function readNewsSources(): Promise<NewsSourceDocument[]> {
  return Promise.all(
    newsContent.map(async ({ author, authorUrl, dateTime, description, slug, title }) => ({
      author,
      authorUrl,
      dateTime,
      description,
      slug,
      source: normalizeMarkdown(await readFile(path.join(newsDirectory, `${slug}.mdx`), "utf-8")),
      title,
      url: `/news/${slug}/`,
    }))
  );
}

function getCorpus() {
  corpusPromise ??= Promise.all([readManualSources(), readNewsSources()]).then(
    ([manual, news]) => ({
      manual,
      news: news.toSorted((left, right) => right.dateTime.localeCompare(left.dateTime)),
    })
  );

  return corpusPromise;
}

function applicationSearchEntry(application: (typeof omarchyApplications)[number]): SearchEntry {
  return {
    kind: "application",
    parent: "Omarchy applications",
    text: [application.description, ...application.aliases, ...(application.hotkeys ?? [])].join(
      " "
    ),
    title: application.launcherLabel ?? application.name,
    url: application.manualHref,
  };
}

function pageSearchEntry(page: SitePage): SearchEntry {
  return {
    kind: "page",
    text: page.description,
    title: page.title,
    url: page.url,
  };
}

export async function getSearchIndex(): Promise<SearchIndex> {
  const corpus = await getCorpus();
  const manualEntries = corpus.manual.flatMap((document) =>
    entriesFromMarkdown(document, "manual", "The Omarchy Manual")
  );
  const newsEntries = corpus.news.flatMap((document) =>
    entriesFromMarkdown(document, "news", "Omarchy News")
  );

  return {
    entries: [
      ...sitePages.map(pageSearchEntry),
      ...omarchyApplications.map(applicationSearchEntry),
      {
        kind: "page",
        text: "The complete guide to installing, learning, changing, and fixing Omarchy.",
        title: "The Omarchy Manual",
        url: "/manual/",
      },
      {
        kind: "page",
        text: "Announcements, releases, foundation updates, and other Omarchy news.",
        title: "Omarchy News",
        url: "/news/",
      },
      ...manualEntries,
      ...newsEntries,
      ...projectResources,
    ],
    version: 1,
  };
}

function manualMarkdown(document: ManualSourceDocument) {
  return `# ${document.title}\n\n> Part of [The Omarchy Manual](${absoluteUrl("/manual/")}).\n\n${document.source}`;
}

function newsMarkdown(document: NewsSourceDocument) {
  const author = document.authorUrl
    ? `[${document.author}](${document.authorUrl})`
    : document.author;
  return `# ${document.title}\n\n${document.dateTime} · ${author}\n\n${document.source}`;
}

export async function getManualMarkdown(slug: string) {
  const document = (await getCorpus()).manual.find((candidate) => candidate.slug === slug);
  return document ? manualMarkdown(document) : null;
}

export async function getNewsMarkdown(slug?: string) {
  const news = (await getCorpus()).news;
  if (slug) {
    const document = news.find((candidate) => candidate.slug === slug);
    return document ? newsMarkdown(document) : null;
  }

  const articles = news
    .map(
      (article) =>
        `- [${article.title}](${absoluteUrl(`/news/${article.slug}/index.md`)}): ${article.description}`
    )
    .join("\n");

  return `# Omarchy News\n\nAnnouncements, releases, foundation updates, and other Omarchy news.\n\n${articles}\n`;
}

function shiftHeadings(markdown: string, levels: number) {
  return markdown.replace(/^(#{1,6})\s/gmu, (_match, hashes: string) => {
    const level = Math.min(6, hashes.length + levels);
    return `${"#".repeat(level)} `;
  });
}

export function getLlmsText() {
  const websiteLinkLines: string[] = [];
  for (const page of sitePages) {
    if (page.url !== "/") {
      websiteLinkLines.push(`- [${page.title}](${absoluteUrl(page.url)}): ${page.description}`);
    }
  }
  const websiteLinks = websiteLinkLines.join("\n");
  const resourceLinks = projectResources
    .map((resource) => `- [${resource.title}](${resource.url}): ${resource.text}`)
    .join("\n");

  return `# Omarchy\n\n> ${siteTagline}.\n\nOmarchy is an opinionated Arch and Hyprland Linux distribution built as one coherent, malleable system.\n\n## Documentation\n\n- [Start the Omarchy Manual](${absoluteUrl("/manual/index.md")}): The introduction and first chapter.\n- [Manual table of contents](${absoluteUrl("/manual/toc/index.md")}): Installation, navigation, applications, customization, troubleshooting, and every shipped hotkey.\n- [Omarchy News](${absoluteUrl("/news/index.md")}): Announcements, releases, and foundation updates.\n- [Full website corpus](${absoluteUrl("/llms-full.txt")}): The complete manual and news archive in one Markdown document.\n\n## Website\n\n${websiteLinks}\n\n## Project\n\n${resourceLinks}\n`;
}

export async function getLlmsFullText() {
  const corpus = await getCorpus();
  const manual = corpus.manual
    .map(
      (chapter) =>
        `## ${chapter.title}\n\nSource: ${absoluteUrl(chapter.url)}\n\n${shiftHeadings(chapter.source, 1)}`
    )
    .join("\n\n---\n\n");
  const news = corpus.news
    .map(
      (article) =>
        `## ${article.title}\n\n${article.dateTime} · ${article.author}\n\nSource: ${absoluteUrl(article.url)}\n\n${shiftHeadings(article.source, 1)}`
    )
    .join("\n\n---\n\n");

  return `# Omarchy\n\n> ${siteTagline}.\n\nThis file contains the complete Omarchy manual and news archive. The concise index is at ${absoluteUrl("/llms.txt")}.\n\n# The Omarchy Manual\n\n${manual}\n\n# Omarchy News\n\n${news}\n`;
}

export async function getSitemapRecords(): Promise<SitemapRecord[]> {
  const corpus = await getCorpus();
  const latestNewsDate = corpus.news[0]?.dateTime;
  const newsIndex: SitemapRecord = { url: absoluteUrl("/news/") };
  if (latestNewsDate) newsIndex.lastModified = latestNewsDate;

  return [
    ...sitePages.map((page) => ({ url: absoluteUrl(page.url) })),
    ...corpus.manual.map((chapter) => ({ url: absoluteUrl(chapter.url) })),
    newsIndex,
    ...corpus.news.map((article) => ({
      lastModified: article.dateTime,
      url: absoluteUrl(article.url),
    })),
  ];
}
