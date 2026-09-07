import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import sharp from "sharp";

import { encodeCommunityThemeImage } from "./image";

test("creates bounded responsive WebP renditions and a tiny blur", async () => {
  const rightHalf = await sharp({
    create: { width: 600, height: 675, channels: 3, background: "#e02020" },
  })
    .png()
    .toBuffer();
  const source = await sharp({
    create: {
      background: { alpha: 1, b: 160, g: 80, r: 30 },
      channels: 4,
      height: 675,
      width: 1200,
    },
  })
    .composite([{ input: rightHalf, top: 0, left: 600 }])
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
  assert.equal(output.encodedRenditions.length, 3);
  for (const [index, rendition] of output.encodedRenditions.entries()) {
    const { data, info } = await sharp(rendition.contents)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const metadata = await sharp(rendition.contents).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(info.width, [480, 768, 1200][index]);
    assert.equal(info.height, [270, 432, 675][index]);
    assert.equal(rendition.bytes, rendition.contents.byteLength);
    assert.ok(rendition.bytes <= [32 * 1024, 64 * 1024, 128 * 1024][index]);
    assert.equal(rendition.sha256, createHash("sha256").update(rendition.contents).digest("hex"));
    assert.deepEqual(output.image.renditions[index], {
      bytes: rendition.contents.byteLength,
      height: info.height,
      path: rendition.path,
      sha256: createHash("sha256").update(rendition.contents).digest("hex"),
      width: info.width,
    });
    // Lossy compression may move channels slightly, but must preserve the input color.
    for (const [channel, expected] of [30, 80, 160].entries()) {
      assert.ok(Math.abs(data[channel] - expected) < 8);
    }
    const right = (Math.floor(info.height / 2) * info.width + info.width - 1) * info.channels;
    for (const [channel, expected] of [224, 32, 32].entries()) {
      assert.ok(
        Math.abs(data[right + channel] - expected) < 8,
        "Right-hand content survives resizing"
      );
    }
  }
  const blur = Buffer.from(output.image.blurDataURL.split(",")[1], "base64");
  const blurMetadata = await sharp(blur).metadata();
  assert.equal(blurMetadata.format, "webp");
  assert.equal(blurMetadata.width, 10);
  assert.equal(blurMetadata.height, 6);
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

  const gif = await sharp({
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
    () => encodeCommunityThemeImage(gif, "unsupported-gif"),
    /format is not allowed/u
  );
});
