import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import {
  findTerminalApplication,
  omarchyApplications,
  omarchyAppsMenuApplications,
} from "@/content/omarchy-applications";
import { isSearchIndex } from "@/features/discovery/search-client";

describe("Omarchy application catalog", () => {
  test("uses unique application IDs and terminal aliases", () => {
    assert.equal(
      new Set(omarchyApplications.map((application) => application.id)).size,
      omarchyApplications.length
    );

    const aliases = omarchyApplications.flatMap((application) => application.aliases);
    assert.equal(new Set(aliases).size, aliases.length);
  });

  test("resolves real shell application names", () => {
    assert.equal(findTerminalApplication("obsidian")?.manualHref, "/manual/guis/#obsidian");
    assert.equal(findTerminalApplication("docker")?.name, "Lazydocker");
    assert.equal(findTerminalApplication("activity")?.name, "Btop");
  });

  test("keeps the Apps provider curated and alphabetized", () => {
    assert.equal(
      omarchyAppsMenuApplications.some((application) => application.id === "chatgpt"),
      false
    );
    assert.equal(
      omarchyAppsMenuApplications.some((application) => application.id === "hey"),
      true
    );

    const labels = omarchyAppsMenuApplications.map(
      (application) => application.launcherLabel ?? application.name
    );
    assert.deepEqual(
      labels,
      labels.toSorted((left, right) => left.localeCompare(right))
    );
  });

  test("application destinations match independently indexed manual pages and headings", () => {
    const index: unknown = JSON.parse(
      readFileSync(new URL("../public/search-index.json", import.meta.url), "utf-8")
    );
    assert.ok(isSearchIndex(index), "Generated search index must match its runtime contract");
    // Application entries copy manualHref from this catalog, so cannot validate it.
    const urls = new Set(
      index.entries.filter((entry) => entry.kind === "manual").map((entry) => entry.url)
    );
    assert.ok(urls.size > 0, "Manual content must be indexed");

    assert.deepEqual(
      omarchyApplications
        .filter((application) => !urls.has(application.manualHref))
        .map((application) => application.manualHref),
      []
    );
  });
});
