import { mkdir, readFile, readdir, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";

import sharp from "sharp";

import { escapeXmlText } from "../lib/xml";
import { fileExists, writeFileIfChanged } from "./write-file-if-changed";

type ManualPage = {
  slug: string;
  title: string;
};

const scriptDirectory = import.meta.dirname;
const projectRoot = resolve(scriptDirectory, "..");
const writeImages = process.argv.includes("--write");
const force = process.argv.includes("--force");
const outputDirectory = resolve(
  projectRoot,
  writeImages ? "public/assets/og/manual" : "out/og-previews/manual"
);
const manualContentSource = resolve(projectRoot, "features/manual/manual-content.ts");
const manualMdxDirectory = resolve(projectRoot, "content/manual");
const regularFont = resolve(scriptDirectory, "og/fonts/JetBrainsMono-Regular.ttf");
const boldFont = resolve(scriptDirectory, "og/fonts/JetBrainsMono-Bold.ttf");
const wordmark = resolve(projectRoot, "public/assets/brand/omarchy-wordmark.svg");
const wallpaper = resolve(projectRoot, "public/assets/images/theme-wallpapers/tokyo-night.webp");

async function getManualPages(): Promise<ManualPage[]> {
  const [source, contentFiles] = await Promise.all([
    readFile(manualContentSource, "utf-8"),
    readdir(manualMdxDirectory),
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

function getTitleSize(title: string) {
  if (title.length <= 28) return 60;
  if (title.length <= 35) return 50;
  if (title.length <= 48) return 44;
  return 38;
}

function createTextLayer(page: ManualPage, regularFontData: string, boldFontData: string) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <style>
        @font-face {
          font-family: "JetBrains Mono";
          font-style: normal;
          font-weight: 400;
          src: url("data:font/ttf;base64,${regularFontData}") format("truetype");
        }
        @font-face {
          font-family: "JetBrains Mono";
          font-style: normal;
          font-weight: 700;
          src: url("data:font/ttf;base64,${boldFontData}") format("truetype");
        }
        text { font-family: "JetBrains Mono", monospace; }
      </style>
      <text x="70" y="308" fill="#c0caf5" font-size="27" font-weight="400">We can fix everything.</text>
      <text x="70" y="447" fill="#9ece6a" font-size="19" font-weight="700" letter-spacing="2">THE OMARCHY MANUAL</text>
      <text x="66" y="549" fill="#c0caf5" font-size="${getTitleSize(page.title)}" font-weight="700">${escapeXmlText(page.title)}</text>
    </svg>
  `);
}

async function prepareSharedAssets() {
  const [regularFontBuffer, boldFontBuffer, wordmarkBuffer] = await Promise.all([
    readFile(regularFont),
    readFile(boldFont),
    readFile(wordmark),
  ]);
  const wordmarkLayer = await sharp(wordmarkBuffer).resize({ width: 820 }).png().toBuffer();

  return {
    boldFontData: boldFontBuffer.toString("base64"),
    regularFontData: regularFontBuffer.toString("base64"),
    wordmarkLayer,
  };
}

async function renderManualPage(
  page: ManualPage,
  assets: Awaited<ReturnType<typeof prepareSharedAssets>>
) {
  const outputName = page.slug || "index";
  const output = join(outputDirectory, `${outputName}.webp`);
  if (!force && (await fileExists(output))) {
    return false;
  }
  const shadeLayer = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
      <rect width="1200" height="630" fill="#0e0e14" fill-opacity="0.48" />
      <rect y="385" width="1200" height="245" fill="#0e0e14" fill-opacity="0.72" />
    </svg>
  `);

  const image = await sharp(wallpaper)
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .modulate({ brightness: 0.78, saturation: 0.88 })
    .composite([
      { input: shadeLayer },
      { input: assets.wordmarkLayer, left: 64, top: 64 },
      {
        input: createTextLayer(page, assets.regularFontData, assets.boldFontData),
      },
    ])
    .webp({ effort: 6, quality: 86, smartSubsample: true })
    .toBuffer();
  const status = await writeFileIfChanged(output, image);

  console.log(
    `${status === "written" ? "Generated" : "Unchanged"} ${outputName}.webp — ${page.title}`
  );
  return true;
}

async function removeObsoleteJpegs() {
  const files = await readdir(outputDirectory, { withFileTypes: true });
  const obsoleteImages = files.filter(
    (file) => file.isFile() && (file.name.endsWith(".jpg") || file.name.endsWith(".jpeg"))
  );

  await Promise.all(obsoleteImages.map((file) => unlink(join(outputDirectory, file.name))));
  if (obsoleteImages.length > 0) {
    console.log(`Removed ${obsoleteImages.length} obsolete JPEG images`);
  }
}

const pages = await getManualPages();
await mkdir(outputDirectory, { recursive: true });
const assets = await prepareSharedAssets();

let renderedCount = 0;
for (const page of pages) if (await renderManualPage(page, assets)) renderedCount += 1;

await removeObsoleteJpegs();
console.log(`Manual OG: rendered ${renderedCount}, skipped ${pages.length - renderedCount}`);
if (!writeImages) console.log("Run with --write after approving the complete set.");
