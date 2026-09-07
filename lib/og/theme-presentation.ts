import "server-only";
import { parseHexColor, relativeLuminance } from "@/lib/color";
import { renderPageOpenGraphImage } from "@/lib/og/page-image";
import { prepareThemeBackground } from "@/lib/og/theme-assets";
import { getShareableTheme } from "@/lib/themes/theme-catalog";
import type { ThemeShareReference } from "@/lib/themes/theme-sharing";

function luminance(color: string) {
  const channels = parseHexColor(color);
  if (!channels) return 0;
  return relativeLuminance(channels[0], channels[1], channels[2]);
}

function contrast(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].toSorted((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function mostReadable(background: string, candidates: readonly string[]) {
  return candidates.reduce((best, candidate) =>
    contrast(background, candidate) > contrast(background, best) ? candidate : best
  );
}

export async function renderThemeImage(reference: ThemeShareReference) {
  const sharedTheme = getShareableTheme(reference);
  if (!sharedTheme) throw new Error(`Unknown theme: ${reference.kind}/${reference.slug}`);

  const presentation = await prepareThemeBackground(sharedTheme.image);
  const colors =
    sharedTheme.kind === "official"
      ? sharedTheme.theme.colors
      : sharedTheme.theme.verification === "verified"
        ? sharedTheme.theme.palette
        : undefined;
  const mode =
    sharedTheme.kind === "official"
      ? sharedTheme.theme.mode
      : sharedTheme.theme.verification === "verified"
        ? sharedTheme.theme.palette.mode
        : presentation.mode;
  const background = mode === "light" ? "#ffffff" : "#000000";
  const fallbackForeground = mode === "light" ? "#08090d" : "#f7f7fb";
  const foreground = colors
    ? mostReadable(background, [
        colors.foreground,
        colors.brightForeground,
        colors.darkForeground,
        fallbackForeground,
      ])
    : fallbackForeground;
  let accent = colors
    ? mostReadable(background, [
        colors.accent,
        colors.blue,
        colors.cyan,
        colors.green,
        colors.magenta,
        colors.yellow,
      ])
    : fallbackForeground;

  if (contrast(background, accent) < 4.5) accent = foreground;

  return renderPageOpenGraphImage({
    layout: "theme",
    backgroundSource: presentation.backgroundSource,
    accent,
    background,
    foreground,
    eyebrow: sharedTheme.kind === "official" ? "OFFICIAL OMARCHY THEME" : "COMMUNITY OMARCHY THEME",
    footer: "OMARCHY.ORG/THEMES",
    mode,
    title: sharedTheme.name,
    palette: colors
      ? [
          ...new Set([
            colors.red,
            colors.yellow,
            colors.green,
            colors.cyan,
            colors.blue,
            colors.magenta,
            colors.foreground,
            colors.background,
          ]),
        ]
      : undefined,
  });
}
