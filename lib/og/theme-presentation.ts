import "server-only";
import { parseHexColor, relativeLuminance } from "@/lib/color";
import { prepareCommunityThemeBackground } from "@/lib/og/community-theme-assets";
import { renderThemeOpenGraphImage } from "@/lib/og/theme-image";
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

  if (sharedTheme.kind === "community") {
    const presentation = await prepareCommunityThemeBackground(sharedTheme.image);
    return renderThemeOpenGraphImage({
      ...presentation,
      background: "#08090d",
      foreground: "#f4f2fa",
      kind: sharedTheme.kind,
      name: sharedTheme.name,
    });
  }

  const { colors } = sharedTheme.theme;
  const foreground = mostReadable(colors.background, [
    colors.foreground,
    colors.brightForeground,
    colors.darkForeground,
    "#f7f7fb",
    "#08090d",
  ]);
  const accent = mostReadable(colors.background, [
    colors.accent,
    colors.blue,
    colors.cyan,
    colors.green,
    colors.magenta,
    colors.yellow,
  ]);

  return renderThemeOpenGraphImage({
    accent,
    background: colors.background,
    foreground,
    kind: sharedTheme.kind,
    name: sharedTheme.name,
    palette: [colors.red, colors.yellow, colors.green, colors.cyan, colors.blue, colors.magenta],
  });
}
