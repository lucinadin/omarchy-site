export type CommunityThemeSourceOverride = {
  approvedCommit?: string;
  colors?: string;
  preview?: string;
  repository: string;
};

export type ManuallyListedCommunityTheme = {
  approvedCommit: string;
  colors?: string;
  name: string;
  preview?: string;
  repository: string;
  slug: string;
};

// Add a source override only when a curated repository does not use the standard
// root-level colors.toml and preview image names. `approvedCommit` is required to
// accept a repository whose current commit has not yet been quiet for 48 hours.
export const communityThemeSourceOverrides: readonly CommunityThemeSourceOverride[] = [];

// Themes absent from the pinned upstream list require an explicit commit chosen
// during manual review. The sync still validates and hashes every fetched byte.
export const manuallyListedCommunityThemes: readonly ManuallyListedCommunityTheme[] = [];
