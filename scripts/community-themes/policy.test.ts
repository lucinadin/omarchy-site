import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAllowedImageFormat,
  assertImageDimensions,
  assertMaximumBytes,
  assertRepositoryIsQuiet,
  parseGitHubRepository,
  renditionWidths,
  sha256Hex,
} from "./policy";

test("normalizes a canonical GitHub repository URL", () => {
  assert.deepEqual(parseGitHubRepository("https://github.com/bjarneo/omarchy-ash-theme.git/"), {
    name: "omarchy-ash-theme",
    owner: "bjarneo",
    repository: "https://github.com/bjarneo/omarchy-ash-theme",
  });
});

test("refuses repository URLs with mutable paths or query strings", () => {
  assert.throws(() => parseGitHubRepository("https://github.com/example/theme/tree/main"));
  assert.throws(() => parseGitHubRepository("https://github.com/example/theme?tab=readme"));
  assert.throws(() => parseGitHubRepository("git@github.com:example/theme.git"));
});

test("requires both the push and current commit to be quiet for 48 hours", () => {
  const buildTime = Date.parse("2026-09-04T12:00:00Z");
  assert.doesNotThrow(() =>
    assertRepositoryIsQuiet("2026-09-02T12:00:00Z", "2026-09-01T12:00:00Z", buildTime)
  );
  assert.throws(() =>
    assertRepositoryIsQuiet("2026-09-01T12:00:00Z", "2026-09-03T12:00:01Z", buildTime)
  );
  assert.throws(() =>
    assertRepositoryIsQuiet("2026-09-02T12:00:01Z", "2026-09-01T12:00:00Z", buildTime)
  );
  assert.doesNotThrow(() =>
    assertRepositoryIsQuiet("2026-09-02T12:00:00Z", "2026-09-02T12:00:00Z", buildTime)
  );
});

test("enforces byte, pixel, dimension, and format limits", () => {
  assert.doesNotThrow(() => assertMaximumBytes(1024, 1024, "Preview"));
  assert.throws(() => assertMaximumBytes(1025, 1024, "Preview"));
  assert.doesNotThrow(() => assertImageDimensions(3840, 2160));
  assert.throws(() => assertImageDimensions(8193, 1));
  assert.throws(() => assertImageDimensions(6000, 5000));
  assert.doesNotThrow(() => assertAllowedImageFormat("webp"));
  assert.throws(() => assertAllowedImageFormat("svg"));
});

test("selects responsive renditions without upscaling", () => {
  assert.deepEqual(renditionWidths(3840), [480, 768, 1200, 1920]);
  assert.deepEqual(renditionWidths(1200), [480, 768, 1200]);
  assert.deepEqual(renditionWidths(1080), [480, 768, 1080]);
  assert.deepEqual(renditionWidths(320), [320]);
});

test("produces a stable SHA-256 digest", () => {
  assert.equal(
    sha256Hex(new TextEncoder().encode("omarchy")),
    "382a803dcc0de9618b141c904dde30f933985956df74ce7fd9886494c7a35a60"
  );
});
