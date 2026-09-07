import "server-only";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

import sharp from "sharp";

import { relativeLuminance } from "@/lib/color";
import type { ThemeMode } from "@/lib/themes/themes";

export async function prepareThemeBackground(publicPath: string) {
  const publicRoot = resolve(process.cwd(), "public");
  const inputPath = resolve(publicRoot, publicPath.replace(/^\//u, ""));

  if (!inputPath.startsWith(`${publicRoot}${sep}`)) {
    throw new Error(`Theme image is outside public/: ${publicPath}`);
  }

  const background = await sharp(await readFile(inputPath))
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
  const { channels } = await sharp(background).stats();
  // Only a fallback for pending themes; verified palettes supply their own mode.
  const mode: ThemeMode =
    relativeLuminance(channels[0].mean, channels[1].mean, channels[2].mean) > 0.5
      ? "light"
      : "dark";

  return {
    backgroundSource: `data:image/png;base64,${background.toString("base64")}`,
    mode,
  };
}

export async function prepareThemeIndexBackground() {
  const background = await readFile(
    resolve(process.cwd(), "assets/og/themes-background.png"),
    "base64"
  );
  return `data:image/png;base64,${background}`;
}
