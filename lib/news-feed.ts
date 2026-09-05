import { siteBrand } from "@/lib/site-brand";
import { absoluteUrl } from "@/lib/site-links";
import { escapeXmlText } from "@/lib/xml";

export type NewsFeedEntry = {
  author: string;
  authorUrl?: string;
  dateTime: string;
  description: string;
  path: string;
  title: string;
};

const feedDescription = "Announcements, releases, and other news from Omarchy.";
const feedTitle = "Omarchy News";

function latestDate(entries: readonly NewsFeedEntry[]) {
  const latestEntry = entries.at(0);
  if (!latestEntry) throw new Error("Cannot generate an empty news feed");
  return latestEntry.dateTime;
}

function atomAuthor(entry: NewsFeedEntry) {
  const uri = entry.authorUrl ? `\n        <uri>${escapeXmlText(entry.authorUrl)}</uri>` : "";
  return `<author>\n        <name>${escapeXmlText(entry.author)}</name>${uri}\n      </author>`;
}

export function buildRssFeed(entries: readonly NewsFeedEntry[]) {
  const feedUrl = absoluteUrl("/news/rss.xml");
  const items = entries
    .map((entry) => {
      const url = absoluteUrl(entry.path);
      return `    <item>
      <title>${escapeXmlText(entry.title)}</title>
      <link>${escapeXmlText(url)}</link>
      <guid isPermaLink="true">${escapeXmlText(url)}</guid>
      <pubDate>${new Date(entry.dateTime).toUTCString()}</pubDate>
      <dc:creator>${escapeXmlText(entry.author)}</dc:creator>
      <description>${escapeXmlText(entry.description)}</description>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${feedTitle}</title>
    <link>${absoluteUrl("/news/")}</link>
    <description>${feedDescription}</description>
    <language>en</language>
    <lastBuildDate>${new Date(latestDate(entries)).toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

export function buildAtomFeed(entries: readonly NewsFeedEntry[]) {
  const feedUrl = absoluteUrl("/news/atom.xml");
  const items = entries
    .map((entry) => {
      const url = absoluteUrl(entry.path);
      return `  <entry>
    <title>${escapeXmlText(entry.title)}</title>
    <id>${escapeXmlText(url)}</id>
    <link href="${escapeXmlText(url)}" rel="alternate"/>
    <published>${entry.dateTime}</published>
    <updated>${entry.dateTime}</updated>
    ${atomAuthor(entry)}
    <summary type="text">${escapeXmlText(entry.description)}</summary>
  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${feedTitle}</title>
  <subtitle>${feedDescription}</subtitle>
  <id>${absoluteUrl("/news/")}</id>
  <link href="${feedUrl}" rel="self" type="application/atom+xml"/>
  <link href="${absoluteUrl("/news/")}" rel="alternate"/>
  <updated>${latestDate(entries)}</updated>
  <author>
    <name>${siteBrand.name}</name>
    <uri>${siteBrand.url}</uri>
  </author>
${items}
</feed>
`;
}
