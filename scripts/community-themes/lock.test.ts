import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { isJsonArray, parseJsonObject } from "../../lib/json";
import { parseCommunityThemeLock } from "./lock";

const lockFilename = resolve(import.meta.dirname, "../../content/community-themes.lock.json");

test("reads the generated community-theme lock", async () => {
  const lock = parseCommunityThemeLock(JSON.parse(await readFile(lockFilename, "utf-8")));
  assert.ok(lock.themes.length > 0);
});

test("rejects a lock whose cached rendition metadata is unsafe to reuse", async () => {
  const payload = parseJsonObject(JSON.parse(await readFile(lockFilename, "utf-8")));
  assert.ok(payload);
  assert.ok(isJsonArray(payload.themes));
  const firstTheme = parseJsonObject(payload.themes[0]);
  assert.ok(firstTheme);
  const renditions = firstTheme.imageRenditions;
  assert.ok(isJsonArray(renditions));
  const firstRendition = parseJsonObject(renditions[0]);
  assert.ok(firstRendition);

  const corrupted = {
    ...payload,
    themes: [
      {
        ...firstTheme,
        imageRenditions: [{ ...firstRendition, sha256: "not-a-digest" }, ...renditions.slice(1)],
      },
      ...payload.themes.slice(1),
    ],
  };

  assert.throws(() => parseCommunityThemeLock(corrupted), /invalid image rendition/u);
});
