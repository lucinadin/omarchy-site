import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parseGitHubRepository } from "./policy";

export type CuratedCommunityTheme = {
  image: string;
  name: string;
  repository: string;
};

const themeFigurePattern =
  /<figure\s+class="themes__theme">\s*<a\s+href="([^"]+)"><img\s+src="([^"]+)"[^>]*><\/a>\s*<figcaption><a\s+href="[^"]+">([^<]+)<\/a><\/figcaption>\s*<\/figure>/gu;
const imagePathPattern = /^\/assets\/themes\/[a-z\d][a-z\d-]*\.webp$/u;

function decodeHtmlText(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export function parseCuratedCommunityThemes(source: string) {
  const themes: CuratedCommunityTheme[] = [];
  const names = new Set<string>();
  const images = new Set<string>();
  const repositories = new Set<string>();

  for (const match of source.matchAll(themeFigurePattern)) {
    const repository = parseGitHubRepository(decodeHtmlText(match[1])).repository;
    const image = decodeHtmlText(match[2]);
    const name = decodeHtmlText(match[3]).trim();

    if (!imagePathPattern.test(image)) {
      throw new Error(`Curated theme ${name} has an unsafe image path: ${image}`);
    }
    if (!name) throw new Error(`Curated theme at ${repository} has no name`);
    if (names.has(name)) throw new Error(`Curated theme name is duplicated: ${name}`);
    if (images.has(image)) throw new Error(`Curated theme image is duplicated: ${image}`);
    if (repositories.has(repository.toLowerCase())) {
      throw new Error(`Curated theme repository is duplicated: ${repository}`);
    }

    names.add(name);
    images.add(image);
    repositories.add(repository.toLowerCase());
    themes.push({ image, name, repository });
  }

  if (themes.length === 0) throw new Error("The pinned upstream source contains no curated themes");
  return themes;
}

export async function readPinnedCuratedCommunityThemes() {
  const filename = resolve(process.cwd(), ".repos/omarchy-site-upstream/themes/index.html");
  return parseCuratedCommunityThemes(await readFile(filename, "utf-8"));
}
