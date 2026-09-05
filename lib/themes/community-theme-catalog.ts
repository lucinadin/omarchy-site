import { isJsonArray, parseJsonObject, type JsonObject, type JsonValue } from "@/lib/json";
import {
  isCommunityThemeIdentity,
  parseThemeColors,
} from "@/lib/themes/community-theme-validation";
import type { OmarchyThemeOption, ThemeImageRendition, ThemePreview } from "@/lib/themes/themes";
import { isFiniteNumber } from "@/lib/validation";

const communityThemeSlugPattern = /^[a-z\d][a-z\d-]*$/u;

function isThemeImageRendition(
  value: JsonObject | null
): value is JsonObject & ThemeImageRendition {
  return (
    value !== null &&
    typeof value.path === "string" &&
    value.path.startsWith("/assets/themes/community/") &&
    isFiniteNumber(value.width) &&
    Number.isInteger(value.width) &&
    value.width > 0
  );
}

function hasCommunityThemeCatalogFields(value: JsonObject): value is JsonObject & {
  repository: string;
  slug: string;
  wallpaper: string;
} {
  return (
    typeof value.repository === "string" &&
    value.repository.startsWith("https://github.com/") &&
    typeof value.slug === "string" &&
    communityThemeSlugPattern.test(value.slug) &&
    typeof value.wallpaper === "string"
  );
}

function isCommunityThemePreview(
  value: JsonObject
): value is JsonObject & Required<Pick<ThemePreview, "blurDataURL" | "image">> {
  return (
    typeof value.blurDataURL === "string" &&
    value.blurDataURL.startsWith("data:image/webp;base64,") &&
    typeof value.image === "string" &&
    value.image.startsWith("/assets/themes/")
  );
}

function parseRenditions(value: JsonValue | undefined): readonly ThemeImageRendition[] | null {
  if (!isJsonArray(value) || value.length === 0) return null;

  const renditions: ThemeImageRendition[] = [];
  for (const candidate of value) {
    const rendition = parseJsonObject(candidate);
    if (!isThemeImageRendition(rendition)) return null;
    renditions.push({ path: rendition.path, width: rendition.width });
  }

  return renditions;
}

function parseCommunityThemeOption(value: JsonValue): OmarchyThemeOption | null {
  const theme = parseJsonObject(value);
  if (theme === null) return null;

  const colors = parseThemeColors(theme.colors);
  const preview = parseJsonObject(theme.preview);
  const renditions = preview ? parseRenditions(preview.renditions) : null;
  if (
    !isCommunityThemeIdentity(theme) ||
    !hasCommunityThemeCatalogFields(theme) ||
    colors === null ||
    preview === null ||
    !isCommunityThemePreview(preview) ||
    renditions === null ||
    theme.id !== `community:${theme.slug}` ||
    theme.wallpaper !== `linear-gradient(${colors.background}, ${colors.background})`
  ) {
    return null;
  }

  return {
    colors,
    id: theme.id,
    kind: "community",
    mode: theme.mode,
    name: theme.name,
    preview: {
      blurDataURL: preview.blurDataURL,
      image: preview.image,
      renditions,
    },
    repository: theme.repository,
    slug: theme.slug,
    wallpaper: theme.wallpaper,
  };
}

export function parseCommunityThemeCatalog(value: JsonValue): readonly OmarchyThemeOption[] | null {
  const payload = parseJsonObject(value);
  if (payload === null || payload.version !== 1 || !isJsonArray(payload.themes)) return null;

  const themes: OmarchyThemeOption[] = [];
  for (const candidate of payload.themes) {
    const theme = parseCommunityThemeOption(candidate);
    if (theme === null) return null;
    themes.push(theme);
  }

  return themes.length > 0 ? themes : null;
}
