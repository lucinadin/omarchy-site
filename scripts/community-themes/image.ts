import sharp from "sharp";

import type { CommunityThemeImageRendition } from "../../content/community-theme-types";
import {
  assertAllowedImageFormat,
  assertImageDimensions,
  assertMaximumBytes,
  communityThemePolicy,
  renditionWidths,
  sha256Hex,
} from "./policy";

export type CommunityThemeImage = {
  blurDataURL: string;
  format: string;
  height: number;
  renditions: readonly CommunityThemeImageRendition[];
  sha256: string;
  sourceBytes: number;
  width: number;
};

type EncodedRendition = CommunityThemeImageRendition & {
  contents: Buffer;
};

function renditionLimit(width: number) {
  const rendition = communityThemePolicy.image.renditions.find(
    (candidate) => candidate.width >= width
  );
  const largestRendition = communityThemePolicy.image.renditions.at(-1);
  if (!largestRendition) throw new Error("Community theme image policy has no renditions");
  return rendition?.maximumBytes ?? largestRendition.maximumBytes;
}

async function encodeRendition(source: Uint8Array, width: number, filename: string) {
  const maximumBytes = renditionLimit(width);

  for (let quality = 80; quality >= 50; quality -= 5) {
    const output = await sharp(source, {
      failOn: "warning",
      limitInputPixels: communityThemePolicy.image.maximumDecodedPixels,
    })
      .autoOrient()
      .resize({ width, withoutEnlargement: true })
      .webp({ effort: 5, quality, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });

    if (output.data.byteLength <= maximumBytes) {
      return {
        bytes: output.data.byteLength,
        contents: output.data,
        height: output.info.height,
        path: filename,
        sha256: sha256Hex(output.data),
        width: output.info.width,
      } satisfies EncodedRendition;
    }
  }

  throw new Error(`${filename} cannot fit within its ${maximumBytes}-byte rendition limit`);
}

export async function encodeCommunityThemeImage(
  source: Uint8Array,
  slug: string,
  publicDirectory = "/assets/themes/community"
) {
  assertMaximumBytes(
    source.byteLength,
    communityThemePolicy.image.maximumSourceBytes,
    `${slug} preview`
  );

  const metadata = await sharp(source, {
    failOn: "warning",
    limitInputPixels: communityThemePolicy.image.maximumDecodedPixels,
  }).metadata();
  assertAllowedImageFormat(metadata.format);
  assertImageDimensions(metadata.width, metadata.height);
  if ((metadata.pages ?? 1) !== 1) throw new Error(`${slug} preview must not be animated`);

  const width = metadata.autoOrient.width;
  const height = metadata.autoOrient.height;
  assertImageDimensions(width, height);

  const sourceHash = sha256Hex(source);
  const hashPrefix = sourceHash.slice(0, 16);
  const renditions = await Promise.all(
    renditionWidths(width).map((renditionWidth) => {
      const filename = `${slug}-${hashPrefix}-${renditionWidth}.webp`;
      return encodeRendition(source, renditionWidth, `${publicDirectory}/${filename}`);
    })
  );
  const blur = await sharp(source, {
    failOn: "warning",
    limitInputPixels: communityThemePolicy.image.maximumDecodedPixels,
  })
    .autoOrient()
    .resize({ width: communityThemePolicy.image.blurWidth, withoutEnlargement: true })
    .webp({ effort: 4, quality: 40 })
    .toBuffer();

  return {
    encodedRenditions: renditions,
    image: {
      blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
      format: metadata.format,
      height,
      renditions: renditions.map(({ contents: _contents, ...rendition }) => rendition),
      sha256: sourceHash,
      sourceBytes: source.byteLength,
      width,
    } satisfies CommunityThemeImage,
  };
}
