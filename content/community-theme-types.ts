import type { ThemeColors, ThemeImageRendition, ThemeMode } from "@/lib/themes/themes";

export type CommunityThemePalette = ThemeColors & { mode: ThemeMode };

export type CommunityThemeImageRendition = ThemeImageRendition & {
  bytes: number;
  height: number;
  sha256: string;
};

type CommunityThemeBase = {
  image: string;
  name: string;
  repository: string;
  slug: string;
};

export type VerifiedCommunityTheme = CommunityThemeBase & {
  archived: boolean;
  blurDataURL: string;
  committedAt: string;
  createdAt: string;
  defaultBranch: string;
  imageHeight: number;
  imageRenditions: readonly CommunityThemeImageRendition[];
  imageWidth: number;
  owner: string;
  palette: CommunityThemePalette;
  pinnedCommit: string;
  provenance: "manual" | "upstream";
  pushedAt: string;
  stars: number;
  updatedAt: string;
  verification: "verified";
};

export type PendingCommunityTheme = CommunityThemeBase & {
  reason: string;
  verification: "pending";
};

export type CommunityTheme = PendingCommunityTheme | VerifiedCommunityTheme;
