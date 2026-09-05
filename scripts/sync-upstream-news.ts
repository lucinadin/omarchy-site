import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, normalize, relative, resolve } from "node:path";

import { fileExists, writeOrCheckFile } from "./write-file-if-changed";

const projectDirectory = process.cwd();
const upstreamDirectory = resolve(projectDirectory, ".repos/omarchy-site-upstream/content/news");
const contentDirectory = resolve(projectDirectory, "content/news");
const assetDirectory = resolve(projectDirectory, "public/assets/news");
const registryFilename = resolve(projectDirectory, "features/news/news-content.ts");
const sourceDatePattern = /^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2})\s+([+-]\d{2})(\d{2}))?$/u;
const relativeAssetPattern = /\]\((?![a-z][a-z\d+.-]*:|[/#])([^)]+)\)/giu;

type SourcePost = {
  assets: string[];
  author: string;
  authorUrl?: string;
  body: string;
  dateTime: string;
  description: string;
  publishedOn: string;
  slug: string;
  sourceFilename: string;
  title: string;
};

async function collectMarkdownFiles() {
  const filenames: string[] = [];
  const years = await readdir(upstreamDirectory, { withFileTypes: true });

  for (const year of years) {
    if (!year.isDirectory()) continue;

    const yearDirectory = join(upstreamDirectory, year.name);
    const months = await readdir(yearDirectory, { withFileTypes: true });

    for (const month of months) {
      if (!month.isDirectory()) continue;

      const monthDirectory = join(yearDirectory, month.name);
      const entries = await readdir(monthDirectory, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && extname(entry.name) === ".md") {
          filenames.push(join(monthDirectory, entry.name));
        }
      }
    }
  }

  return filenames.toSorted();
}

function readRequiredMetadata(
  metadata: ReadonlyMap<string, string>,
  key: string,
  filename: string
) {
  const value = metadata.get(key);
  if (!value) throw new Error(`${filename} is missing required front matter: ${key}`);
  return value;
}

function parseSourceDate(value: string, filename: string) {
  const match = sourceDatePattern.exec(value);
  if (!match) throw new Error(`${filename} has an unsupported date: ${value}`);

  const [, publishedOn, time, offsetHour, offsetMinute] = match;
  const isoSource = time
    ? `${publishedOn}T${time}:00${offsetHour}:${offsetMinute}`
    : `${publishedOn}T00:00:00Z`;
  const date = new Date(isoSource);

  if (Number.isNaN(date.getTime())) throw new Error(`${filename} has an invalid date: ${value}`);

  return { dateTime: date.toISOString(), publishedOn };
}

function plainText(markdown: string) {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]+\)/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .replace(/<[^>]+>/gu, " ")
    .replace(/[`*_>#~-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function excerpt(markdown: string) {
  const text = plainText(markdown);
  if (text.length <= 240) return text;

  const shortened = text.slice(0, 239).replace(/\s+\S*$/u, "");
  return `${shortened}…`;
}

function normalizeRelativeAsset(asset: string, filename: string) {
  const normalized = normalize(asset);
  if (
    isAbsolute(normalized) ||
    normalized === ".." ||
    normalized.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
  ) {
    throw new Error(`${filename} contains an unsafe relative asset path: ${asset}`);
  }
  return normalized;
}

function rewriteAssets(markdown: string, slug: string) {
  return markdown.replace(relativeAssetPattern, (_match, asset: string) => {
    const normalized = asset.replaceAll("\\", "/");
    return `](/assets/news/${slug}/${normalized})`;
  });
}

function parsePost(source: string, sourceFilename: string): SourcePost {
  const normalizedSource = source.replaceAll("\r\n", "\n");
  const lines = normalizedSource.split("\n");
  if (lines[0] !== "---") throw new Error(`${sourceFilename} has no front matter`);

  const closingLine = lines.indexOf("---", 1);
  if (closingLine === -1) throw new Error(`${sourceFilename} has unclosed front matter`);

  const metadata = new Map<string, string>();
  for (const line of lines.slice(1, closingLine)) {
    const separator = line.indexOf(":");
    if (separator === -1) throw new Error(`${sourceFilename} has invalid front matter: ${line}`);
    metadata.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }

  const relativeFilename = relative(upstreamDirectory, sourceFilename).replaceAll("\\", "/");
  const slug = relativeFilename.slice(0, -extname(relativeFilename).length);
  const body = `${lines
    .slice(closingLine + 1)
    .join("\n")
    .trim()}\n`;
  const assets = new Set<string>();

  for (const match of body.matchAll(relativeAssetPattern)) {
    assets.add(normalizeRelativeAsset(match[1], sourceFilename));
  }

  const sourceDate = readRequiredMetadata(metadata, "date", sourceFilename);
  const { dateTime, publishedOn } = parseSourceDate(sourceDate, sourceFilename);

  return {
    assets: [...assets],
    author: readRequiredMetadata(metadata, "author", sourceFilename),
    authorUrl: metadata.get("author_url"),
    body: rewriteAssets(body, slug),
    dateTime,
    description: metadata.get("description") ?? excerpt(body),
    publishedOn,
    slug,
    sourceFilename,
    title: readRequiredMetadata(metadata, "title", sourceFilename),
  };
}

function naturalSourceOrder(left: string, right: string) {
  const leftParts = left.match(/\d+|\D+/gu) ?? [left];
  const rightParts = right.match(/\d+|\D+/gu) ?? [right];
  const sharedLength = Math.min(leftParts.length, rightParts.length);

  for (let index = 0; index < sharedLength; index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];
    if (leftPart === rightPart) continue;
    if (/^\d+$/u.test(leftPart) && /^\d+$/u.test(rightPart)) {
      return Number(leftPart) - Number(rightPart);
    }
    return leftPart < rightPart ? -1 : 1;
  }
  return leftParts.length - rightParts.length;
}

function registrySource(posts: readonly SourcePost[]) {
  const imports = posts
    .map((post, index) => ({ index, source: `${post.slug}.mdx` }))
    .toSorted((left, right) => naturalSourceOrder(left.source, right.source))
    .map(({ index, source }) => `import NewsPost${index} from "@/content/news/${source}";`)
    .join("\n");
  const entries = posts
    .map(
      (post, index) => `  {
    author: ${JSON.stringify(post.author)},
    authorUrl: ${post.authorUrl ? JSON.stringify(post.authorUrl) : "undefined"},
    Content: NewsPost${index},
    dateTime: ${JSON.stringify(post.dateTime)},
    description:
      ${JSON.stringify(post.description)},
    publishedOn: ${JSON.stringify(post.publishedOn)},
    slug: ${JSON.stringify(post.slug)},
    title: ${JSON.stringify(post.title)},
  },`
    )
    .join("\n");

  return `// Generated by \`bun run sync:news\`. Do not edit by hand.
import "server-only";
import type { MDXContent } from "mdx/types";

${imports}

type NewsContentEntry = {
  author: string;
  authorUrl?: string;
  Content: MDXContent;
  dateTime: string;
  description: string;
  publishedOn: string;
  slug: string;
  title: string;
};

export const newsContent: readonly NewsContentEntry[] = [
${entries}
];
`;
}

const check = process.argv.includes("--check");
const sourceFilenames = await collectMarkdownFiles();
if (sourceFilenames.length === 0) throw new Error(`No news Markdown found in ${upstreamDirectory}`);

const posts = await Promise.all(
  sourceFilenames.map(async (sourceFilename) =>
    parsePost(await readFile(sourceFilename, "utf-8"), sourceFilename)
  )
);
posts.sort((left, right) => right.dateTime.localeCompare(left.dateTime));

const drift: string[] = [];
for (const post of posts) {
  const contentFilename = join(contentDirectory, `${post.slug}.mdx`);
  const contentStatus = await writeOrCheckFile(contentFilename, Buffer.from(post.body), check);
  if (contentStatus !== "unchanged") drift.push(relative(projectDirectory, contentFilename));

  for (const asset of post.assets) {
    const sourceAssetFilename = resolve(dirname(post.sourceFilename), asset);
    if (!(await fileExists(sourceAssetFilename))) {
      throw new Error(`${post.sourceFilename} references missing asset: ${asset}`);
    }

    const assetFilename = resolve(assetDirectory, post.slug, asset);
    const assetStatus = await writeOrCheckFile(
      assetFilename,
      await readFile(sourceAssetFilename),
      check
    );
    if (assetStatus !== "unchanged") drift.push(relative(projectDirectory, assetFilename));
  }
}

const registryStatus = await writeOrCheckFile(
  registryFilename,
  Buffer.from(registrySource(posts)),
  check
);
if (registryStatus !== "unchanged") drift.push(relative(projectDirectory, registryFilename));

if (check && drift.length > 0) {
  throw new Error(
    `News content is out of sync:\n${drift.map((filename) => `- ${filename}`).join("\n")}`
  );
}

console.log(`${check ? "Verified" : "Synchronized"} ${posts.length} upstream news posts.`);
