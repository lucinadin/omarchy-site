import type { CommunityTheme } from "@/content/community-themes";
import type { OmarchyThemeOption, ThemeKind, ThemeMode, ThemePreview } from "@/lib/themes/themes";

type ThemePreviewItemBase = {
  id: string;
  preview: ThemePreview;
  kind: ThemeKind;
  name: string;
  repository: string;
  slug: string;
};

export type InstallThemePreview = ThemePreviewItemBase & {
  availability: "install";
  kind: "community";
  mode?: never;
};

export type ReadyThemePreview = ThemePreviewItemBase & {
  availability: "ready";
  mode: ThemeMode;
};

export type ThemePreviewItem = InstallThemePreview | ReadyThemePreview;

export function createOfficialThemePreview(theme: OmarchyThemeOption): ThemePreviewItem {
  return {
    availability: "ready",
    id: theme.id,
    preview: theme.preview,
    kind: "official",
    mode: theme.mode,
    name: theme.name,
    repository: theme.repository,
    slug: theme.slug,
  };
}

export function createCommunityThemePreview(theme: CommunityTheme): ThemePreviewItem {
  const base = {
    id: `community:${theme.slug}`,
    preview: { image: theme.image } satisfies ThemePreview,
    kind: "community" as const,
    name: theme.name,
    repository: theme.repository,
    slug: theme.slug,
  };

  if (theme.verification === "pending") {
    return { ...base, availability: "install" };
  }

  return {
    ...base,
    availability: "ready",
    mode: theme.palette.mode,
    preview: {
      blurDataURL: theme.blurDataURL,
      height: theme.imageHeight,
      image: theme.image,
      renditions: theme.imageRenditions.map(({ path, width }) => ({ path, width })),
      width: theme.imageWidth,
    },
  };
}
