import { communityThemes } from "@/content/community-themes";
import { CommunityThemeGrid } from "@/features/themes/components/community-theme-grid";
import { createCommunityThemePreview } from "@/features/themes/theme-preview-model";

const themes = communityThemes.map(createCommunityThemePreview);

export function CommunityThemeGallery({ initialThemeKey }: { initialThemeKey?: string }) {
  return <CommunityThemeGrid initialThemeKey={initialThemeKey} themes={themes} />;
}
