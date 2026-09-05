import { createHash } from "node:crypto";

import { isJsonArray, parseJsonObject, type JsonObject, type JsonValue } from "../../lib/json";
import type { GitHubRepositoryCoordinates } from "./policy";
import { assertMaximumBytes, assertRepositoryIsQuiet, communityThemePolicy } from "./policy";

type GitHubRootFileEntry = JsonObject & {
  mode: number;
  name: string;
  object: JsonObject & { byteSize: number };
  oid: string;
  type: "blob";
};

type GitHubRepositoryResponse = JsonObject & {
  createdAt: string;
  defaultBranchRef: JsonObject & {
    name: string;
    target: JsonObject & {
      committedDate: string;
      oid: string;
      tree: JsonObject & {
        entries: readonly JsonValue[];
        oid: string;
      };
    };
  };
  id: string;
  isArchived: boolean;
  isDisabled: boolean;
  isEmpty: boolean;
  isPrivate: boolean;
  nameWithOwner: string;
  owner: JsonObject & {
    id: string;
    login: string;
    type: "Organization" | "User";
  };
  pushedAt: string;
  stargazerCount: number;
  updatedAt: string;
  url: string;
};

export type GitHubRootFile = {
  bytes: number;
  mode: number;
  name: string;
  oid: string;
};

export type GitHubRepositorySnapshot = {
  archived: boolean;
  committedAt: string;
  commitSha: string;
  createdAt: string;
  defaultBranch: string;
  disabled: boolean;
  files: readonly GitHubRootFile[];
  nameWithOwner: string;
  ownerId: string;
  ownerLogin: string;
  ownerType: "Organization" | "User";
  pushedAt: string;
  repositoryId: string;
  stars: number;
  treeSha: string;
  updatedAt: string;
  url: string;
};

export type GitHubThemeSource = {
  colors: GitHubRootFile;
  preview: GitHubRootFile;
};

export type GitHubThemeSourcePaths = {
  colors?: string;
  preview?: string;
};

const repositoryQuery = `
  query CommunityThemeRepository($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      createdAt
      defaultBranchRef {
        name
        target {
          ... on Commit {
            committedDate
            oid
            tree {
              entries {
                mode
                name
                object {
                  ... on Blob {
                    byteSize
                  }
                }
                oid
                type
              }
              oid
            }
          }
        }
      }
      id
      isArchived
      isDisabled
      isEmpty
      isPrivate
      nameWithOwner
      owner {
        id
        login
        ... on Organization { type: __typename }
        ... on User { type: __typename }
      }
      pushedAt
      stargazerCount
      updatedAt
      url
    }
  }
`;

function errorMessage(status: number, source: string) {
  const compact = source.replace(/\s+/gu, " ").trim().slice(0, 240);
  return compact
    ? `GitHub request failed (${status}): ${compact}`
    : `GitHub request failed (${status})`;
}

function assertIsoTimestamp(value: string, label: string) {
  if (!Number.isFinite(Date.parse(value))) throw new Error(`GitHub returned an invalid ${label}`);
  return value;
}

function assertGitHubRootFileEntry(value: JsonObject): asserts value is GitHubRootFileEntry {
  const object = parseJsonObject(value.object);
  if (
    object === null ||
    typeof object.byteSize !== "number" ||
    !Number.isSafeInteger(object.byteSize) ||
    object.byteSize < 0
  ) {
    throw new Error("GitHub returned an invalid root-file size");
  }
  if (typeof value.mode !== "number" || !Number.isSafeInteger(value.mode) || value.mode < 0) {
    throw new Error("GitHub returned an invalid root-file mode");
  }
  if (typeof value.name !== "string" || !value.name) {
    throw new Error("GitHub returned an invalid root-file name");
  }
  if (typeof value.oid !== "string" || !value.oid) {
    throw new Error("GitHub returned an invalid root-file object ID");
  }
}

/* oxlint-disable eslint/complexity -- This is the single runtime proof for the external
GraphQL response; splitting each primitive field back into helpers hides the contract. */
function assertGitHubRepositoryResponse(
  value: JsonObject,
  coordinates: GitHubRepositoryCoordinates
): asserts value is GitHubRepositoryResponse {
  const branch = parseJsonObject(value.defaultBranchRef);
  const commit = parseJsonObject(branch?.target);
  const tree = parseJsonObject(commit?.tree);
  if (branch === null || commit === null || tree === null || !isJsonArray(tree.entries)) {
    throw new Error(`GitHub returned no default-branch tree for ${coordinates.repository}`);
  }

  const owner = parseJsonObject(value.owner);
  if (owner === null) {
    throw new Error(`GitHub returned no owner for ${coordinates.repository}`);
  }

  if (typeof value.createdAt !== "string" || !value.createdAt) {
    throw new Error("GitHub returned an invalid repository creation date");
  }
  if (typeof branch.name !== "string" || !branch.name) {
    throw new Error("GitHub returned an invalid default branch");
  }
  if (typeof commit.committedDate !== "string" || !commit.committedDate) {
    throw new Error("GitHub returned an invalid commit date");
  }
  if (typeof commit.oid !== "string" || !commit.oid) {
    throw new Error("GitHub returned an invalid commit ID");
  }
  if (typeof tree.oid !== "string" || !tree.oid) {
    throw new Error("GitHub returned an invalid tree ID");
  }
  if (typeof value.id !== "string" || !value.id) {
    throw new Error("GitHub returned an invalid repository ID");
  }
  if (typeof value.isArchived !== "boolean") {
    throw new TypeError("GitHub returned an invalid repository archived state");
  }
  if (typeof value.isDisabled !== "boolean") {
    throw new TypeError("GitHub returned an invalid repository disabled state");
  }
  if (typeof value.isEmpty !== "boolean") {
    throw new TypeError("GitHub returned an invalid repository empty state");
  }
  if (typeof value.isPrivate !== "boolean") {
    throw new TypeError("GitHub returned an invalid repository visibility");
  }
  if (typeof value.nameWithOwner !== "string" || !value.nameWithOwner) {
    throw new Error("GitHub returned an invalid repository name");
  }
  if (typeof owner.id !== "string" || !owner.id) {
    throw new Error("GitHub returned an invalid owner ID");
  }
  if (typeof owner.login !== "string" || !owner.login) {
    throw new Error("GitHub returned an invalid owner login");
  }
  if (owner.type !== "Organization" && owner.type !== "User") {
    throw new Error(`GitHub returned an invalid owner type for ${coordinates.repository}`);
  }
  if (typeof value.pushedAt !== "string" || !value.pushedAt) {
    throw new Error("GitHub returned an invalid repository push date");
  }
  if (
    typeof value.stargazerCount !== "number" ||
    !Number.isSafeInteger(value.stargazerCount) ||
    value.stargazerCount < 0
  ) {
    throw new Error("GitHub returned an invalid stargazer count");
  }
  if (typeof value.updatedAt !== "string" || !value.updatedAt) {
    throw new Error("GitHub returned an invalid repository update date");
  }
  if (typeof value.url !== "string" || !value.url) {
    throw new Error("GitHub returned an invalid repository URL");
  }
}
/* oxlint-enable eslint/complexity */

function parseRepositoryResponse(
  payload: JsonObject | null,
  coordinates: GitHubRepositoryCoordinates
) {
  if (payload !== null && isJsonArray(payload.errors) && payload.errors.length > 0) {
    throw new Error(`GitHub could not inspect ${coordinates.repository}`);
  }

  const repository = parseJsonObject(parseJsonObject(payload?.data)?.repository);
  if (repository === null) {
    throw new Error(`GitHub repository is unavailable: ${coordinates.repository}`);
  }
  assertGitHubRepositoryResponse(repository, coordinates);

  if (repository.isPrivate) {
    throw new Error(`Community theme repository must be public: ${coordinates.repository}`);
  }
  if (repository.isEmpty) {
    throw new Error(`Community theme repository is empty: ${coordinates.repository}`);
  }

  const branch = repository.defaultBranchRef;
  const commit = branch.target;
  const tree = commit.tree;
  const owner = repository.owner;
  const files: GitHubRootFile[] = [];
  for (const value of tree.entries) {
    const entry = parseJsonObject(value);
    if (entry === null) {
      throw new Error(`GitHub returned no default-branch tree for ${coordinates.repository}`);
    }
    if (entry.type !== "blob") continue;
    assertGitHubRootFileEntry(entry);
    files.push({
      bytes: entry.object.byteSize,
      mode: entry.mode,
      name: entry.name,
      oid: entry.oid,
    });
  }

  return {
    archived: repository.isArchived,
    committedAt: assertIsoTimestamp(commit.committedDate, "commit date"),
    commitSha: commit.oid,
    createdAt: assertIsoTimestamp(repository.createdAt, "repository creation date"),
    defaultBranch: branch.name,
    disabled: repository.isDisabled,
    files,
    nameWithOwner: repository.nameWithOwner,
    ownerId: owner.id,
    ownerLogin: owner.login,
    ownerType: owner.type,
    pushedAt: assertIsoTimestamp(repository.pushedAt, "repository push date"),
    repositoryId: repository.id,
    stars: repository.stargazerCount,
    treeSha: tree.oid,
    updatedAt: assertIsoTimestamp(repository.updatedAt, "repository update date"),
    url: repository.url,
  } satisfies GitHubRepositorySnapshot;
}

export function communityThemeGitHubToken() {
  const token = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Community theme sync needs GITHUB_TOKEN (or GH_TOKEN); the deployed site never receives it"
    );
  }
  return token;
}

export async function inspectGitHubRepository(
  coordinates: GitHubRepositoryCoordinates,
  token: string,
  buildTimeMilliseconds = Date.now(),
  approvedCommit?: string
) {
  const response = await fetch("https://api.github.com/graphql", {
    body: JSON.stringify({
      query: repositoryQuery,
      variables: { name: coordinates.name, owner: coordinates.owner },
    }),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "omarchy-site-community-theme-build",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    method: "POST",
  });
  const source = await response.text();
  if (!response.ok) throw new Error(errorMessage(response.status, source));

  const payload = parseJsonObject(JSON.parse(source));
  const snapshot = parseRepositoryResponse(payload, coordinates);
  if (approvedCommit) {
    if (snapshot.commitSha !== approvedCommit) {
      throw new Error(
        `Approved commit does not match the current default branch for ${coordinates.repository}`
      );
    }
  } else {
    assertRepositoryIsQuiet(snapshot.pushedAt, snapshot.committedAt, buildTimeMilliseconds);
  }
  return snapshot;
}

function exactRootFile(files: readonly GitHubRootFile[], name: string, label: string) {
  const matches = files.filter((file) => file.name.toLowerCase() === name.toLowerCase());
  if (matches.length !== 1) throw new Error(`Expected exactly one ${label} named ${name}`);
  const file = matches[0];
  if (file.mode === 0o120000) throw new Error(`${label} must not be a symbolic link: ${file.name}`);
  return file;
}

export function selectGitHubThemeSource(
  files: readonly GitHubRootFile[],
  paths?: GitHubThemeSourcePaths
) {
  const colors = exactRootFile(files, paths?.colors ?? "colors.toml", "palette");
  const previewNames = paths?.preview
    ? [paths.preview]
    : ["preview.avif", "preview.webp", "preview.png", "preview.jpg", "preview.jpeg"];
  const preview = previewNames
    .map((name) => files.find((file) => file.name.toLowerCase() === name))
    .find((file) => file !== undefined);
  if (!preview) throw new Error("Repository has no supported root preview image");
  if (preview.mode === 0o120000)
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

function gitBlobOid(contents: Uint8Array) {
  return createHash("sha1").update(`blob ${contents.byteLength}\0`).update(contents).digest("hex");
}

export async function fetchGitHubBlob(
  coordinates: GitHubRepositoryCoordinates,
  oid: string,
  maximumBytes: number,
  token: string
) {
  if (!/^[\da-f]{40}$/u.test(oid)) throw new Error(`Invalid Git blob object ID: ${oid}`);

  const response = await fetch(
    `https://api.github.com/repos/${coordinates.owner}/${coordinates.name}/git/blobs/${oid}`,
    {
      headers: {
        Accept: "application/vnd.github.raw+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "omarchy-site-community-theme-build",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  if (!response.ok) throw new Error(errorMessage(response.status, await response.text()));

  const declaredBytes = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredBytes)) {
    assertMaximumBytes(declaredBytes, maximumBytes, `Git blob ${oid}`);
  }
  const contents = new Uint8Array(await response.arrayBuffer());
  assertMaximumBytes(contents.byteLength, maximumBytes, `Git blob ${oid}`);
  if (gitBlobOid(contents) !== oid) throw new Error(`Git blob integrity check failed: ${oid}`);
  return contents;
}

export function verifyGitHubBlob(contents: Uint8Array, oid: string) {
  return gitBlobOid(contents) === oid;
}
