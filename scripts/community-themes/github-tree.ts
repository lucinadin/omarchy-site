import { basename, dirname, normalize } from "node:path/posix";

import { isJsonArray, parseJsonObject, type JsonObject, type JsonValue } from "../../lib/json";
import type { GitHubRootFile, GitHubThemeSource, GitHubThemeSourcePaths } from "./github";
import type { GitHubRepositoryCoordinates } from "./policy";
import { assertMaximumBytes, communityThemePolicy } from "./policy";

type GitHubTreeBlob = JsonObject & {
  mode: string;
  path: string;
  sha: string;
  size: number;
  type: "blob";
};

type GitHubTreeResponse = JsonObject & {
  tree: readonly JsonValue[];
  truncated: boolean;
};

const maximumTreeResponseBytes = 5 * 1024 * 1024;
const maximumTreeEntries = 10_000;
const previewBasenames: readonly string[] = [
  "preview.avif",
  "preview.webp",
  "preview.png",
  "preview.jpg",
  "preview.jpeg",
  "screenshot.avif",
  "screenshot.webp",
  "screenshot.png",
  "screenshot.jpg",
  "screenshot.jpeg",
];

function safeTreePath(path: string) {
  if (path.startsWith("/") || path.includes("\\") || normalize(path) !== path) {
    throw new Error(`GitHub returned an unsafe tree path: ${path}`);
  }
  return path;
}

function assertGitHubTreeBlob(value: JsonObject): asserts value is GitHubTreeBlob {
  if (typeof value.mode !== "string" || !value.mode) {
    throw new Error("GitHub returned an invalid tree-file mode");
  }
  if (typeof value.path !== "string" || !value.path) {
    throw new Error("GitHub returned an invalid tree path");
  }
  if (typeof value.sha !== "string" || !value.sha) {
    throw new Error("GitHub returned an invalid tree-file object ID");
  }
  if (typeof value.size !== "number" || !Number.isSafeInteger(value.size) || value.size < 0) {
    throw new Error("GitHub returned an invalid tree-file size");
  }
}

function assertGitHubTreeResponse(value: JsonObject): asserts value is GitHubTreeResponse {
  if (typeof value.truncated !== "boolean" || value.truncated) {
    throw new Error("GitHub repository tree is truncated or invalid");
  }
  if (!isJsonArray(value.tree) || value.tree.length > maximumTreeEntries) {
    throw new Error("GitHub repository tree exceeds the entry limit");
  }
}

function isSymbolicLink(file: GitHubRootFile) {
  return file.mode === 0o120000;
}

function pathDepth(path: string) {
  return path.split("/").length;
}

function exactPath(files: readonly GitHubRootFile[], path: string, label: string) {
  const matches = files.filter((file) => file.name.toLowerCase() === path.toLowerCase());
  if (matches.length !== 1) throw new Error(`Expected exactly one ${label} at ${path}`);
  return matches[0];
}

function shallowestFile(files: readonly GitHubRootFile[], label: string) {
  const sorted = files.toSorted((left, right) => pathDepth(left.name) - pathDepth(right.name));
  const file = sorted[0];
  if (!file) throw new Error(`Repository has no ${label}`);
  if (sorted[1] && pathDepth(sorted[1].name) === pathDepth(file.name)) {
    throw new Error(`Repository has ambiguous ${label} files; add a source override`);
  }
  return file;
}

function previewScore(file: GitHubRootFile, colors: GitHubRootFile) {
  const filename = basename(file.name).toLowerCase();
  const nameRank = previewBasenames.indexOf(filename);
  const directoryRank = dirname(file.name) === dirname(colors.name) ? 0 : 100;
  return directoryRank + pathDepth(file.name) * 10 + nameRank;
}

function selectPreview(
  files: readonly GitHubRootFile[],
  colors: GitHubRootFile,
  override?: string
) {
  if (override) return exactPath(files, override, "preview");
  const candidates = files.filter((file) =>
    previewBasenames.some((candidate) => candidate === basename(file.name).toLowerCase())
  );
  const sorted = candidates.toSorted(
    (left, right) => previewScore(left, colors) - previewScore(right, colors)
  );
  const preview = sorted[0];
  if (!preview) throw new Error("Repository has no supported preview image");
  if (sorted[1] && previewScore(sorted[1], colors) === previewScore(preview, colors)) {
    throw new Error("Repository has ambiguous preview images; add a source override");
  }
  return preview;
}

export async function fetchGitHubRepositoryTree(
  coordinates: GitHubRepositoryCoordinates,
  treeSha: string,
  token: string
) {
  if (!/^[\da-f]{40}$/u.test(treeSha)) {
    throw new Error(`Invalid Git tree object ID: ${treeSha}`);
  }
  const response = await fetch(
    `https://api.github.com/repos/${coordinates.owner}/${coordinates.name}/git/trees/${treeSha}?recursive=1`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "omarchy-site-community-theme-build",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  const contents = new Uint8Array(await response.arrayBuffer());
  assertMaximumBytes(contents.byteLength, maximumTreeResponseBytes, "Git tree response");
  if (!response.ok) throw new Error(`GitHub tree request failed (${response.status})`);

  const payload = parseJsonObject(JSON.parse(new TextDecoder().decode(contents)));
  if (payload === null) {
    throw new Error("GitHub repository tree is truncated or invalid");
  }
  assertGitHubTreeResponse(payload);

  const files: GitHubRootFile[] = [];
  for (const value of payload.tree) {
    const entry = parseJsonObject(value);
    if (entry === null) {
      throw new Error("GitHub repository tree is truncated or invalid");
    }
    if (entry.type !== "blob") continue;
    assertGitHubTreeBlob(entry);
    files.push({
      bytes: entry.size,
      mode: Number.parseInt(entry.mode, 8),
      name: safeTreePath(entry.path),
      oid: entry.sha,
    });
  }
  return files;
}

export function selectGitHubThemeSourceFromTree(
  files: readonly GitHubRootFile[],
  paths?: GitHubThemeSourcePaths
) {
  const colors = paths?.colors
    ? exactPath(files, paths.colors, "palette")
    : shallowestFile(
        files.filter((file) => basename(file.name).toLowerCase() === "colors.toml"),
        "colors.toml"
      );
  const preview = selectPreview(files, colors, paths?.preview);
  if (isSymbolicLink(colors))
    throw new Error(`Palette must not be a symbolic link: ${colors.name}`);
  if (isSymbolicLink(preview))
    throw new Error(`Preview must not be a symbolic link: ${preview.name}`);
  assertMaximumBytes(
    colors.bytes,
    communityThemePolicy.colors.maximumBytes,
    `${colors.name} Git blob`
  );
  assertMaximumBytes(
    preview.bytes,
    communityThemePolicy.image.maximumSourceBytes,
    `${preview.name} Git blob`
  );
  return { colors, preview } satisfies GitHubThemeSource;
}
