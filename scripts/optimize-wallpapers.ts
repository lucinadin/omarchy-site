import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

import type { OmarchyThemeId } from "../lib/themes/official";

// Explicit selections preserve the artwork when upstream adds/reorders backgrounds.
const sources = {
  "catppuccin-latte": "1-color-fade.webp",
  catppuccin: "1-totoro.webp",
  ethereal: "1-cosmic.webp",
  everforest: "1-tree-tops.webp",
  "flexoki-light": "1-orb.webp",
  gruvbox: "1-the-backwater.jpg",
  hackerman: "1-synth-scape.jpg",
  kanagawa: "1-kanagawa.jpg",
  "last-horizon": "1-eyes-wide.webp",
  lumon: "01-united-in-severance.webp",
  lupine: "01-cherry-blossom-bokeh.webp",
  "matte-black": "0-ship-at-sea.jpg",
  miasma: "01-nature-of-fear.webp",
  nord: "0-black-moon.jpg",
  "osaka-jade": "1-glowing-city.webp",
  "retro-82": "1-in-the-groove.webp",
  ristretto: "0-launch.webp",
  "rose-pine": "1-funky-shapes.webp",
  solitude: "1-on-pole.webp",
  "tokyo-night": "0-winding-road.webp",
  vantablack: "0-dot-hands.webp",
  white: "1-white.webp",
} satisfies Record<OmarchyThemeId, string>;

const root = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(root, "assets/theme-wallpapers");
await mkdir(outputDirectory, { recursive: true });

for (const [id, filename] of Object.entries(sources)) {
  const source = await readFile(
    resolve(root, ".repos/omarchy-upstream/themes", id, "backgrounds", filename)
  );
  const image = await sharp(source)
    .autoOrient()
    .resize({ width: 1536, withoutEnlargement: true })
    .webp({ effort: 6, quality: 75, smartSubsample: true })
    .toBuffer();
  await writeFile(resolve(outputDirectory, `${id}.webp`), image);
  console.log(`${id}: ${Math.round(image.length / 1024)} KiB`);
}
