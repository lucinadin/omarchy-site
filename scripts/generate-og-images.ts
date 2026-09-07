import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import sharp from "sharp";

import { getNewsSummaries } from "../features/news/news-queries";
import { renderHomeOpenGraphImage } from "../lib/og/home-image";
import { renderPageOpenGraphImage } from "../lib/og/page-image";
import { prepareThemeIndexBackground } from "../lib/og/theme-assets";
import { renderThemeImage } from "../lib/og/theme-presentation";
import { siteTagline } from "../lib/site-brand";
import { getShareableTheme, getThemeOpenGraphStaticParams } from "../lib/themes/theme-catalog";
import { parseThemeShareKey } from "../lib/themes/theme-sharing";
import { writeFileIfChanged } from "./write-file-if-changed";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: { preview: { type: "boolean", default: false } },
  allowPositionals: true,
});
const [group = "all", ...themeKeys] = positionals;
if (!["all", "base", "home", "manual", "news", "themes"].includes(group)) {
  throw new Error(`Unknown OG group: ${group}. Use all, base, home, manual, news, or themes.`);
}
if (themeKeys.length > 0 && group !== "themes") {
  throw new Error("Theme keys can only be supplied with the themes group.");
}
// Validate all requested keys before writing any images.
const requestedThemes = themeKeys.map((key) => {
  const reference = parseThemeShareKey(key);
  if (!reference || !getShareableTheme(reference)) throw new Error(`Unknown theme: ${key}`);
  return reference;
});

const images: { path: string; render: () => Response | Promise<Response> }[] = [];

// Preserve the copy and image URLs already used by these pages.
const baseImages = [
  {
    path: "app/opengraph-image.png",
    title: siteTagline,
    eyebrow: "WE CAN FIX EVERYTHING.",
    footer: "OMARCHY.ORG",
  },
  { path: "public/assets/images/social/air.png", title: "Artists in Residence" },
  { path: "public/assets/images/social/teams.png", title: "The teams guiding Omarchy" },
  { path: "public/assets/images/social/meetups.png", title: "Meetups around the world" },
  { path: "public/assets/images/social/patrons.png", title: "The foundation funding Omarchy" },
  {
    path: "public/assets/images/social/patron-badges.png",
    title: "Digital rally credentials for every patron",
  },
  { path: "public/assets/images/social/sponsorships.png", title: "What the foundation funds" },
  {
    path: "public/assets/images/opengraph.png",
    title: "Beautiful, Modern & Opinionated Linux by DHH",
  },
  { path: "app/foundation/opengraph-image.png", title: "The Omacom Foundation" },
  {
    path: "app/omakub/opengraph-image.png",
    title: "OMAKUB",
    description:
      "Turn a fresh Ubuntu installation into a fully-configured, beautiful, and modern web development system by running a single command.",
  },
  { path: "app/security/credits/opengraph-image.png", title: "Security credits" },
];

async function getManualPages() {
  const [source, contentFiles] = await Promise.all([
    readFile(resolve(process.cwd(), "features/manual/manual-content.ts"), "utf-8"),
    readdir(resolve(process.cwd(), "content/manual")),
  ]);
  const entryPattern = /href:\s*"[^"]+",\s*slug:\s*"([^"]*)",\s*title:\s*"([^"]+)",/gu;
  const pages = [...source.matchAll(entryPattern)].map((match) => ({
    slug: match[1],
    title: match[2],
  }));
  const mdxCount = contentFiles.filter((filename) => filename.endsWith(".mdx")).length;

  if (pages.length !== mdxCount) {
    throw new Error(
      `Found ${pages.length} Manual metadata entries but ${mdxCount} MDX files. ` +
        "Update features/manual/manual-content.ts before generating OG images."
    );
  }

  const outputNames = pages.map(({ slug }) => slug || "index");
  if (new Set(outputNames).size !== outputNames.length) {
    throw new Error("Manual slugs must be unique before OG images can be generated.");
  }

  return pages;
}

if (group === "all" || group === "base") {
  for (const { path, ...content } of baseImages) {
    images.push({
      path,
      render: () =>
        renderPageOpenGraphImage({
          ...content,
          layout: "centered",
          scale: path === "app/opengraph-image.png" ? 1 : 2,
        }),
    });
  }
}
if (group === "all" || group === "home") {
  images.push({ path: "public/assets/og/home.png", render: renderHomeOpenGraphImage });
}
if (group === "all" || group === "manual") {
  for (const page of await getManualPages()) {
    images.push({
      path: `public/assets/og/manual/${page.slug || "index"}.webp`,
      render: () =>
        renderPageOpenGraphImage({
          eyebrow: "THE OMARCHY MANUAL",
          title: page.title,
          footer: "We can fix everything.",
        }),
    });
  }
}
if (group === "all" || group === "news") {
  images.push({
    path: "public/assets/og/news/index.png",
    render: () =>
      renderPageOpenGraphImage({
        eyebrow: "OMARCHY NEWS",
        footer: "OMARCHY.ORG/NEWS",
        title: "Announcements, releases, and other news",
      }),
  });
  for (const article of await getNewsSummaries()) {
    images.push({
      path: `public/assets/og/news/${article.slug}.png`,
      render: () =>
        renderPageOpenGraphImage({
          eyebrow: "OMARCHY NEWS",
          footer: `${article.date} · ${article.author}`.toUpperCase(),
          title: article.title,
        }),
    });
  }
}
if (group === "all" || group === "themes") {
  images.push({
    path: "public/assets/og/themes/index.png",
    render: async () =>
      renderPageOpenGraphImage({
        backgroundSource: await prepareThemeIndexBackground(),
        layout: "centered",
        title: "Themes",
      }),
  });
  const references = requestedThemes.length > 0 ? requestedThemes : getThemeOpenGraphStaticParams();
  for (const reference of references) {
    images.push({
      path: `public/assets/og/themes/${reference.kind}/${reference.slug}.png`,
      render: () => renderThemeImage(reference),
    });
  }
}

let written = 0;
for (const { path, render } of images) {
  // Always render current inputs: existence alone says nothing about freshness.
  const response = await render();
  const png = Buffer.from(await response.arrayBuffer());
  const image = path.endsWith(".webp")
    ? await sharp(png).webp({ effort: 6, quality: 86, smartSubsample: true }).toBuffer()
    : png;
  // Retain app/public prefixes in previews to avoid filename collisions.
  const output = resolve(process.cwd(), values.preview ? `tmp/og-previews/${path}` : path);
  const status = await writeFileIfChanged(output, image);
  if (status === "written") {
    written += 1;
    console.log(`Updated ${output}`);
  }
}
console.log(
  `OG ${group}: rendered ${images.length}, updated ${written}, unchanged ${images.length - written}.`
);
