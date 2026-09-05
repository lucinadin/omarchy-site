import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

import { parseCommunityThemeCatalog } from "@/lib/themes/community-theme-catalog";

describe("community theme catalog", () => {
  test("parses every generated switcher theme", async () => {
    const payload = JSON.parse(
      await readFile("public/assets/themes/community-theme-options.json", "utf-8")
    );
    const themes = parseCommunityThemeCatalog(payload);

    assert.ok(themes);
    assert.equal(themes.length, 95);
    assert.ok(
      themes.every((theme) =>
        theme.preview.renditions?.every((rendition) =>
          rendition.path.startsWith("/assets/themes/community/")
        )
      )
    );
  });

  test("rejects unsupported catalog versions", () => {
    assert.equal(parseCommunityThemeCatalog({ themes: [], version: 2 }), null);
  });
});
