export type SearchKind = "application" | "manual" | "news" | "page" | "resource";

export type SearchEntry = {
  external?: boolean;
  kind: SearchKind;
  parent?: string;
  text: string;
  title: string;
  url: string;
};

export type SearchIndex = {
  entries: SearchEntry[];
  version: 1;
};

export type SearchMatch = {
  entry: SearchEntry;
  preview: string;
  score: number;
};
