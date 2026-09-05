import { resolve } from "node:path";

import { getNewsSummaries } from "../features/news/news-queries";
import { renderNewsOpenGraphImage } from "../lib/og/news-image";
import { fileExists, writeFileIfChanged } from "./write-file-if-changed";

const writeImages = process.argv.includes("--write");
const force = process.argv.includes("--force");
const outputDirectory = resolve(
  process.cwd(),
  writeImages ? "public/assets/og/news" : "out/og-previews/news"
);

async function writeImage(filename: string, render: () => Response) {
  const output = resolve(outputDirectory, filename);
  if (!force && (await fileExists(output))) {
    return false;
  }
  const response = render();
  const status = await writeFileIfChanged(output, Buffer.from(await response.arrayBuffer()));
  console.log(`${status === "written" ? "Rendered" : "Unchanged"} ${output}`);
  return true;
}

const articles = await getNewsSummaries();
let renderedCount = Number(
  await writeImage("index.png", () =>
    renderNewsOpenGraphImage({
      meta: "omarchy.org/news",
      title: "Announcements, releases, and other news",
    })
  )
);

for (const article of articles) {
  if (
    await writeImage(`${article.slug}.png`, () =>
      renderNewsOpenGraphImage({
        meta: `${article.date} · ${article.author}`,
        title: article.title,
      })
    )
  ) {
    renderedCount += 1;
  }
}

console.log(`News OG: rendered ${renderedCount}, skipped ${articles.length + 1 - renderedCount}`);
