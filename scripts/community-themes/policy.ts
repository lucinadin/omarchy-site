import { createHash } from "node:crypto";

export const communityThemePolicy = {
  colors: {
    maximumBytes: 64 * 1024,
    maximumEntries: 128,
    maximumLineBytes: 1024,
  },
  image: {
    allowedFormats: ["avif", "jpeg", "png", "webp"],
    blurWidth: 10,
    maximumDecodedPixels: 24_000_000,
    maximumDimension: 8192,
    maximumSourceBytes: 8 * 1024 * 1024,
    renditions: [
      { maximumBytes: 32 * 1024, width: 480 },
      { maximumBytes: 64 * 1024, width: 768 },
      { maximumBytes: 128 * 1024, width: 1200 },
      { maximumBytes: 256 * 1024, width: 1920 },
    ],
  },
  quietPeriodMilliseconds: 48 * 60 * 60 * 1000,
} as const;

export type GitHubRepositoryCoordinates = {
  name: string;
  owner: string;
  repository: string;
};

const githubRepositoryPattern =
  /^https:\/\/github\.com\/([A-Za-z\d](?:[A-Za-z\d-]{0,38}))\/([A-Za-z\d._-]+?)(?:\.git)?\/?$/u;

export function parseGitHubRepository(repository: string): GitHubRepositoryCoordinates {
  const match = githubRepositoryPattern.exec(repository);
  if (!match) {
    throw new Error(`Community theme repository is not a canonical GitHub URL: ${repository}`);
  }

  const owner = match[1];
  const name = match[2];

  return {
    name,
    owner,
    repository: `https://github.com/${owner}/${name}`,
  };
}

function timestampMilliseconds(value: string, label: string) {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(`${label} is not an ISO timestamp: ${value}`);
  return milliseconds;
}

export function assertRepositoryIsQuiet(
  pushedAt: string,
  committedAt: string,
  buildTimeMilliseconds: number
) {
  const latestSourceChange = Math.max(
    timestampMilliseconds(pushedAt, "Repository pushed_at"),
    timestampMilliseconds(committedAt, "Default-branch commit date")
  );
  const quietAt = latestSourceChange + communityThemePolicy.quietPeriodMilliseconds;

  if (quietAt > buildTimeMilliseconds) {
    throw new Error(
      `Repository is inside the 48-hour quiet period until ${new Date(quietAt).toISOString()}`
    );
  }
}

export function assertMaximumBytes(actualBytes: number, maximumBytes: number, label: string) {
  if (!Number.isSafeInteger(actualBytes) || actualBytes < 0) {
    throw new Error(`${label} has an invalid byte size: ${actualBytes}`);
  }

  if (actualBytes > maximumBytes) {
    throw new Error(`${label} is ${actualBytes} bytes; the limit is ${maximumBytes} bytes`);
  }
}

export function assertImageDimensions(width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw new Error(`Preview has invalid dimensions: ${width}x${height}`);
  }

  if (
    width > communityThemePolicy.image.maximumDimension ||
    height > communityThemePolicy.image.maximumDimension
  ) {
    throw new Error(
      `Preview dimensions ${width}x${height} exceed ${communityThemePolicy.image.maximumDimension}px`
    );
  }

  const decodedPixels = width * height;
  if (decodedPixels > communityThemePolicy.image.maximumDecodedPixels) {
    throw new Error(
      `Preview contains ${decodedPixels} pixels; the limit is ${communityThemePolicy.image.maximumDecodedPixels}`
    );
  }
}

export function assertAllowedImageFormat(format: string) {
  if (!communityThemePolicy.image.allowedFormats.some((candidate) => candidate === format)) {
    throw new Error(`Preview format is not allowed: ${format}`);
  }
}

export function renditionWidths(sourceWidth: number) {
  const widths: number[] = communityThemePolicy.image.renditions
    .map((rendition) => rendition.width)
    .filter((width) => width <= sourceWidth);

  const largestConfiguredWidth = communityThemePolicy.image.renditions.at(-1)?.width ?? sourceWidth;
  const boundedSourceWidth = Math.min(sourceWidth, largestConfiguredWidth);
  if (!widths.includes(boundedSourceWidth)) widths.push(boundedSourceWidth);

  return widths.toSorted((left, right) => left - right);
}

export function sha256Hex(contents: Uint8Array) {
  return createHash("sha256").update(contents).digest("hex");
}
