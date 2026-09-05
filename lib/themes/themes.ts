export type ThemeMode = "dark" | "light";
export type ThemeKind = "community" | "official";

export type ThemeColors = {
  accent: string;
  selection: string;
  muted: string;
  background: string;
  darkBackground: string;
  darkerBackground: string;
  lighterBackground: string;
  foreground: string;
  darkForeground: string;
  lightForeground: string;
  brightForeground: string;
  red: string;
  yellow: string;
  orange: string;
  green: string;
  cyan: string;
  blue: string;
  magenta: string;
  brown: string;
  brightRed: string;
  brightYellow: string;
  brightGreen: string;
  brightCyan: string;
  brightBlue: string;
  brightMagenta: string;
};

export type ThemeImageRendition = {
  path: string;
  width: number;
};

export type ThemePreview = {
  blurDataURL?: string;
  height?: number;
  image: string;
  renditions?: readonly ThemeImageRendition[];
  width?: number;
};

export type OmarchyTheme = {
  colors: ThemeColors;
  id: string;
  kind: ThemeKind;
  mode: ThemeMode;
  name: string;
  wallpaper: string;
};

export type OmarchyThemeOption = OmarchyTheme & {
  preview: ThemePreview;
  repository: string;
  slug: string;
};

export function getThemeStyle(themeValue: OmarchyTheme) {
  const { colors } = themeValue;
  const primaryForeground =
    themeValue.mode === "light" ? colors.background : colors.darkerBackground;

  return {
    "--desktop-wallpaper": themeValue.wallpaper,
    "--background": colors.background,
    "--dark-background": colors.darkBackground,
    "--darker-background": colors.darkerBackground,
    "--surface": colors.lighterBackground,
    "--surface-strong": colors.muted,
    "--foreground": colors.foreground,
    "--dark-foreground": colors.darkForeground,
    "--bright-foreground": colors.brightForeground,
    "--muted": colors.muted,
    "--muted-foreground": colors.lightForeground,
    "--primary": colors.accent,
    "--primary-foreground": primaryForeground,
    "--selection": colors.selection,
    "--border": `color-mix(in srgb, ${colors.foreground} 22%, ${colors.background})`,
    "--ring": colors.accent,
    "--link": colors.brightBlue,
    "--ansi-red": colors.red,
    "--ansi-yellow": colors.yellow,
    "--ansi-orange": colors.orange,
    "--ansi-green": colors.green,
    "--ansi-blue": colors.blue,
    "--ansi-magenta": colors.magenta,
    "--ansi-cyan": colors.cyan,
    "--ansi-brown": colors.brown,
    "--ansi-bright-red": colors.brightRed,
    "--ansi-bright-yellow": colors.brightYellow,
    "--ansi-bright-green": colors.brightGreen,
    "--ansi-bright-cyan": colors.brightCyan,
    "--ansi-bright-blue": colors.brightBlue,
    "--ansi-bright-magenta": colors.brightMagenta,
  } as const;
}
