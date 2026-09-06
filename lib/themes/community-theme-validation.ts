import { parseJsonObject, type JsonObject, type JsonValue } from "@/lib/json";
import type { OmarchyTheme, ThemeColors } from "@/lib/themes/themes";

const communityThemeIdPattern = /^community:[a-z\d][a-z\d-]*$/u;
const hexColorPattern = /^#[\da-f]{6}$/u;

export function isCommunityThemeIdentity(
  value: JsonObject
): value is JsonObject & Pick<OmarchyTheme, "id" | "kind" | "mode" | "name"> {
  return (
    typeof value.id === "string" &&
    communityThemeIdPattern.test(value.id) &&
    value.kind === "community" &&
    (value.mode === "dark" || value.mode === "light") &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    value.name.length <= 128
  );
}

export function isHexColor(value: JsonValue | undefined): value is string {
  return typeof value === "string" && hexColorPattern.test(value);
}

/* oxlint-disable eslint/complexity -- Keeping the complete color contract visible here is
safer than rebuilding it from widened Object.keys/Object.fromEntries results. */
export function parseThemeColors(value: JsonValue | undefined): ThemeColors | null {
  const colors = parseJsonObject(value);
  if (
    colors === null ||
    !isHexColor(colors.accent) ||
    !isHexColor(colors.selection) ||
    !isHexColor(colors.muted) ||
    !isHexColor(colors.background) ||
    !isHexColor(colors.darkBackground) ||
    !isHexColor(colors.darkerBackground) ||
    !isHexColor(colors.lighterBackground) ||
    !isHexColor(colors.foreground) ||
    !isHexColor(colors.darkForeground) ||
    !isHexColor(colors.lightForeground) ||
    !isHexColor(colors.brightForeground) ||
    !isHexColor(colors.red) ||
    !isHexColor(colors.yellow) ||
    !isHexColor(colors.orange) ||
    !isHexColor(colors.green) ||
    !isHexColor(colors.cyan) ||
    !isHexColor(colors.blue) ||
    !isHexColor(colors.magenta) ||
    !isHexColor(colors.brown) ||
    !isHexColor(colors.brightRed) ||
    !isHexColor(colors.brightYellow) ||
    !isHexColor(colors.brightGreen) ||
    !isHexColor(colors.brightCyan) ||
    !isHexColor(colors.brightBlue) ||
    !isHexColor(colors.brightMagenta)
  ) {
    return null;
  }

  return {
    accent: colors.accent,
    selection: colors.selection,
    muted: colors.muted,
    background: colors.background,
    darkBackground: colors.darkBackground,
    darkerBackground: colors.darkerBackground,
    lighterBackground: colors.lighterBackground,
    foreground: colors.foreground,
    darkForeground: colors.darkForeground,
    lightForeground: colors.lightForeground,
    brightForeground: colors.brightForeground,
    red: colors.red,
    yellow: colors.yellow,
    orange: colors.orange,
    green: colors.green,
    cyan: colors.cyan,
    blue: colors.blue,
    magenta: colors.magenta,
    brown: colors.brown,
    brightRed: colors.brightRed,
    brightYellow: colors.brightYellow,
    brightGreen: colors.brightGreen,
    brightCyan: colors.brightCyan,
    brightBlue: colors.brightBlue,
    brightMagenta: colors.brightMagenta,
  };
}
/* oxlint-enable eslint/complexity */
