import assert from "node:assert/strict";
import { test } from "node:test";

import { selectGitHubThemeSource, verifyGitHubBlob } from "./github";

test("selects bounded root palette and preview blobs", () => {
  const source = selectGitHubThemeSource([
    { bytes: 512, mode: 10_0644, name: "colors.toml", oid: "a".repeat(40) },
    { bytes: 1024, mode: 10_0644, name: "preview.png", oid: "b".repeat(40) },
    { bytes: 2048, mode: 10_0644, name: "wallpaper.png", oid: "c".repeat(40) },
  ]);

  assert.equal(source.colors.name, "colors.toml");
  assert.equal(source.preview.name, "preview.png");
});

test("refuses symbolic links and oversized declared blobs", () => {
  assert.throws(
    () =>
      selectGitHubThemeSource([
        { bytes: 12, mode: 0o120000, name: "colors.toml", oid: "a".repeat(40) },
        { bytes: 12, mode: 10_0644, name: "preview.png", oid: "b".repeat(40) },
      ]),
    /must not be a symbolic link/u
  );

  assert.throws(
    () =>
      selectGitHubThemeSource([
        { bytes: 12, mode: 10_0644, name: "colors.toml", oid: "a".repeat(40) },
        { bytes: 9 * 1024 * 1024, mode: 10_0644, name: "preview.png", oid: "b".repeat(40) },
      ]),
    /the limit is 8388608 bytes/u
  );
});

test("verifies raw contents against the immutable Git blob ID", () => {
  const contents = new TextEncoder().encode("omarchy\n");
  assert.equal(verifyGitHubBlob(contents, "69908186fd8c5f328a8fe814124fbf6694ef599e"), true);
  assert.equal(verifyGitHubBlob(contents, "0".repeat(40)), false);
});
