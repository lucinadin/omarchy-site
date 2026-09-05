import type { SearchEntry, SearchIndex, SearchMatch } from "@/features/discovery/types";

type CompiledTerm = {
  anywhere: RegExp;
  whole: RegExp;
};

type SearchPattern = {
  first: RegExp;
  phrase: string;
  terms: CompiledTerm[];
};

const previewLength = 150;
let indexPromise: Promise<SearchEntry[]> | undefined;

function isSearchEntry(value: unknown): value is SearchEntry {
  return (
    value !== null &&
    typeof value === "object" &&
    "kind" in value &&
    (value.kind === "application" ||
      value.kind === "manual" ||
      value.kind === "news" ||
      value.kind === "page" ||
      value.kind === "resource") &&
    "text" in value &&
    typeof value.text === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "url" in value &&
    typeof value.url === "string" &&
    (!("external" in value) ||
      value.external === undefined ||
      typeof value.external === "boolean") &&
    (!("parent" in value) || value.parent === undefined || typeof value.parent === "string")
  );
}

export function isSearchIndex(value: unknown): value is SearchIndex {
  return (
    value !== null &&
    typeof value === "object" &&
    "version" in value &&
    value.version === 1 &&
    "entries" in value &&
    Array.isArray(value.entries) &&
    value.entries.every(isSearchEntry)
  );
}

function matcher(source: string, flags: string) {
  return new RegExp(`(?<![\\p{L}\\p{N}])${source}`, flags);
}

function quoteTerm(term: string) {
  return [...term].map((character) => character.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("-?");
}

function compilePattern(query: string): SearchPattern | null {
  const sources = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}+#_-]+/u)
    .filter(Boolean)
    .map(quoteTerm);

  if (sources.length === 0) return null;

  return {
    first: matcher(`(?:${sources.join("|")})`, "iu"),
    phrase: query.toLowerCase(),
    terms: sources.map((source) => ({
      anywhere: matcher(source, "giu"),
      whole: matcher(`${source}(?![\\p{L}\\p{N}])`, "iu"),
    })),
  };
}

function occurrences(text: string, pattern: RegExp) {
  return text.match(pattern)?.length ?? 0;
}

function scoreEntry(entry: SearchEntry, pattern: SearchPattern) {
  let score = 0;

  for (const term of pattern.terms) {
    const titleHits = occurrences(entry.title, term.anywhere);
    const textHits = occurrences(entry.text, term.anywhere);

    if (titleHits === 0 && textHits === 0) return 0;

    score += titleHits * 30 + Math.min(textHits, 5) * 2;
    if (entry.parent) score += occurrences(entry.parent, term.anywhere) * 10;
    if (term.whole.test(entry.title)) score += 20;
  }

  if (
    pattern.terms.length > 1 &&
    `${entry.title} ${entry.parent ?? ""} ${entry.text}`.toLowerCase().includes(pattern.phrase)
  ) {
    score += 40;
  }

  return score;
}

function preview(text: string, pattern: SearchPattern) {
  if (!text) return "";

  const matchAt = text.search(pattern.first);
  const start = Math.max(0, matchAt - previewLength / 3);
  let snippet = text.slice(start, start + previewLength);

  if (start > 0) snippet = `…${snippet.replace(/^\S*\s/u, "")}`;
  if (start + previewLength < text.length) snippet = `${snippet.replace(/\s\S*$/u, "")}…`;

  return snippet;
}

export function findSearchMatches(
  entries: readonly SearchEntry[],
  query: string,
  limit = 12
): SearchMatch[] {
  const pattern = compilePattern(query.trim());
  if (!pattern) return [];

  const matches: SearchMatch[] = [];
  for (const entry of entries) {
    const score = scoreEntry(entry, pattern);
    if (score > 0) {
      matches.push({ entry, preview: preview(entry.text, pattern), score });
    }
  }

  const uniqueMatches = new Map<string, SearchMatch>();
  for (const match of matches) {
    const key = `${match.entry.title.toLowerCase()}\0${match.entry.url}`;
    const existing = uniqueMatches.get(key);
    if (
      !existing ||
      match.entry.kind === "application" ||
      (existing.entry.kind !== "application" && match.score > existing.score)
    ) {
      uniqueMatches.set(key, match);
    }
  }

  return [...uniqueMatches.values()]
    .toSorted(
      (left, right) => right.score - left.score || left.entry.url.localeCompare(right.entry.url)
    )
    .slice(0, limit);
}

export function loadSearchEntries() {
  indexPromise ??= fetch("/search-index.json")
    .then(async (response) => {
      if (!response.ok) throw new Error(`Search index returned ${response.status}`);

      const index: unknown = await response.json();
      if (!isSearchIndex(index)) {
        throw new Error("Search index has an unsupported format");
      }

      return index.entries;
    })
    .catch((cause: unknown) => {
      indexPromise = undefined;
      throw cause;
    });

  return indexPromise;
}
