import { parseCommunityThemeCatalog } from "@/lib/themes/community-theme-catalog";
import { omarchyThemes } from "@/lib/themes/official";
import { registerThemes } from "@/lib/themes/theme-runtime";
import type { OmarchyThemeOption } from "@/lib/themes/themes";

let communityOptions: Promise<readonly OmarchyThemeOption[]> | null = null;
let loadedCommunityOptions: readonly OmarchyThemeOption[] | null = null;

async function fetchCommunityOptions() {
  const response = await fetch("/assets/themes/community-theme-options.json");
  if (!response.ok) throw new Error(`Community theme catalog returned ${response.status}`);
  const themes = parseCommunityThemeCatalog(await response.json());
  if (!themes?.length) throw new Error("Community theme catalog has an unsupported format");
  registerThemes(themes);
  loadedCommunityOptions = themes;
  return themes;
}

export function getCommunityThemeOptions() {
  return loadedCommunityOptions;
}

export function loadCommunityThemeOptions() {
  communityOptions ??= fetchCommunityOptions().catch((error) => {
    communityOptions = null;
    throw error;
  });
  return communityOptions;
}

export async function loadThemeOption(id: string) {
  const official = omarchyThemes.find((theme) => theme.id === id);
  if (official) return official;
  const themes = await loadCommunityThemeOptions();
  const theme = themes.find((candidate) => candidate.id === id);
  if (!theme) throw new Error(`Theme ${id} is unavailable`);
  return theme;
}

/** One selection owner spans every gallery; cancelling does not discard the shared catalog fetch. */
export function createThemeSelection(loadOption = loadThemeOption) {
  let revision = 0;
  return {
    cancel() {
      revision += 1;
    },
    async select(id: string, apply: (theme: OmarchyThemeOption) => void, signal?: AbortSignal) {
      revision += 1;
      const request = revision;
      let theme: OmarchyThemeOption;
      try {
        theme = await loadOption(id);
      } catch (error) {
        if (request !== revision || signal?.aborted) return;
        throw error;
      }
      if (request === revision && !signal?.aborted) apply(theme);
    },
  };
}
