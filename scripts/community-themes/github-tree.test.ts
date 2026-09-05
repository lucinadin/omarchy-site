import assert from "node:assert/strict";
import { test } from "node:test";

import { selectGitHubThemeSourceFromTree } from "./github-tree";

test("selects the shallowest palette and the preview beside it", () => {
  const source = selectGitHubThemeSourceFromTree([
    { bytes: 20, mode: 0o100644, name: "theme/colors.toml", oid: "a".repeat(40) },
    { bytes: 30, mode: 0o100644, name: "theme/preview.png", oid: "b".repeat(40) },
    { bytes: 40, mode: 0o100644, name: "docs/screenshot.png", oid: "c".repeat(40) },
    { bytes: 50, mode: 0o100644, name: "backup/old/colors.toml", oid: "d".repeat(40) },
  ]);

  assert.equal(source.colors.name, "theme/colors.toml");
  assert.equal(source.preview.name, "theme/preview.png");
});

test("requires an override when equally ranked sources are ambiguous", () => {
  const files = [
    { bytes: 20, mode: 0o100644, name: "one/colors.toml", oid: "a".repeat(40) },
    { bytes: 20, mode: 0o100644, name: "two/colors.toml", oid: "b".repeat(40) },
    { bytes: 30, mode: 0o100644, name: "preview.png", oid: "c".repeat(40) },
  ];
  assert.throws(() => selectGitHubThemeSourceFromTree(files), /ambiguous colors.toml/u);

  const source = selectGitHubThemeSourceFromTree(files, {
    colors: "one/colors.toml",
    preview: "preview.png",
  });
  assert.equal(source.colors.name, "one/colors.toml");
});
