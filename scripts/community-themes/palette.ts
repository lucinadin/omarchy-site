import type { CommunityThemePalette } from "../../content/community-theme-types";
import { communityThemePolicy, assertMaximumBytes } from "./policy";

const assignmentPattern = /^([a-z][a-z\d_]*)\s*=\s*"([^"\r\n]*)"\s*(?:#.*)?$/u;
const colorPattern = /^#[\dA-Fa-f]{6}$/u;
const colorKeys = [
  "accent",
  "selection",
  "muted",
  "background",
  "dark_background",
  "darker_background",
  "lighter_background",
  "foreground",
  "dark_foreground",
  "light_foreground",
  "bright_foreground",
  "red",
  "yellow",
  "orange",
  "green",
  "cyan",
  "blue",
  "magenta",
  "brown",
  "bright_red",
  "bright_yellow",
  "bright_green",
  "bright_cyan",
  "bright_blue",
  "bright_magenta",
] as const;

function requiredValue(values: ReadonlyMap<string, string>, key: string, filename: string) {
  const value = values.get(key);
  if (!value) throw new Error(`${filename} is missing required palette value: ${key}`);
  return value;
}

function requiredColor(values: ReadonlyMap<string, string>, key: string, filename: string) {
  const color = requiredValue(values, key, filename);
  if (!colorPattern.test(color)) {
    throw new Error(`${filename} has an invalid ${key} color: ${color}`);
  }
  return color.toLowerCase();
}

function normalizedColors(values: ReadonlyMap<string, string>, filename: string) {
  const colors = new Map<string, string>();

  function add(key: string, fallback?: string) {
    const color = values.get(key) ?? fallback;
    if (!color) throw new Error(`${filename} is missing required palette value: ${key}`);
    if (!colorPattern.test(color)) {
      throw new Error(`${filename} has an invalid ${key} color: ${color}`);
    }
    const normalized = color.toLowerCase();
    colors.set(key, normalized);
    return normalized;
  }

  const accent = add("accent");
  const background = add("background");
  const foreground = add("foreground");
  add("selection", accent);
  add("muted", foreground);
  const darkBackground = add("dark_background", background);
  add("darker_background", darkBackground);
  add("lighter_background", background);
  add("dark_foreground", foreground);
  add("light_foreground", foreground);
  add("bright_foreground", foreground);
  const red = add("red", accent);
  const yellow = add("yellow", accent);
  const orange = add("orange", accent);
  const green = add("green", accent);
  const cyan = add("cyan", accent);
  const blue = add("blue", accent);
  const magenta = add("magenta", accent);
  add("brown", orange);
  add("bright_red", red);
  add("bright_yellow", yellow);
  add("bright_green", green);
  add("bright_cyan", cyan);
  add("bright_blue", blue);
  add("bright_magenta", magenta);

  if (colors.size !== colorKeys.length) throw new Error(`${filename} palette is incomplete`);
  return colors;
}

function inferMode(background: string): "dark" | "light" {
  const red = Number.parseInt(background.slice(1, 3), 16);
  const green = Number.parseInt(background.slice(3, 5), 16);
  const blue = Number.parseInt(background.slice(5, 7), 16);
  return (red * 0.299 + green * 0.587 + blue * 0.114) / 255 > 0.55 ? "light" : "dark";
}

export function parseCommunityThemePalette(contents: Uint8Array, filename = "colors.toml") {
  assertMaximumBytes(contents.byteLength, communityThemePolicy.colors.maximumBytes, filename);

  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(contents);
  } catch {
    throw new Error(`${filename} is not valid UTF-8`);
  }

  const values = new Map<string, string>();
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  for (const [index, line] of lines.entries()) {
    if (new TextEncoder().encode(line).byteLength > communityThemePolicy.colors.maximumLineBytes) {
      throw new Error(`${filename} line ${index + 1} exceeds the line-size limit`);
    }

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = assignmentPattern.exec(trimmed);
    if (!match) throw new Error(`${filename} line ${index + 1} is not a supported assignment`);
    if (values.has(match[1])) throw new Error(`${filename} repeats palette value: ${match[1]}`);
    values.set(match[1], match[2]);
  }

  if (values.size > communityThemePolicy.colors.maximumEntries) {
    throw new Error(`${filename} has too many palette entries: ${values.size}`);
  }

  const colors = normalizedColors(values, filename);
  const suppliedMode = values.get("mode");
  if (suppliedMode && suppliedMode !== "dark" && suppliedMode !== "light") {
    throw new Error(`${filename} has an invalid mode: ${suppliedMode}`);
  }
  const mode: "dark" | "light" =
    suppliedMode === "dark" || suppliedMode === "light"
      ? suppliedMode
      : inferMode(requiredColor(colors, "background", filename));
  return {
    accent: requiredColor(colors, "accent", filename),
    background: requiredColor(colors, "background", filename),
    blue: requiredColor(colors, "blue", filename),
    brightBlue: requiredColor(colors, "bright_blue", filename),
    brightCyan: requiredColor(colors, "bright_cyan", filename),
    brightForeground: requiredColor(colors, "bright_foreground", filename),
    brightGreen: requiredColor(colors, "bright_green", filename),
    brightMagenta: requiredColor(colors, "bright_magenta", filename),
    brightRed: requiredColor(colors, "bright_red", filename),
    brightYellow: requiredColor(colors, "bright_yellow", filename),
    brown: requiredColor(colors, "brown", filename),
    cyan: requiredColor(colors, "cyan", filename),
    darkBackground: requiredColor(colors, "dark_background", filename),
    darkForeground: requiredColor(colors, "dark_foreground", filename),
    darkerBackground: requiredColor(colors, "darker_background", filename),
    foreground: requiredColor(colors, "foreground", filename),
    green: requiredColor(colors, "green", filename),
    lightForeground: requiredColor(colors, "light_foreground", filename),
    lighterBackground: requiredColor(colors, "lighter_background", filename),
    magenta: requiredColor(colors, "magenta", filename),
    mode,
    muted: requiredColor(colors, "muted", filename),
    orange: requiredColor(colors, "orange", filename),
    red: requiredColor(colors, "red", filename),
    selection: requiredColor(colors, "selection", filename),
    yellow: requiredColor(colors, "yellow", filename),
  } satisfies CommunityThemePalette;
}
