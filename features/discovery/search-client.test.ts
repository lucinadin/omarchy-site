import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { findSearchMatches } from "@/features/discovery/search-client";
import type { SearchEntry } from "@/features/discovery/types";

describe("application search results", () => {
  test("prefers a catalog application over its duplicate manual heading", () => {
    const entries: SearchEntry[] = [
      {
        kind: "manual",
        parent: "GUIs",
        text: "Notetaking",
        title: "Obsidian",
        url: "/manual/guis/#obsidian",
      },
      {
        kind: "application",
        parent: "Omarchy applications",
        text: "Notetaking notes",
        title: "Obsidian",
        url: "/manual/guis/#obsidian",
      },
    ];

    const matches = findSearchMatches(entries, "obsidian");

    assert.equal(matches.length, 1);
    assert.equal(matches[0].entry.kind, "application");
  });

  test("keeps distinct apps that share one manual section", () => {
    const entries: SearchEntry[] = [
      {
        kind: "application",
        text: "Google maps",
        title: "Google Maps",
        url: "/manual/web-apps/#google-apps",
      },
      {
        kind: "application",
        text: "Google photos",
        title: "Google Photos",
        url: "/manual/web-apps/#google-apps",
      },
    ];

    assert.equal(findSearchMatches(entries, "google").length, 2);
  });
});
