import { readFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

import { defaultThemeId, getOfficialThemeWallpaper } from "@/lib/themes/official";

export const ogSize = { height: 630, width: 1200 } as const;

const [wordmark, wordmarkSvg, regularFont, boldFont, wallpaper] = await Promise.all([
  readFile(join(process.cwd(), "public/assets/brand/omarchy-wordmark.png"), "base64"),
  readFile(join(process.cwd(), "public/assets/brand/omarchy-wordmark.svg"), "utf-8"),
  readFile(join(process.cwd(), "scripts/og/fonts/JetBrainsMono-Regular.ttf")),
  readFile(join(process.cwd(), "scripts/og/fonts/JetBrainsMono-Bold.ttf")),
  sharp(join(process.cwd(), getOfficialThemeWallpaper(defaultThemeId)))
    .resize(ogSize.width, ogSize.height, { fit: "cover" })
    .jpeg({ quality: 90 })
    .toBuffer(),
]);

export const ogWordmarkSource = `data:image/png;base64,${wordmark}`;
export const ogWallpaperSource = `data:image/jpeg;base64,${wallpaper.toString("base64")}`;

export function getOgWordmarkSource(color: string) {
  const fill = /^#[\da-f]{6}$/iu.test(color) ? color : "#9ece6a";
  const source = wordmarkSvg.replace("#9ece6a", fill);
  return `data:image/svg+xml;base64,${Buffer.from(source).toString("base64")}`;
}

export const ogFonts = [
  {
    data: regularFont,
    name: "JetBrains Mono",
    style: "normal" as const,
    weight: 400 as const,
  },
  {
    data: boldFont,
    name: "JetBrains Mono",
    style: "normal" as const,
    weight: 700 as const,
  },
];
