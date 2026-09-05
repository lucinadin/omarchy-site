import { parseHexColor, type Rgb } from "@/lib/color";
import type { OmarchyTheme } from "@/lib/themes/themes";

type ThemeColorRole = keyof OmarchyTheme["colors"];
type ThemeColorProperty = `--${string}`;

export const LOGO_EFFECT_THEME_COLOR_PROPERTIES = {
  accent: "--primary",
  selection: "--selection",
  muted: "--muted",
  background: "--background",
  darkBackground: "--dark-background",
  darkerBackground: "--darker-background",
  lighterBackground: "--surface",
  foreground: "--foreground",
  darkForeground: "--dark-foreground",
  lightForeground: "--muted-foreground",
  brightForeground: "--bright-foreground",
  red: "--ansi-red",
  yellow: "--ansi-yellow",
  orange: "--ansi-orange",
  green: "--ansi-green",
  cyan: "--ansi-cyan",
  blue: "--ansi-blue",
  magenta: "--ansi-magenta",
  brown: "--ansi-brown",
  brightRed: "--ansi-bright-red",
  brightYellow: "--ansi-bright-yellow",
  brightGreen: "--ansi-bright-green",
  brightCyan: "--ansi-bright-cyan",
  brightBlue: "--ansi-bright-blue",
  brightMagenta: "--ansi-bright-magenta",
} as const satisfies Record<ThemeColorRole, ThemeColorProperty>;

export type LogoEffectThemeColorRole = keyof typeof LOGO_EFFECT_THEME_COLOR_PROPERTIES;

type LogoEffectThemeColorBinding = {
  fallback: Rgb;
  kind: "theme";
  role: LogoEffectThemeColorRole;
};

type LogoEffectLiteralColorBinding = {
  kind: "literal";
  reason: string;
  value: Rgb;
};

export type LogoEffectColorBinding = LogoEffectThemeColorBinding | LogoEffectLiteralColorBinding;

export type LogoEffectColorResolver = (binding: LogoEffectColorBinding) => Rgb;

export const resolveLogoEffectFallbackColor: LogoEffectColorResolver = (binding) =>
  binding.kind === "literal" ? binding.value : binding.fallback;

function isRgbChannel(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255;
}

function isRgb(value: unknown): value is Rgb {
  return Array.isArray(value) && value.length === 3 && value.every(isRgbChannel);
}

export function isLogoEffectThemeColorRole(value: unknown): value is LogoEffectThemeColorRole {
  return typeof value === "string" && Object.hasOwn(LOGO_EFFECT_THEME_COLOR_PROPERTIES, value);
}

export function isLogoEffectColorBinding(value: unknown): value is LogoEffectColorBinding {
  if (value === null || typeof value !== "object" || !("kind" in value)) return false;

  if (value.kind === "literal") {
    return (
      "reason" in value &&
      typeof value.reason === "string" &&
      value.reason.trim().length > 0 &&
      "value" in value &&
      isRgb(value.value)
    );
  }

  return (
    value.kind === "theme" &&
    "role" in value &&
    isLogoEffectThemeColorRole(value.role) &&
    "fallback" in value &&
    isRgb(value.fallback)
  );
}

export function literalLogoColor(value: Rgb, reason: string): LogoEffectLiteralColorBinding {
  if (reason.trim().length === 0) {
    throw new TypeError("Literal logo colors require a reason");
  }

  return { kind: "literal", reason, value };
}

export function themeLogoColor(
  role: LogoEffectThemeColorRole,
  fallback: Rgb
): LogoEffectThemeColorBinding {
  return { fallback, kind: "theme", role };
}

export function createLogoEffectColorResolver(source: Element): LogoEffectColorResolver {
  const style = getComputedStyle(source);

  return (binding) => {
    if (binding.kind === "literal") return binding.value;

    const property = LOGO_EFFECT_THEME_COLOR_PROPERTIES[binding.role];
    return parseHexColor(style.getPropertyValue(property).trim()) ?? binding.fallback;
  };
}
