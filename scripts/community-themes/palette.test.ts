import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCommunityThemePalette } from "./palette";

const completePalette = `
mode = "dark"
accent = "#111111"
selection = "#222222"
muted = "#333333"
background = "#444444"
dark_background = "#555555"
darker_background = "#666666"
lighter_background = "#777777"
foreground = "#888888"
dark_foreground = "#999999"
light_foreground = "#AAAAAA"
bright_foreground = "#BBBBBB"
red = "#CC0000"
yellow = "#CCCC00"
orange = "#CC6600"
green = "#00CC00"
cyan = "#00CCCC"
blue = "#0000CC"
magenta = "#CC00CC"
brown = "#663300"
bright_red = "#FF0000"
bright_yellow = "#FFFF00"
bright_green = "#00FF00"
bright_cyan = "#00FFFF"
bright_blue = "#0000FF"
bright_magenta = "#FF00FF"
`;

test("parses and normalizes the complete Omarchy palette", () => {
  const palette = parseCommunityThemePalette(new TextEncoder().encode(completePalette));
  assert.equal(palette.mode, "dark");
  assert.equal(palette.background, "#444444");
  assert.equal(palette.brightForeground, "#bbbbbb");
});

test("normalizes older minimal palettes and infers their mode", () => {
  const palette = parseCommunityThemePalette(
    new TextEncoder().encode(`
accent = "#aa5500"
background = "#101010"
foreground = "#f0f0f0"
`)
  );

  assert.equal(palette.mode, "dark");
  assert.equal(palette.selection, palette.accent);
  assert.equal(palette.darkBackground, palette.background);
  assert.equal(palette.brightBlue, palette.accent);
});

test("refuses missing fields, unsafe colors, and unsupported TOML", () => {
  assert.throws(
    () =>
      parseCommunityThemePalette(
        new TextEncoder().encode(completePalette.replace(/accent.*\n/u, ""))
      ),
    /missing required palette value: accent/u
  );
  assert.throws(
    () =>
      parseCommunityThemePalette(
        new TextEncoder().encode(completePalette.replace("#111111", "url(javascript:bad)"))
      ),
    /invalid accent color/u
  );
  assert.throws(
    () => parseCommunityThemePalette(new TextEncoder().encode(`${completePalette}\n[extra]\n`)),
    /is not a supported assignment/u
  );
});
