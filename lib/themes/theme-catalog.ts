import "server-only";
import { communityThemes, type CommunityTheme } from "@/content/community-themes";
import { omarchyThemes } from "@/lib/themes/official";
import type { ThemeShareReference } from "@/lib/themes/theme-sharing";
import type { OmarchyTheme } from "@/lib/themes/themes";

type ShareableTheme =
  | {
      image: string;
      kind: "community";
      name: string;
      repository: string;
      slug: string;
      theme: CommunityTheme;
    }
  | {
      image: string;
      kind: "official";
      name: string;
      repository: string;
      slug: string;
      theme: OmarchyTheme;
    };

export function getShareableTheme(reference: ThemeShareReference): ShareableTheme | null {
  if (reference.kind === "official") {
    const theme = omarchyThemes.find((candidate) => candidate.id === reference.slug);
    return theme
      ? {
          image: theme.preview.image,
          kind: "official",
          name: theme.name,
          repository: theme.repository,
          slug: theme.id,
          theme,
        }
      : null;
  }

  const theme = communityThemes.find((candidate) => candidate.slug === reference.slug);
  return theme
    ? {
        image: theme.image,
        kind: "community",
        name: theme.name,
        repository: theme.repository,
        slug: reference.slug,
        theme,
      }
    : null;
}

export function getThemeOpenGraphStaticParams() {
  return [
    ...omarchyThemes.map((theme) => ({ kind: "official" as const, slug: theme.id })),
    ...communityThemes.map((theme) => ({
      kind: "community" as const,
      slug: theme.slug,
    })),
  ];
}
