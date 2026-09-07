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
  assert.deepEqual(palette, {
    mode: "dark",
    accent: "#111111",
    selection: "#222222",
    muted: "#333333",
    background: "#444444",
    darkBackground: "#555555",
    darkerBackground: "#666666",
    lighterBackground: "#777777",
    foreground: "#888888",
    darkForeground: "#999999",
    lightForeground: "#aaaaaa",
    brightForeground: "#bbbbbb",
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
  });
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
  assert.equal(palette.accent, "#aa5500");
  assert.equal(palette.selection, "#aa5500");
  assert.equal(palette.darkBackground, "#101010");
  assert.equal(palette.brightBlue, "#aa5500");
  const light = parseCommunityThemePalette(
    new TextEncoder().encode('accent = "#aa5500"\nbackground = "#f0f0f0"\nforeground = "#101010"')
  );
  assert.equal(light.mode, "light");
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
