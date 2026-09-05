import type {
  CommunityThemeImageRendition,
  CommunityThemePalette,
  VerifiedCommunityTheme,
} from "../../content/community-theme-types";
import { isJsonArray, parseJsonObject, type JsonObject, type JsonValue } from "../../lib/json";
import { parseThemeColors } from "../../lib/themes/community-theme-validation";
import { assertAllowedImageFormat, parseGitHubRepository } from "./policy";

type LockedBlob = {
  bytes: number;
  oid: string;
  path: string;
  sha256: string;
};

type LockedPreview = LockedBlob & {
  format: string;
};

export type CommunityThemeLockEntry = VerifiedCommunityTheme & {
  lock: {
    colors: LockedBlob;
    ownerId: string;
    preview: LockedPreview;
    repositoryId: string;
    treeSha: string;
  };
};

export type CommunityThemeLock = {
  themes: CommunityThemeLockEntry[];
  version: 1;
};

const commitPattern = /^[\da-f]{40}$/u;
const digestPattern = /^[\da-f]{64}$/u;
const slugPattern = /^[a-z\d][a-z\d-]*$/u;

function assertLockedBlob(
  value: JsonObject,
  label: string
): asserts value is JsonObject & LockedBlob {
  if (typeof value.bytes !== "number" || !Number.isSafeInteger(value.bytes) || value.bytes < 1) {
    throw new Error(`Community theme lock has invalid ${label} bytes`);
  }
  if (typeof value.oid !== "string" || !commitPattern.test(value.oid)) {
    throw new Error(`Community theme lock has an invalid ${label} object ID`);
  }
  if (
    typeof value.path !== "string" ||
    !value.path ||
    value.path.startsWith("/") ||
    value.path.includes("\\") ||
    value.path.split("/").includes("..")
  ) {
    throw new Error(`Community theme lock has an invalid ${label} path`);
  }
  if (typeof value.sha256 !== "string" || !digestPattern.test(value.sha256)) {
    throw new Error(`Community theme lock has an invalid ${label} digest`);
  }
}

function assertLockedPreview(value: JsonObject): asserts value is JsonObject & LockedPreview {
  assertLockedBlob(value, "preview");
  if (typeof value.format !== "string") {
    throw new TypeError("Community theme lock has an invalid preview format");
  }
  assertAllowedImageFormat(value.format);
}

function assertThemePalette(
  value: JsonObject
): asserts value is JsonObject & CommunityThemePalette {
  if (parseThemeColors(value) === null || (value.mode !== "dark" && value.mode !== "light")) {
    throw new Error("Community theme lock has an invalid palette");
  }
}

function assertImageRendition(
  value: JsonObject
): asserts value is JsonObject & CommunityThemeImageRendition {
  if (
    typeof value.bytes !== "number" ||
    !Number.isSafeInteger(value.bytes) ||
    value.bytes < 1 ||
    typeof value.height !== "number" ||
    !Number.isSafeInteger(value.height) ||
    value.height < 1 ||
    typeof value.path !== "string" ||
    !value.path.startsWith("/assets/themes/community/") ||
    !value.path.endsWith(".webp") ||
    typeof value.sha256 !== "string" ||
    !digestPattern.test(value.sha256) ||
    typeof value.width !== "number" ||
    !Number.isSafeInteger(value.width) ||
    value.width < 1
  ) {
    throw new Error("Community theme lock has an invalid image rendition");
  }
}

function assertImageRenditions(
  value: JsonValue | undefined
): asserts value is readonly (JsonObject & CommunityThemeImageRendition)[] {
  if (!isJsonArray(value) || value.length === 0) {
    throw new Error("Community theme lock has no image renditions");
  }

  let previousWidth = 0;
  for (const candidate of value) {
    const rendition = parseJsonObject(candidate);
    if (rendition === null) {
      throw new Error("Community theme lock has an invalid image rendition");
    }
    assertImageRendition(rendition);
    if (previousWidth >= rendition.width) {
      throw new Error("Community theme lock image renditions are not ordered by width");
    }
    previousWidth = rendition.width;
  }
}

/* oxlint-disable eslint/complexity -- This is the runtime proof for a generated lock entry;
splitting scalar fields into generic primitive helpers would hide the persisted contract. */
function assertLockEntry(
  entry: JsonObject,
  index: number
): asserts entry is JsonObject & CommunityThemeLockEntry {
  const lock = parseJsonObject(entry.lock);
  const colors = parseJsonObject(lock?.colors);
  const preview = parseJsonObject(lock?.preview);
  const palette = parseJsonObject(entry.palette);
  if (lock === null || colors === null || preview === null || palette === null) {
    throw new Error(`Community theme lock entry ${index + 1} has an invalid structure`);
  }

  assertLockedBlob(colors, "palette");
  assertLockedPreview(preview);
  assertThemePalette(palette);
  assertImageRenditions(entry.imageRenditions);

  if (typeof entry.archived !== "boolean") {
    throw new TypeError(`Community theme lock entry ${index + 1} has an invalid archived state`);
  }
  if (
    typeof entry.blurDataURL !== "string" ||
    !entry.blurDataURL.startsWith("data:image/webp;base64,")
  ) {
    throw new Error(`Community theme lock entry ${index + 1} has an invalid blur image`);
  }
  for (const [label, timestamp] of [
    ["commit", entry.committedAt],
    ["creation", entry.createdAt],
    ["push", entry.pushedAt],
    ["update", entry.updatedAt],
  ] as const) {
    if (typeof timestamp !== "string" || !Number.isFinite(Date.parse(timestamp))) {
      throw new TypeError(`Community theme lock entry ${index + 1} has an invalid ${label} date`);
    }
  }
  if (typeof entry.defaultBranch !== "string" || !entry.defaultBranch) {
    throw new Error(`Community theme lock entry ${index + 1} has an invalid default branch`);
  }
  if (
    typeof entry.image !== "string" ||
    !entry.image.startsWith("/assets/themes/") ||
    !entry.image.endsWith(".webp")
  ) {
    throw new Error(`Community theme lock entry ${index + 1} has an invalid image path`);
  }
  if (
    typeof entry.imageHeight !== "number" ||
    !Number.isSafeInteger(entry.imageHeight) ||
    entry.imageHeight < 1 ||
    typeof entry.imageWidth !== "number" ||
    !Number.isSafeInteger(entry.imageWidth) ||
    entry.imageWidth < 1
  ) {
    throw new Error(`Community theme lock entry ${index + 1} has invalid image dimensions`);
  }
  if (typeof lock.ownerId !== "string" || !lock.ownerId) {
    throw new Error(`Community theme lock entry ${index + 1} has an invalid owner ID`);
  }
  if (typeof lock.repositoryId !== "string" || !lock.repositoryId) {
    throw new Error(`Community theme lock entry ${index + 1} has an invalid repository ID`);
  }
  if (typeof lock.treeSha !== "string" || !commitPattern.test(lock.treeSha)) {
    throw new Error(`Community theme lock entry ${index + 1} has an invalid tree ID`);
  }
  if (typeof entry.name !== "string" || !entry.name || entry.name.length > 128) {
    throw new Error(`Community theme lock entry ${index + 1} has an invalid name`);
  }
  if (typeof entry.owner !== "string" || !entry.owner) {
    throw new Error(`Community theme lock entry ${index + 1} has an invalid owner`);
  }
  if (typeof entry.pinnedCommit !== "string" || !commitPattern.test(entry.pinnedCommit)) {
    throw new Error(`Community theme lock entry ${index + 1} has an invalid pinned commit`);
  }
  if (entry.provenance !== "manual" && entry.provenance !== "upstream") {
    throw new Error(`Community theme lock entry ${index + 1} has an invalid provenance`);
  }
  if (
    typeof entry.repository !== "string" ||
    parseGitHubRepository(entry.repository).repository !== entry.repository
  ) {
    throw new Error(`Community theme lock entry ${index + 1} has an invalid repository`);
  }
  if (typeof entry.slug !== "string" || !slugPattern.test(entry.slug)) {
    throw new Error(`Community theme lock entry ${index + 1} has an invalid slug`);
  }
  if (typeof entry.stars !== "number" || !Number.isSafeInteger(entry.stars) || entry.stars < 0) {
    throw new Error(`Community theme lock entry ${index + 1} has an invalid star count`);
  }
  if (entry.verification !== "verified") {
    throw new Error(`Community theme lock entry ${index + 1} is not verified`);
  }
}
/* oxlint-enable eslint/complexity */

export function parseCommunityThemeLock(value: JsonValue): CommunityThemeLock {
  const lock = parseJsonObject(value);
  if (lock === null || lock.version !== 1 || !isJsonArray(lock.themes)) {
    throw new Error("Community theme lock has an unsupported format");
  }
  const themes = lock.themes.map((candidate, index) => {
    const entry = parseJsonObject(candidate);
    if (entry === null) {
      throw new Error(`Community theme lock entry ${index + 1} has an invalid structure`);
    }
    assertLockEntry(entry, index);
    return entry;
  });
  return {
    themes,
    version: 1,
  };
}
