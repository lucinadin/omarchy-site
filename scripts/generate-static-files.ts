import { resolve } from "node:path";

import {
  getLlmsFullText,
  getLlmsText,
  getManualMarkdown,
  getNewsMarkdown,
  getSearchIndex,
  getSitemapRecords,
} from "../features/discovery/discovery-content";
import { manualContent, manualTableOfContents } from "../features/manual/manual-content";
import { newsContent } from "../features/news/news-content";
import { absoluteUrl } from "../lib/site-links";
import { writeFileIfChanged } from "./write-file-if-changed";

const publicDirectory = resolve(process.cwd(), "public");

function sitemapXml(records: Awaited<ReturnType<typeof getSitemapRecords>>) {
  const urls = records
    .map(
      (record) =>
        `  <url>\n    <loc>${record.url}</loc>${record.lastModified ? `\n    <lastmod>${record.lastModified}</lastmod>` : ""}\n  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function writeGeneratedFile(pathname: string, contents: string) {
  const status = await writeFileIfChanged(
    resolve(publicDirectory, pathname),
    Buffer.from(contents)
  );
  console.log(`${status === "written" ? "Generated" : "Unchanged"} public/${pathname}`);
}

await Promise.all([
  writeGeneratedFile("llms.txt", await getLlmsText()),
  writeGeneratedFile("llms-full.txt", await getLlmsFullText()),
  writeGeneratedFile(
    "robots.txt",
    `User-Agent: *\nAllow: /\n\nSitemap: ${absoluteUrl("/sitemap.xml")}\n`
  ),
  writeGeneratedFile("search-index.json", `${JSON.stringify(await getSearchIndex())}\n`),
  writeGeneratedFile("sitemap.xml", sitemapXml(await getSitemapRecords())),
]);

for (const { slug } of [...manualContent, manualTableOfContents]) {
  const markdown = await getManualMarkdown(slug);
  if (!markdown) throw new Error(`No Manual Markdown generated for ${slug || "index"}`);
  await writeGeneratedFile(`manual/${slug ? `${slug}/` : ""}index.md`, markdown);
}

const newsIndex = await getNewsMarkdown();
if (!newsIndex) throw new Error("No News index Markdown generated");
await writeGeneratedFile("news/index.md", newsIndex);
for (const { slug } of newsContent) {
  const markdown = await getNewsMarkdown(slug);
  if (!markdown) throw new Error(`No News Markdown generated for ${slug}`);
  await writeGeneratedFile(`news/${slug}/index.md`, markdown);
}
