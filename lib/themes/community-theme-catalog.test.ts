import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

import { parseCommunityThemeCatalog } from "@/lib/themes/community-theme-catalog";

const fixture = {
  id: "community:fixture",
  kind: "community",
  slug: "fixture",
  name: "Fixture",
  mode: "dark",
  repository: "https://github.com/example/fixture",
  wallpaper: "linear-gradient(#102030, #102030)",
  colors: {
    accent: "#112233",
    selection: "#223344",
    muted: "#334455",
    background: "#102030",
    darkBackground: "#010203",
    darkerBackground: "#000001",
    lighterBackground: "#405060",
    foreground: "#ddeeff",
    darkForeground: "#aabbcc",
    lightForeground: "#ccddee",
    brightForeground: "#ffffff",
    red: "#cc0000",
    yellow: "#cccc00",
    orange: "#cc6600",
    green: "#00cc00",
    cyan: "#00cccc",
    blue: "#0000cc",
    magenta: "#cc00cc",
    brown: "#663300",
    brightRed: "#ff0000",
    brightYellow: "#ffff00",
    brightGreen: "#00ff00",
    brightCyan: "#00ffff",
    brightBlue: "#0000ff",
    brightMagenta: "#ff00ff",
  },
  preview: {
    image: "/assets/themes/community/fixture.webp",
    blurDataURL: "data:image/webp;base64,fixture",
    renditions: [{ path: "/assets/themes/community/fixture-480.webp", width: 480 }],
  },
};

describe("community theme catalog", () => {
  test("parses every generated switcher theme", async () => {
    const payload = JSON.parse(
      await readFile("public/assets/themes/community-theme-options.json", "utf-8")
    );
    const themes = parseCommunityThemeCatalog(payload);

    assert.ok(themes);
    assert.ok(themes.length > 0);
    assert.equal(themes.length, payload.themes.length, "No generated theme is silently dropped");
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

  test("preserves a complete independent catalog entry", () => {
    assert.deepEqual(parseCommunityThemeCatalog({ version: 1, themes: [fixture] }), [fixture]);
  });

  test("rejects malformed identities, colors, wallpapers and previews", () => {
    for (const candidate of [
      { ...fixture, id: "community:other" },
      { ...fixture, kind: "official" },
      { ...fixture, mode: "automatic" },
      { ...fixture, name: "" },
      { ...fixture, repository: "https://example.com/fixture" },
      { ...fixture, colors: { ...fixture.colors, accent: "url(https://example.com)" } },
      { ...fixture, colors: {} },
      { ...fixture, wallpaper: "linear-gradient(#ffffff, #ffffff)" },
      { ...fixture, preview: { ...fixture.preview, blurDataURL: "https://example.com/blur" } },
      { ...fixture, preview: { ...fixture.preview, image: "https://example.com/image" } },
      { ...fixture, preview: { ...fixture.preview, renditions: [] } },
      {
        ...fixture,
        preview: {
          ...fixture.preview,
          renditions: [{ path: "/assets/themes/community/fixture.webp", width: 0 }],
        },
      },
      {
        ...fixture,
        preview: {
          ...fixture.preview,
          renditions: [{ path: "/assets/themes/community/fixture.webp", width: 1.5 }],
        },
      },
      {
        ...fixture,
        preview: {
          ...fixture.preview,
          renditions: [{ path: "https://example.com/image", width: 480 }],
        },
      },
    ]) {
      assert.equal(parseCommunityThemeCatalog({ version: 1, themes: [fixture, candidate] }), null);
    }
    assert.equal(parseCommunityThemeCatalog({ version: 1, themes: [] }), null);
  });
});
