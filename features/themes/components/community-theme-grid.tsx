"use client";

import Link from "next/link";
import { useState } from "react";

import { ThemeCardFooter } from "@/features/themes/components/theme-card-footer";
import { ThemePreviewCollection } from "@/features/themes/components/theme-preview-collection";
import type { ThemePreviewItem } from "@/features/themes/theme-preview-model";
import { ArrowRightIcon, ArrowUpRightIcon, PaletteIcon, SearchIcon } from "@/icons";

export function CommunityThemeGrid({
  initialThemeKey,
  themes,
}: {
  initialThemeKey?: string;
  themes: readonly ThemePreviewItem[];
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleThemes = themes.filter(
    (theme) => !normalizedQuery || theme.name.toLowerCase().includes(normalizedQuery)
  );

  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4 [@media(max-width:520px)]:flex-col [@media(max-width:520px)]:items-stretch">
        <label className="border-border bg-background focus-within:border-primary grid h-10 w-full max-w-[420px] grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border px-3">
          <SearchIcon aria-hidden="true" className="text-primary size-[15px]" />
          <span className="sr-only">Find a community theme</span>
          <input
            className="text-small text-foreground placeholder:text-muted-foreground w-full min-w-0 border-0 bg-transparent p-0 outline-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a community theme"
            type="search"
            value={query}
          />
        </label>
        <p className="text-meta text-muted-foreground m-0">
          {visibleThemes.length} {visibleThemes.length === 1 ? "theme" : "themes"}
        </p>
      </div>

      {visibleThemes.length > 0 ? (
        <ThemePreviewCollection initialThemeKey={initialThemeKey} themes={visibleThemes}>
          {!normalizedQuery ? <CreateThemeCard /> : null}
        </ThemePreviewCollection>
      ) : (
        <p className="border-border text-small text-muted-foreground border-t pt-8">
          No themes found.
        </p>
      )}
    </>
  );
}

function CreateThemeCard() {
  return (
    <article className="border-border bg-background relative min-w-0 overflow-hidden border [contain-intrinsic-size:auto_260px] [content-visibility:auto]">
      <div className="border-border p-fluid-sm relative grid aspect-video grid-rows-[1fr_auto] overflow-hidden border-b bg-(--darker-background)">
        <div className="text-primary grid content-center justify-items-center gap-3">
          <PaletteIcon aria-hidden="true" size={24} />
          <span className="text-small text-bright-foreground">Start with colors.toml</span>
        </div>
        <nav aria-label="Theme authoring links" className="grid grid-cols-3 gap-px">
          <Link
            className="bg-surface text-micro/ui text-foreground [&:hover]:bg-bright-foreground [&:hover]:text-background focus-visible:bg-bright-foreground focus-visible:text-background inline-flex min-h-[2.1rem] items-center justify-center gap-[0.35rem] p-[0.45rem] no-underline"
            href="/manual/making-your-own-theme/"
            transitionTypes={["site-route"]}
          >
            Guide <ArrowRightIcon aria-hidden="true" size={12} />
          </Link>
          <a
            className="bg-surface text-micro/ui text-foreground [&:hover]:bg-bright-foreground [&:hover]:text-background focus-visible:bg-bright-foreground focus-visible:text-background inline-flex min-h-[2.1rem] items-center justify-center gap-[0.35rem] p-[0.45rem] no-underline"
            href="https://github.com/omacom/omarchy/tree/quattro/themes"
            rel="noreferrer"
            target="_blank"
          >
            Source <ArrowUpRightIcon aria-hidden="true" size={12} />
          </a>
          <a
            className="bg-surface text-micro/ui text-foreground [&:hover]:bg-bright-foreground [&:hover]:text-background focus-visible:bg-bright-foreground focus-visible:text-background inline-flex min-h-[2.1rem] items-center justify-center gap-[0.35rem] p-[0.45rem] no-underline"
            href="https://github.com/omacom/omarchy-site#adding-your-theme"
            rel="noreferrer"
            target="_blank"
          >
            Get listed <ArrowUpRightIcon aria-hidden="true" size={12} />
          </a>
        </nav>
      </div>
      <ThemeCardFooter detail="Your machine, your colors" title="Create yours" />
    </article>
  );
}
