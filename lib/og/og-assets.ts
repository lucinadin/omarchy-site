import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const ogSize = { height: 630, width: 1200 } as const;

const [wordmark, wordmarkSvg, logo, regularFont, boldFont] = await Promise.all([
  readFile(join(process.cwd(), "public/assets/brand/omarchy-wordmark.png"), "base64"),
  readFile(join(process.cwd(), "public/assets/brand/omarchy-wordmark.svg"), "utf-8"),
  readFile(join(process.cwd(), "public/assets/brand/omarchy-logo.png"), "base64"),
  readFile(join(process.cwd(), "scripts/og/fonts/JetBrainsMono-Regular.ttf")),
  readFile(join(process.cwd(), "scripts/og/fonts/JetBrainsMono-Bold.ttf")),
]);

export const ogWordmarkSource = `data:image/png;base64,${wordmark}`;
export const ogLogoSource = `data:image/png;base64,${logo}`;

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
