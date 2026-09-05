import "server-only";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

import sharp from "sharp";

import { relativeLuminance } from "@/lib/color";

function toHex(value: number) {
  return value.toString(16).padStart(2, "0");
}

function getSaturation(red: number, green: number, blue: number) {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  return maximum === 0 ? 0 : (maximum - minimum) / maximum;
}

function findImageAccent(data: Buffer, channels: number) {
  const buckets = new Map<
    string,
    { blue: number; count: number; green: number; red: number; score: number }
  >();

  for (let index = 0; index < data.length; index += channels) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const saturation = getSaturation(red, green, blue);
    const lightness = (Math.max(red, green, blue) + Math.min(red, green, blue)) / 510;
    if (saturation < 0.2 || lightness < 0.1 || lightness > 0.88) continue;

    const key = `${red >> 4}-${green >> 4}-${blue >> 4}`;
    const bucket = buckets.get(key) ?? { blue: 0, count: 0, green: 0, red: 0, score: 0 };
    bucket.blue += blue;
    bucket.count += 1;
    bucket.green += green;
    bucket.red += red;
    bucket.score += saturation * (0.65 + Math.min(lightness, 0.65));
    buckets.set(key, bucket);
  }

  let winner: ReturnType<typeof buckets.get>;
  for (const bucket of buckets.values()) {
    if (!winner || bucket.score > winner.score) winner = bucket;
  }
  if (!winner) return { blue: 106, green: 206, red: 158 };

  return {
    blue: Math.round(winner.blue / winner.count),
    green: Math.round(winner.green / winner.count),
    red: Math.round(winner.red / winner.count),
  };
}

export async function prepareCommunityThemeBackground(publicPath: string) {
  const publicRoot = resolve(process.cwd(), "public");
  const inputPath = resolve(publicRoot, publicPath.replace(/^\//u, ""));

  if (!inputPath.startsWith(`${publicRoot}${sep}`)) {
    throw new Error(`Community theme image is outside public/: ${publicPath}`);
  }

  const input = await readFile(inputPath);
  const [{ channels }, sample] = await Promise.all([
    sharp(input).stats(),
    sharp(input).resize(48, 48, { fit: "inside" }).removeAlpha().raw().toBuffer({
      resolveWithObject: true,
    }),
  ]);
  const imageLuminance = relativeLuminance(
    channels[0]?.mean ?? 0,
    channels[1]?.mean ?? 0,
    channels[2]?.mean ?? 0
  );
  const sampledAccent = findImageAccent(sample.data, sample.info.channels);
  const maximumChannel = Math.max(sampledAccent.red, sampledAccent.green, sampledAccent.blue);
  const accentScale = maximumChannel < 210 ? 210 / maximumChannel : 1;
  const red = Math.min(255, Math.round(sampledAccent.red * accentScale));
  const green = Math.min(255, Math.round(sampledAccent.green * accentScale));
  const blue = Math.min(255, Math.round(sampledAccent.blue * accentScale));
  const overlayOpacity = Math.min(0.78, Math.max(0.54, 0.5 + imageLuminance * 0.42));
  const shadeLayer = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
      <defs>
        <linearGradient id="shade" x1="0" x2="1">
          <stop offset="0" stop-color="#05060a" stop-opacity="${Math.min(0.9, overlayOpacity + 0.12)}" />
          <stop offset="0.68" stop-color="#05060a" stop-opacity="${overlayOpacity}" />
          <stop offset="1" stop-color="#05060a" stop-opacity="${Math.max(0.38, overlayOpacity - 0.1)}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#shade)" />
    </svg>
  `);
  const background = await sharp(input)
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .composite([{ input: shadeLayer }])
    .png()
    .toBuffer();

  return {
    accent: `#${toHex(red)}${toHex(green)}${toHex(blue)}`,
    backgroundSource: `data:image/png;base64,${background.toString("base64")}`,
  };
}
