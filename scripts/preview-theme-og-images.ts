import { resolve } from "node:path";

import { renderThemeImage } from "../lib/og/theme-presentation";
import { getThemeOpenGraphStaticParams, getShareableTheme } from "../lib/themes/theme-catalog";
import { parseThemeShareKey } from "../lib/themes/theme-sharing";
import { fileExists, writeFileIfChanged } from "./write-file-if-changed";

const defaultPreviews = [
  "official/tokyo-night",
  "official/catppuccin-latte",
  "community/aetheria",
  "community/coffee-latte",
] as const;

const writeImages = process.argv.includes("--write");
const force = process.argv.includes("--force");
const requestedPreviews = process.argv
  .slice(2)
  .filter((argument) => argument !== "--write" && argument !== "--force");
const references = writeImages
  ? getThemeOpenGraphStaticParams()
  : (requestedPreviews.length > 0 ? requestedPreviews : defaultPreviews).map((key) => {
      const reference = parseThemeShareKey(key);
      if (!reference || !getShareableTheme(reference)) throw new Error(`Unknown theme: ${key}`);
      return reference;
    });
const outputDirectory = resolve(
  process.cwd(),
  writeImages ? "public/assets/og/themes" : "out/og-previews/themes"
);

let renderedCount = 0;
for (const reference of references) {
  const output = resolve(
    outputDirectory,
    writeImages
      ? `${reference.kind}/${reference.slug}.png`
      : `${reference.kind}-${reference.slug}.png`
  );
  if (!force && (await fileExists(output))) {
    continue;
  }
  const response = await renderThemeImage(reference);
  const status = await writeFileIfChanged(output, Buffer.from(await response.arrayBuffer()));
  console.log(`${status === "written" ? "Rendered" : "Unchanged"} ${output}`);
  renderedCount += 1;
}

console.log(`Theme OG: rendered ${renderedCount}, skipped ${references.length - renderedCount}`);
