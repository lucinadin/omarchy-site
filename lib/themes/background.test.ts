import assert from "node:assert/strict";
import { test } from "node:test";

import {
  automaticBackground,
  backgroundPreferenceKey,
  parseBackgroundPreference,
  resolveBackground,
  type BackgroundPreference,
} from "@/lib/themes/background";
import { getThemeBootstrapScript } from "@/lib/themes/theme-bootstrap";
import { themePreferenceKey } from "@/lib/themes/theme-constants";

test("backgrounds follow the theme only while automatic", () => {
  assert.deepEqual(resolveBackground(automaticBackground, "nord"), {
    kind: "wallpaper",
    themeId: "nord",
  });
  assert.deepEqual(resolveBackground(automaticBackground, "tokyo-night"), {
    kind: "wallpaper",
    themeId: "tokyo-night",
  });
  assert.equal(resolveBackground(automaticBackground, "community:aura"), null);
  const pinned: BackgroundPreference = { kind: "wallpaper", themeId: "nord" };
  for (const theme of ["tokyo-night", "community:aura", "white"]) {
    assert.deepEqual(resolveBackground(pinned, theme), pinned);
  }
  const solid: BackgroundPreference = { kind: "solid", color: "#123456" };
  assert.deepEqual(resolveBackground(solid, "white"), solid);
  assert.deepEqual(resolveBackground(solid, "community:aura"), solid);
  assert.deepEqual(resolveBackground({ kind: "experiment" }, "white"), { kind: "experiment" });
  assert.deepEqual(resolveBackground({ kind: "experiment" }, "community:aura"), {
    kind: "experiment",
  });
});

test("background storage accepts only known wallpapers and six-digit colors", () => {
  for (const value of [
    null,
    "",
    "broken",
    "null",
    "{}",
    '{"kind":"wallpaper","themeId":"missing"}',
    '{"kind":"solid","color":"url(https://example.com)"}',
  ]) {
    assert.deepEqual(parseBackgroundPreference(value), automaticBackground);
  }
  for (const value of [
    automaticBackground,
    { kind: "wallpaper", themeId: "nord" },
    { kind: "solid", color: "#123456" },
    { kind: "experiment" },
  ]) {
    assert.deepEqual(parseBackgroundPreference(JSON.stringify(value)), value);
  }
});

test("the inline bootstrap sets background styles and inserts only the selected image preload", () => {
  const wallpapers = {
    "tokyo-night": { src: "/tokyo.webp", blurDataURL: "data:image/webp;base64,tokyo" },
    nord: { src: "/nord.webp", blurDataURL: "data:image/webp;base64,nord" },
  };
  for (const { saved, expectedImage, expectedBlur } of [
    {
      saved: '{"kind":"experiment"}',
      expectedImage: undefined,
      expectedBlur: "linear-gradient(#1a1b26,#1a1b26)",
    },
    {
      saved: '{"kind":"wallpaper","themeId":"nord"}',
      expectedImage: "/nord.webp",
      expectedBlur: 'url("data:image/webp;base64,nord")',
    },
    {
      saved: '{"kind":"solid","color":"#123456"}',
      expectedImage: undefined,
      expectedBlur: "linear-gradient(#123456,#123456)",
    },
    {
      saved: '{"kind":"automatic"}',
      expectedImage: "/tokyo.webp",
      expectedBlur: 'url("data:image/webp;base64,tokyo")',
    },
    {
      saved: '{"kind":"wallpaper","themeId":"missing"}',
      expectedImage: "/tokyo.webp",
      expectedBlur: 'url("data:image/webp;base64,tokyo")',
    },
  ]) {
    const properties = new Map<string, string>();
    const links: { href?: string }[] = [];
    // The shipped bootstrap is an inline script; execute that exact output.
    // oxlint-disable-next-line no-new-func
    const bootstrap = new Function("window", "document", getThemeBootstrapScript(wallpapers));
    bootstrap(
      {
        location: { pathname: "/" },
        localStorage: {
          getItem: (key: string) =>
            key === backgroundPreferenceKey
              ? saved
              : key === themePreferenceKey
                ? "tokyo-night"
                : null,
        },
      },
      {
        documentElement: {
          dataset: {},
          style: { setProperty: (name: string, value: string) => properties.set(name, value) },
        },
        createElement() {
          const link = { href: "", setAttribute() {} };
          return link;
        },
        head: {
          append(link: (typeof links)[number]) {
            links.push(link);
          },
        },
        querySelector() {
          return null;
        },
      }
    );
    assert.equal(links[0]?.href, expectedImage);
    assert.equal(links.length, expectedImage ? 1 : 0);
    assert.equal(properties.get("--wallpaper-blur"), expectedBlur);
  }
});
