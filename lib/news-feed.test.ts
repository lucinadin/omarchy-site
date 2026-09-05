import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildAtomFeed, buildRssFeed, type NewsFeedEntry } from "@/lib/news-feed";

const entries: readonly NewsFeedEntry[] = [
  {
    author: "DHH & friends",
    authorUrl: "https://dhh.dk/?from=news&kind=feed",
    dateTime: "2026-09-03T19:45:00.000Z",
    description: "Tokens < fixes & fun.",
    path: "/news/2026/09/tokens/",
    title: "Tokens & everything",
  },
];

describe("news feeds", () => {
  test("builds a valid RSS document with canonical article URLs and escaped text", () => {
    const rss = buildRssFeed(entries);

    assert.match(rss, /^<\?xml version="1\.0" encoding="UTF-8"\?>/u);
    assert.match(rss, /<atom:link href="https:\/\/omarchy\.org\/news\/rss\.xml"/u);
    assert.match(rss, /<link>https:\/\/omarchy\.org\/news\/2026\/09\/tokens\/<\/link>/u);
    assert.match(rss, /<title>Tokens &amp; everything<\/title>/u);
    assert.match(rss, /<description>Tokens &lt; fixes &amp; fun\.<\/description>/u);
    assert.match(rss, /<pubDate>Thu, 03 Sep 2026 19:45:00 GMT<\/pubDate>/u);
  });

  test("builds an Atom document with per-entry authors and timestamps", () => {
    const atom = buildAtomFeed(entries);

    assert.match(atom, /<feed xmlns="http:\/\/www\.w3\.org\/2005\/Atom">/u);
    assert.match(atom, /<link href="https:\/\/omarchy\.org\/news\/atom\.xml" rel="self"/u);
    assert.match(atom, /<updated>2026-09-03T19:45:00\.000Z<\/updated>/u);
    assert.match(atom, /<name>DHH &amp; friends<\/name>/u);
    assert.match(atom, /<uri>https:\/\/dhh\.dk\/\?from=news&amp;kind=feed<\/uri>/u);
  });

  test("rejects empty feeds instead of emitting an invalid updated date", () => {
    assert.throws(() => buildRssFeed([]), /empty news feed/u);
    assert.throws(() => buildAtomFeed([]), /empty news feed/u);
  });
});
