import assert from "node:assert/strict";
import { test } from "node:test";

import sharp from "sharp";

import { renderPageOpenGraphImage } from "@/lib/og/page-image";

test("theme OG overlays follow the mode and fade toward the right without a fallback strip", async () => {
  for (const mode of ["dark", "light"] as const) {
    const response = renderPageOpenGraphImage({
      layout: "theme",
      accent: "#ff0000",
      background: "#808080",
      foreground: "#ffffff",
      backgroundSource: null,
      mode,
      title: "Pending theme",
    });
    const { data, info } = await sharp(Buffer.from(await response.arrayBuffer()))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 1200);
    assert.equal(info.height, 630);
    const left = (200 * info.width + 9) * info.channels;
    const right = (200 * info.width + 1190) * info.channels;
    assert.equal(data[left], data[left + 1], "No colored fallback strip");
    assert.equal(data[left], data[left + 2], "No colored fallback strip");
    if (mode === "dark") {
      assert.ok(data[left] < 20);
      assert.ok(data[right] > data[left] + 60);
    } else {
      assert.ok(data[left] > 240);
      assert.ok(data[right] < data[left] - 60);
    }
  }
});

test("theme OG palette swatches retain their exact colors above either overlay", async () => {
  const palette = ["#f7768e", "#e0af68", "#9ece6a", "#7dcfff", "#7aa2f7", "#bb9af7"];
  const swatches = [
    [247, 118, 142],
    [224, 175, 104],
    [158, 206, 106],
    [125, 207, 255],
    [122, 162, 247],
    [187, 154, 247],
  ];
  for (const mode of ["dark", "light"] as const) {
    const response = renderPageOpenGraphImage({
      layout: "theme",
      accent: palette[0],
      background: "#808080",
      foreground: "#ffffff",
      backgroundSource: null,
      mode,
      title: "Verified theme",
      palette,
    });
    const { data, info } = await sharp(Buffer.from(await response.arrayBuffer()))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (const [index, expected] of swatches.entries()) {
      const y = Math.floor(((index + 0.5) * info.height) / palette.length);
      const offset = (y * info.width + 21) * info.channels;
      assert.deepEqual([...data.subarray(offset, offset + 3)], expected);
    }
  }
});

test("page OG cards preserve the advertised 2x size and scale the palette with the layout", async () => {
  const image = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#0000ff"/></svg>'
  ).toString("base64");
  const response = renderPageOpenGraphImage({
    layout: "theme",
    title: "Security credits",
    eyebrow: "OMARCHY",
    backgroundSource: `data:image/svg+xml;base64,${image}`,
    palette: ["#ff0000", "#0000ff"],
    scale: 2,
  });
  const { data, info } = await sharp(Buffer.from(await response.arrayBuffer()))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 2400);
  assert.equal(info.height, 1260);
  const offset = (300 * info.width + 42) * info.channels;
  assert.deepEqual([...data.subarray(offset, offset + 3)], [255, 0, 0]);
  const farCorner = (1250 * info.width + 2390) * info.channels;
  assert.ok(data[farCorner + 2] > 150, "The image fills the 2x canvas without clipping");
});

test("non-theme OG backgrounds use a uniform overlay", async () => {
  for (const layout of ["centered", "editorial"] as const) {
    const response = renderPageOpenGraphImage({
      layout,
      background: "#808080",
      backgroundSource: null,
      title: "Artists in Residence",
      eyebrow: "WE CAN FIX EVERYTHING.",
      footer: "OMARCHY.ORG",
    });
    const { data, info } = await sharp(Buffer.from(await response.arrayBuffer()))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const left = (600 * info.width + 30) * info.channels;
    const right = (600 * info.width + 1170) * info.channels;
    assert.deepEqual([...data.subarray(left, left + 3)], [...data.subarray(right, right + 3)]);
    assert.ok(data[left] > 35 && data[left] < 55, "Uniform 65% black overlay");
  }
});
