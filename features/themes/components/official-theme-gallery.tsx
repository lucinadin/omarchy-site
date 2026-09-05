import { ThemePreviewCollection } from "@/features/themes/components/theme-preview-collection";
import { createOfficialThemePreview } from "@/features/themes/theme-preview-model";
import { omarchyThemes } from "@/lib/themes/official";

const officialThemes = omarchyThemes.map(createOfficialThemePreview);

export function OfficialThemeGallery({ initialThemeKey }: { initialThemeKey?: string }) {
  return <ThemePreviewCollection initialThemeKey={initialThemeKey} themes={officialThemes} />;
}
