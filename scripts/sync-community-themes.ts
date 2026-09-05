import { readFile } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";

import {
  communityThemeSourceOverrides,
  manuallyListedCommunityThemes,
  type CommunityThemeSourceOverride,
} from "../content/community-theme-sources";
import type {
  CommunityTheme,
  CommunityThemeImageRendition,
  VerifiedCommunityTheme,
} from "../content/community-theme-types";
import {
  communityThemeGitHubToken,
  fetchGitHubBlob,
  inspectGitHubRepository,
  selectGitHubThemeSource,
  type GitHubRepositorySnapshot,
  type GitHubThemeSource,
} from "./community-themes/github";
import {
  fetchGitHubRepositoryTree,
  selectGitHubThemeSourceFromTree,
} from "./community-themes/github-tree";
import { encodeCommunityThemeImage } from "./community-themes/image";
import {
  type CommunityThemeLock,
  type CommunityThemeLockEntry,
  parseCommunityThemeLock,
} from "./community-themes/lock";
import { parseCommunityThemePalette } from "./community-themes/palette";
import { communityThemePolicy, parseGitHubRepository, sha256Hex } from "./community-themes/policy";
import {
  readPinnedCuratedCommunityThemes,
  type CuratedCommunityTheme,
} from "./community-themes/source-list";
import { fileExists, writeOrCheckFile } from "./write-file-if-changed";

type ThemeCandidate = CuratedCommunityTheme & {
  approvedCommit?: string;
  colors?: string;
  preview?: string;
  provenance: "manual" | "upstream";
  slug: string;
};

type PendingTheme = {
  name: string;
  reason: string;
  repository: string;
};

type ThemeSyncResult =
  | { entry: CommunityThemeLockEntry; status: "held" | "reused" | "updated" }
  | (PendingTheme & { status: "pending" });

const projectDirectory = process.cwd();
const lockFilename = resolve(projectDirectory, "content/community-themes.lock.json");
const pendingFilename = resolve(projectDirectory, "content/community-themes.pending.json");
const registryFilename = resolve(projectDirectory, "content/community-themes.generated.ts");
const switcherFilename = resolve(
  projectDirectory,
  "public/assets/themes/community-theme-options.json"
);
const renditionDirectory = resolve(projectDirectory, "public/assets/themes/community");
const renditionPublicPrefix = "/assets/themes/community/";
const quietPeriodMessage = "inside the 48-hour quiet period";

function assertCommit(value: string, label: string) {
  if (!/^[\da-f]{40}$/u.test(value))
    throw new Error(`${label} must be a full lowercase commit SHA`);
  return value;
}

function imageSlug(image: string) {
  const match = /^\/assets\/themes\/([a-z\d][a-z\d-]*)\.webp$/u.exec(image);
  if (!match) throw new Error(`Cannot derive a safe theme slug from ${image}`);
  return match[1];
}

function repositoryKey(repository: string) {
  return parseGitHubRepository(repository).repository.toLowerCase();
}

function findOverride(repository: string) {
  const key = repositoryKey(repository);
  return communityThemeSourceOverrides.find(
    (candidate) => repositoryKey(candidate.repository) === key
  );
}

function sourcePaths(override?: CommunityThemeSourceOverride) {
  return override ? { colors: override.colors, preview: override.preview } : undefined;
}

async function themeCandidates() {
  const curated = await readPinnedCuratedCommunityThemes();
  const candidates: ThemeCandidate[] = curated.map((theme) => {
    const override = findOverride(theme.repository);
    return {
      ...theme,
      approvedCommit: override?.approvedCommit,
      colors: override?.colors,
      preview: override?.preview,
      provenance: "upstream",
      slug: imageSlug(theme.image),
    };
  });

  for (const theme of manuallyListedCommunityThemes) {
    if (!/^[a-z\d][a-z\d-]*$/u.test(theme.slug)) {
      throw new Error(`Manual theme has an unsafe slug: ${theme.slug}`);
    }
    candidates.push({ ...theme, image: "", provenance: "manual" });
  }

  const keys = new Set<string>();
  const slugs = new Set<string>();
  for (const candidate of candidates) {
    const key = repositoryKey(candidate.repository);
    if (keys.has(key)) throw new Error(`Community theme repository is listed twice: ${key}`);
    if (slugs.has(candidate.slug))
      throw new Error(`Community theme slug is listed twice: ${candidate.slug}`);
    keys.add(key);
    slugs.add(candidate.slug);
    if (candidate.approvedCommit) {
      assertCommit(candidate.approvedCommit, `${candidate.name} approved commit`);
    }
  }

  for (const override of communityThemeSourceOverrides) {
    if (!keys.has(repositoryKey(override.repository))) {
      throw new Error(
        `Community theme source override has no matching theme: ${override.repository}`
      );
    }
  }
  return candidates;
}

async function readPreviousLock() {
  if (!(await fileExists(lockFilename)))
    return { themes: [], version: 1 } satisfies CommunityThemeLock;

  return parseCommunityThemeLock(JSON.parse(await readFile(lockFilename, "utf-8")));
}

function assertRepositoryIdentity(
  previous: CommunityThemeLockEntry | undefined,
  snapshot: GitHubRepositorySnapshot,
  candidate: ThemeCandidate
) {
  if (repositoryKey(snapshot.url) !== repositoryKey(candidate.repository)) {
    throw new Error(`${candidate.name} resolved to a different GitHub repository: ${snapshot.url}`);
  }
  if (snapshot.disabled) throw new Error(`${candidate.name} repository is disabled`);
  if (previous?.lock.repositoryId && previous.lock.repositoryId !== snapshot.repositoryId) {
    throw new Error(`${candidate.name} repository ID changed; manual review is required`);
  }
  if (previous?.lock.ownerId && previous.lock.ownerId !== snapshot.ownerId) {
    throw new Error(`${candidate.name} repository owner changed; manual review is required`);
  }
}

function publicAssetFilename(path: string) {
  if (
    !path.startsWith(renditionPublicPrefix) ||
    basename(path) !== path.slice(path.lastIndexOf("/") + 1)
  ) {
    throw new Error(`Generated theme image has an unsafe path: ${path}`);
  }
  const filename = resolve(projectDirectory, "public", path.slice(1));
  if (!filename.startsWith(`${renditionDirectory}${sep}`)) {
    throw new Error(`Generated theme image escapes its output directory: ${path}`);
  }
  return filename;
}

async function verifyRenditions(renditions: readonly CommunityThemeImageRendition[]) {
  if (renditions.length === 0) return false;

  for (const rendition of renditions) {
    const filename = publicAssetFilename(rendition.path);
    if (!(await fileExists(filename))) return false;
    const contents = await readFile(filename);
    if (contents.byteLength !== rendition.bytes || sha256Hex(contents) !== rendition.sha256) {
      return false;
    }
  }
  return true;
}

function canReuse(
  previous: CommunityThemeLockEntry | undefined,
  snapshot: GitHubRepositorySnapshot,
  source: GitHubThemeSource
) {
  return Boolean(
    previous &&
    previous.pinnedCommit === snapshot.commitSha &&
    previous.lock.colors.oid === source.colors.oid &&
    previous.lock.preview.oid === source.preview.oid
  );
}

function currentMetadata(
  previous: CommunityThemeLockEntry,
  snapshot: GitHubRepositorySnapshot,
  candidate: ThemeCandidate
) {
  return {
    ...previous,
    archived: snapshot.archived,
    committedAt: snapshot.committedAt,
    createdAt: snapshot.createdAt,
    defaultBranch: snapshot.defaultBranch,
    image: candidate.image || previous.image,
    name: candidate.name,
    owner: snapshot.ownerLogin,
    provenance: candidate.provenance,
    pushedAt: snapshot.pushedAt,
    repository: parseGitHubRepository(candidate.repository).repository,
    stars: snapshot.stars,
    slug: candidate.slug,
    updatedAt: snapshot.updatedAt,
    lock: {
      ...previous.lock,
      ownerId: snapshot.ownerId,
      repositoryId: snapshot.repositoryId,
      treeSha: snapshot.treeSha,
    },
  } satisfies CommunityThemeLockEntry;
}

async function writeEncodedRenditions(
  renditions: readonly (CommunityThemeImageRendition & { contents: Buffer })[],
  check: boolean
) {
  const statuses = await Promise.all(
    renditions.map((rendition) =>
      writeOrCheckFile(publicAssetFilename(rendition.path), rendition.contents, check)
    )
  );
  if (check && statuses.some((status) => status !== "unchanged")) {
    throw new Error("Generated community theme images are out of date");
  }
}

async function syncTheme(
  candidate: ThemeCandidate,
  previous: CommunityThemeLockEntry | undefined,
  token: string,
  check: boolean
) {
  const coordinates = parseGitHubRepository(candidate.repository);
  let snapshot: GitHubRepositorySnapshot;

  try {
    snapshot = await inspectGitHubRepository(
      coordinates,
      token,
      Date.now(),
      candidate.approvedCommit
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (reason.includes(quietPeriodMessage)) {
      if (previous && (await verifyRenditions(previous.imageRenditions))) {
        return { entry: previous, status: "held" } satisfies ThemeSyncResult;
      }
      return {
        name: candidate.name,
        reason,
        repository: candidate.repository,
        status: "pending",
      } satisfies ThemeSyncResult;
    }
    throw error;
  }

  assertRepositoryIdentity(previous, snapshot, candidate);
  let source: GitHubThemeSource;
  try {
    source = selectGitHubThemeSource(snapshot.files, sourcePaths(candidate));
  } catch {
    const tree = await fetchGitHubRepositoryTree(coordinates, snapshot.treeSha, token);
    source = selectGitHubThemeSourceFromTree(tree, sourcePaths(candidate));
  }
  if (
    previous &&
    canReuse(previous, snapshot, source) &&
    (await verifyRenditions(previous.imageRenditions))
  ) {
    return {
      entry: currentMetadata(previous, snapshot, candidate),
      status: "reused",
    } satisfies ThemeSyncResult;
  }

  const [colorsContents, previewContents] = await Promise.all([
    fetchGitHubBlob(
      coordinates,
      source.colors.oid,
      communityThemePolicy.colors.maximumBytes,
      token
    ),
    fetchGitHubBlob(
      coordinates,
      source.preview.oid,
      communityThemePolicy.image.maximumSourceBytes,
      token
    ),
  ]);
  const palette = parseCommunityThemePalette(colorsContents, `${candidate.name} colors.toml`);
  const encoded = await encodeCommunityThemeImage(previewContents, candidate.slug);
  await writeEncodedRenditions(encoded.encodedRenditions, check);
  const largestImage = encoded.image.renditions.at(-1);
  if (!largestImage) throw new Error(`${candidate.name} produced no responsive image renditions`);

  return {
    entry: {
      archived: snapshot.archived,
      blurDataURL: encoded.image.blurDataURL,
      committedAt: snapshot.committedAt,
      createdAt: snapshot.createdAt,
      defaultBranch: snapshot.defaultBranch,
      image: candidate.image || largestImage.path,
      imageHeight: encoded.image.height,
      imageRenditions: encoded.image.renditions,
      imageWidth: encoded.image.width,
      lock: {
        colors: {
          bytes: colorsContents.byteLength,
          oid: source.colors.oid,
          path: source.colors.name,
          sha256: sha256Hex(colorsContents),
        },
        ownerId: snapshot.ownerId,
        preview: {
          bytes: previewContents.byteLength,
          format: encoded.image.format,
          oid: source.preview.oid,
          path: source.preview.name,
          sha256: encoded.image.sha256,
        },
        repositoryId: snapshot.repositoryId,
        treeSha: snapshot.treeSha,
      },
      name: candidate.name,
      owner: snapshot.ownerLogin,
      palette,
      pinnedCommit: snapshot.commitSha,
      provenance: candidate.provenance,
      pushedAt: snapshot.pushedAt,
      repository: coordinates.repository,
      stars: snapshot.stars,
      slug: candidate.slug,
      updatedAt: snapshot.updatedAt,
      verification: "verified",
    },
    status: "updated",
  } satisfies ThemeSyncResult;
}

async function syncThemeSafely(
  candidate: ThemeCandidate,
  previous: CommunityThemeLockEntry | undefined,
  token: string,
  check: boolean
) {
  try {
    return await syncTheme(candidate, previous, token, check);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (/GitHub request failed \((?:401|403|429|5\d\d)\)/u.test(reason)) throw error;
    if (previous && (await verifyRenditions(previous.imageRenditions))) {
      return { entry: previous, status: "held" } satisfies ThemeSyncResult;
    }
    return {
      name: candidate.name,
      reason,
      repository: candidate.repository,
      status: "pending",
    } satisfies ThemeSyncResult;
  }
}

function publicTheme(entry: CommunityThemeLockEntry): VerifiedCommunityTheme {
  const { lock: _lock, ...theme } = entry;
  return theme;
}

function registrySource(
  entries: readonly CommunityThemeLockEntry[],
  pending: readonly PendingTheme[],
  candidates: readonly ThemeCandidate[]
) {
  const entriesByRepository = new Map(
    entries.map((entry) => [repositoryKey(entry.repository), entry])
  );
  const pendingByRepository = new Map(
    pending.map((theme) => [repositoryKey(theme.repository), theme])
  );
  const themes: CommunityTheme[] = [];

  for (const candidate of candidates) {
    const key = repositoryKey(candidate.repository);
    const entry = entriesByRepository.get(key);
    if (entry) {
      themes.push(publicTheme(entry));
      continue;
    }

    const pendingTheme = pendingByRepository.get(key);
    if (!pendingTheme) {
      throw new Error(`Community theme has no sync result: ${candidate.name}`);
    }
    if (!candidate.image) continue;

    themes.push({
      image: candidate.image,
      name: candidate.name,
      reason: pendingTheme.reason,
      repository: parseGitHubRepository(candidate.repository).repository,
      slug: candidate.slug,
      verification: "pending",
    });
  }

  return `// Generated by \`bun run sync:themes\`. Do not edit by hand.\nimport type { CommunityTheme } from "./community-theme-types";\n\nexport const communityThemes = ${JSON.stringify(themes, null, 2)} as const satisfies readonly CommunityTheme[];\n`;
}

function switcherSource(entries: readonly CommunityThemeLockEntry[]) {
  const themes = entries.map((entry) => {
    const { mode, ...colors } = entry.palette;
    const background = colors.background;

    return {
      colors,
      id: `community:${entry.slug}`,
      kind: "community",
      mode,
      name: entry.name,
      preview: {
        blurDataURL: entry.blurDataURL,
        image: entry.image,
        renditions: entry.imageRenditions.map(({ path, width }) => ({ path, width })),
      },
      repository: entry.repository,
      slug: entry.slug,
      wallpaper: `linear-gradient(${background}, ${background})`,
    };
  });

  return `${JSON.stringify({ themes, version: 1 }, null, 2)}\n`;
}

const check = process.argv.includes("--check");
const token = communityThemeGitHubToken();
const candidates = await themeCandidates();
const previousLock = await readPreviousLock();
const previousByRepository = new Map(
  previousLock.themes.map((theme) => [repositoryKey(theme.repository), theme])
);
const entries: CommunityThemeLockEntry[] = [];
const pending: PendingTheme[] = [];
const counts = { held: 0, reused: 0, updated: 0 };

for (let index = 0; index < candidates.length; index += 6) {
  const batch = candidates.slice(index, index + 6);
  const results = await Promise.all(
    batch.map((candidate) =>
      syncThemeSafely(
        candidate,
        previousByRepository.get(repositoryKey(candidate.repository)),
        token,
        check
      )
    )
  );

  for (const result of results) {
    if (result.status === "pending") {
      pending.push({
        name: result.name,
        reason: result.reason,
        repository: result.repository,
      });
      continue;
    }
    counts[result.status] += 1;
    entries.push(result.entry);
  }
}

const lock = { themes: entries, version: 1 } satisfies CommunityThemeLock;
const lockStatus = await writeOrCheckFile(
  lockFilename,
  Buffer.from(`${JSON.stringify(lock, null, 2)}\n`),
  check
);
const pendingStatus = await writeOrCheckFile(
  pendingFilename,
  Buffer.from(`${JSON.stringify({ themes: pending, version: 1 }, null, 2)}\n`),
  check
);
const registryStatus = await writeOrCheckFile(
  registryFilename,
  Buffer.from(registrySource(entries, pending, candidates)),
  check
);
const switcherStatus = await writeOrCheckFile(
  switcherFilename,
  Buffer.from(switcherSource(entries)),
  check
);
if (
  check &&
  (lockStatus !== "unchanged" ||
    pendingStatus !== "unchanged" ||
    registryStatus !== "unchanged" ||
    switcherStatus !== "unchanged")
) {
  throw new Error("Generated community theme data is out of date");
}

console.log(
  `Community themes: ${entries.length} ready (${counts.updated} updated, ${counts.reused} reused, ${counts.held} held), ${pending.length} pending`
);
for (const theme of pending) console.log(`Pending ${theme.name}: ${theme.reason}`);
