import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";

import sharp from "sharp";

import { getOfficialThemeWallpaper, omarchyThemes } from "./official";

const root = resolve(import.meta.dirname, "../..");

test("official wallpapers have one WebP each, capped at 1536px", async () => {
  const files = await readdir(resolve(root, "assets/theme-wallpapers"));
  assert.deepEqual(files.toSorted(), omarchyThemes.map(({ id }) => `${id}.webp`).toSorted());
  for (const theme of omarchyThemes) {
    const source = getOfficialThemeWallpaper(theme.id);
    const metadata = await sharp(resolve(root, source)).metadata();
    assert.equal(metadata.format, "webp");
    assert.ok(metadata.width && metadata.width <= 1536);
    assert.equal(metadata.pages ?? 1, 1);
  }
});
