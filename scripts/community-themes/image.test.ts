import assert from "node:assert/strict";
import { test } from "node:test";

import sharp from "sharp";

import { encodeCommunityThemeImage } from "./image";

test("creates bounded responsive WebP renditions and a tiny blur", async () => {
  const source = await sharp({
    create: {
      background: { alpha: 1, b: 160, g: 80, r: 30 },
      channels: 4,
      height: 675,
      width: 1200,
    },
  })
    .png()
    .toBuffer();
  const output = await encodeCommunityThemeImage(source, "fixture");

  assert.equal(output.image.width, 1200);
  assert.equal(output.image.height, 675);
  assert.deepEqual(
    output.image.renditions.map((rendition) => rendition.width),
    [480, 768, 1200]
  );
  assert.ok(output.image.renditions.every((rendition) => rendition.path.endsWith(".webp")));
  assert.ok(output.image.blurDataURL.startsWith("data:image/webp;base64,"));
  assert.ok(output.image.blurDataURL.length < 300);
});

test("refuses unsupported and oversized image inputs", async () => {
  const oversized = await sharp({
    create: {
      background: "#000000",
      channels: 3,
      height: 1,
      width: 8193,
    },
  })
    .jpeg()
    .toBuffer();
  await assert.rejects(() => encodeCommunityThemeImage(oversized, "oversized"), /exceed 8192px/u);

  const animated = await sharp({
    create: {
      background: "#000000",
      channels: 3,
      height: 2,
      width: 1,
    },
  })
    .gif()
    .toBuffer();
  await assert.rejects(
    () => encodeCommunityThemeImage(animated, "animated"),
    /format is not allowed/u
  );
});
