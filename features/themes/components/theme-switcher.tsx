"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ThemePickerGallery } from "@/features/themes/components/theme-picker-gallery";
import {
  BackgroundPreviewImage,
  ThemePreviewImage,
} from "@/features/themes/components/theme-preview-image";
import { usePickerScroll } from "@/features/themes/use-picker-scroll";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  ExternalLinkIcon,
  LinkIcon,
  SearchIcon,
  ShareIcon,
} from "@/icons";
import { notifySite } from "@/lib/site-notification-events";
import {
  automaticBackground,
  getBackgroundSnapshot,
  persistBackground,
  previewBackground,
  resolveBackground,
  type BackgroundPreference,
} from "@/lib/themes/background";
import { getCommunityThemeOptions, loadCommunityThemeOptions } from "@/lib/themes/client-catalog";
import { defaultThemeId, omarchyThemes } from "@/lib/themes/official";
import {
  applyDocumentTheme,
  getAppliedThemeId,
  getThemeById,
  persistThemePreference,
  previewTheme,
  type ThemeTransitionOrigin,
} from "@/lib/themes/theme-runtime";
import { shareThemeLink } from "@/lib/themes/theme-share-client";
import type { OmarchyTheme, ThemeKind } from "@/lib/themes/themes";
import { isEditableTarget } from "@/lib/ui/editable-target";
import { Modal } from "@/lib/ui/modal";
import { unreachable } from "@/lib/validation";
import { useThemePreferenceRequest } from "@/providers";

export type ThemeSwitcherProps = {
  initialTheme: OmarchyTheme;
  initialSelection?: OmarchyTheme;
  onClose: () => void;
  placement: "desktop" | "viewport";
  portalContainer: HTMLElement | null;
};

const pickerRows = ["community", "official", "backgrounds"] as const;
type PickerRow = (typeof pickerRows)[number];
type BackgroundOption = { id: string; name: string; preference: BackgroundPreference };

const pickerKeyActions = new Map<string, "previous" | "next" | "preview" | "commit">([
  ["ArrowLeft", "previous"],
  ["ArrowRight", "next"],
  [" ", "preview"],
  ["Enter", "commit"],
]);

function pickerKeyboardAction(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key === "Escape") return "cancel";
  if (isEditableTarget(event.target)) return null;
  if (event.code === "Space" && event.ctrlKey && event.shiftKey && event.metaKey && !event.altKey)
    return "cancel";
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  if (event.key.toLowerCase() === "a") return "automatic";
  if (event.key === "ArrowUp") return "up";
  if (event.key === "ArrowDown") return "down";
  const target = event.target;
  if (!(target instanceof HTMLElement)) return null;
  if (target.closest("button, a[href]") && !target.closest(".home-theme-picker__carousel"))
    return null;
  return pickerKeyActions.get(event.key) ?? null;
}

function getElementCenter(element: HTMLElement | null): ThemeTransitionOrigin | undefined {
  if (!element) return undefined;
  const bounds = element.getBoundingClientRect();
  return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
}

type ThemePickerFooterProps = {
  activeIndex: number;
  count: number;
  onQueryChange: (query: string) => void;
  onSelectAdjacent: (direction: -1 | 1) => void;
  query: string;
};

function ThemePickerFooter({
  activeIndex,
  count,
  onQueryChange,
  onSelectAdjacent,
  query,
}: ThemePickerFooterProps) {
  return (
    <footer className="border-border grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 border-t p-2">
      <Button
        aria-label="Previous theme"
        disabled={count === 0}
        onClick={() => onSelectAdjacent(-1)}
        size="icon"
        variant="secondary"
      >
        <ChevronLeftIcon className="size-4" />
      </Button>
      <label className="border-border bg-background flex h-10 min-w-0 items-center gap-2 border px-3">
        <SearchIcon aria-hidden="true" className="text-primary size-3.5 shrink-0" />
        <span className="sr-only">Filter themes</span>
        <input
          className="text-small text-bright-foreground w-full min-w-0 border-0 bg-transparent p-0 outline-none"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Type to filter themes"
          type="search"
          value={query}
        />
      </label>
      <span className="text-meta text-muted-foreground whitespace-nowrap tabular-nums">
        {count ? `${activeIndex + 1} / ${count}` : "0 / 0"}
      </span>
      <Button
        aria-label="Next theme"
        disabled={count === 0}
        onClick={() => onSelectAdjacent(1)}
        size="icon"
        variant="secondary"
      >
        <ChevronRightIcon className="size-4" />
      </Button>
    </footer>
  );
}

export function ThemeSwitcher({
  initialTheme,
  initialSelection = initialTheme,
  onClose,
  placement,
  portalContainer,
}: ThemeSwitcherProps) {
  const { requestTheme } = useThemePreferenceRequest();
  const activePreviewRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);
  const settledRef = useRef(false);
  const [backgroundSession, setBackgroundSession] = useState(() => {
    const initial = getBackgroundSnapshot();
    return { initial, selected: initial };
  });
  const { initial: initialBackground, selected: background } = backgroundSession;
  const [row, setRow] = useState<PickerRow>(initialSelection.kind);
  const [selectedIds, setSelectedIds] = useState<Record<ThemeKind, string>>({
    community: initialSelection.kind === "community" ? initialSelection.id : "",
    official: initialSelection.kind === "official" ? initialSelection.id : defaultThemeId,
  });
  const [selectedThemeId, setSelectedThemeId] = useState(initialSelection.id);
  const [previewedThemeId, setPreviewedThemeId] = useState(initialTheme.id);
  const [communityThemes, setCommunityThemes] = useState(getCommunityThemeOptions);
  const [communityError, setCommunityError] = useState(false);
  const [query, setQuery] = useState("");
  const filter = query.trim().toLowerCase();
  const matches = (item: { name: string }) => item.name.toLowerCase().includes(filter);
  const official = omarchyThemes.filter(matches);
  const community = (communityThemes ?? []).filter(matches);
  const selectedTheme = getThemeById(selectedThemeId) ?? initialSelection;
  const previewedTheme = getThemeById(previewedThemeId) ?? initialTheme;
  const backgroundOptions: BackgroundOption[] = [
    ...omarchyThemes.map((theme) => ({
      id: theme.id,
      name: theme.name,
      preference: { kind: "wallpaper" as const, themeId: theme.id },
    })),
    {
      id: "solid",
      name: "Solid color",
      preference: {
        kind: "solid",
        color: background.kind === "solid" ? background.color : previewedTheme.colors.background,
      },
    },
  ];
  const backgrounds = backgroundOptions.filter(matches);
  const resolvedBackground = resolveBackground(background, selectedTheme.id);
  const backgroundId = resolvedBackground
    ? "themeId" in resolvedBackground
      ? resolvedBackground.themeId
      : resolvedBackground.kind === "experiment"
        ? selectedTheme.id
        : resolvedBackground.kind
    : "solid";
  const indices = {
    community: Math.max(
      0,
      community.findIndex((theme) => theme.id === selectedIds.community)
    ),
    official: Math.max(
      0,
      official.findIndex((theme) => theme.id === selectedIds.official)
    ),
    backgrounds: Math.max(
      0,
      backgrounds.findIndex((item) => item.id === backgroundId)
    ),
  };
  const activeTheme =
    row === "backgrounds" ? undefined : { community, official }[row][indices[row]];
  const activeBackground = backgrounds[indices.backgrounds];
  const activeItems = { community, official, backgrounds }[row];
  const gridRef = usePickerScroll({
    activeIndex: pickerRows.indexOf(row),
    axis: "y",
    onSelect: (index) => {
      const next = pickerRows[index];
      if (next) activateRow(next);
    },
  });

  useEffect(
    () => () => {
      if (settledRef.current) return;
      previewBackground(initialBackground);
      if (getAppliedThemeId() !== initialTheme.id) applyDocumentTheme(initialTheme);
    },
    [initialTheme, initialBackground]
  );

  useEffect(() => {
    if (communityThemes) return;
    let cancelled = false;
    void loadCommunityThemeOptions()
      .then((loaded) => {
        if (!cancelled) setCommunityThemes(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          setCommunityError(true);
          notifySite("Community themes could not be loaded");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [communityThemes]);

  const activateRow = (next: PickerRow) => {
    setRow(next);
    if (next === "backgrounds") {
      if (background.kind === "experiment") {
        setBackgroundSession((current) => ({ ...current, selected: automaticBackground }));
      }
      return;
    }
    const theme = (next === "official" ? official : community)[indices[next]];
    if (theme) setSelectedThemeId(theme.id);
  };

  const selectTheme = (kind: ThemeKind, id: string) => {
    setRow(kind);
    setSelectedIds((current) => ({ ...current, [kind]: id }));
    setSelectedThemeId(id);
  };
  const selectBackground = (id: string) => {
    const option = backgroundOptions.find((item) => item.id === id);
    if (option) {
      setRow("backgrounds");
      setBackgroundSession((current) => ({ ...current, selected: option.preference }));
    }
  };
  const updateQuery = (value: string) => {
    setQuery(value);
    if (row !== "backgrounds" || !value.trim()) return;
    const match = backgroundOptions.find((item) =>
      item.name.toLowerCase().includes(value.trim().toLowerCase())
    );
    if (match) setBackgroundSession((current) => ({ ...current, selected: match.preference }));
  };
  const selectAdjacent = (direction: -1 | 1) => {
    if (!activeItems.length) return;
    const index = (indices[row] + direction + activeItems.length) % activeItems.length;
    const item = activeItems[index];
    if (row === "backgrounds") selectBackground(item.id);
    else selectTheme(row, item.id);
  };
  const selectAutomatic = () => {
    setQuery("");
    setRow("backgrounds");
    setBackgroundSession((current) => ({ ...current, selected: automaticBackground }));
    previewBackground(automaticBackground);
  };
  const previewSelection = () => {
    if (row === "backgrounds") {
      if (activeBackground)
        previewBackground(
          background.kind === "automatic" ? automaticBackground : activeBackground.preference
        );
    } else if (activeTheme) {
      previewBackground(background);
      previewTheme(activeTheme, getElementCenter(activePreviewRef.current));
      setPreviewedThemeId(activeTheme.id);
    }
  };
  const closeWithSelection = (persist: boolean) => {
    if (closingRef.current) return;
    const theme = persist ? (activeTheme ?? previewedTheme) : initialTheme;
    closingRef.current = true;
    requestTheme({
      origin: getElementCenter(activePreviewRef.current),
      themeId: theme.id,
      transitionType: persist ? "theme-apply" : "theme-revert",
      update: () => {
        if (persist) {
          persistThemePreference(theme);
          persistBackground(background);
        } else {
          previewBackground(initialBackground);
        }
        settledRef.current = true;
        onClose();
      },
    });
  };

  return (
    <Modal
      ariaLabel="Switch Omarchy theme"
      className="home-theme-picker border-border bg-popover fixed top-1/2 left-1/2 z-[211] grid -translate-x-1/2 -translate-y-1/2 overflow-hidden border data-[placement=desktop]:absolute data-[placement=desktop]:z-[3]"
      data-placement={placement}
      initialFocus="content"
      onKeyDownCapture={(event) => {
        const action = pickerKeyboardAction(event);
        if (!action) return;
        event.preventDefault();
        event.stopPropagation();
        switch (action) {
          case "automatic":
            selectAutomatic();
            break;
          case "cancel":
            closeWithSelection(false);
            break;
          case "up":
          case "down": {
            if (event.repeat) break;
            const offset = action === "up" ? -1 : 1;
            activateRow(
              pickerRows[
                Math.max(0, Math.min(pickerRows.length - 1, pickerRows.indexOf(row) + offset))
              ]
            );
            break;
          }
          case "previous":
            selectAdjacent(-1);
            break;
          case "next":
            selectAdjacent(1);
            break;
          case "preview":
            previewSelection();
            break;
          case "commit":
            closeWithSelection(true);
            break;
          default:
            return unreachable(action);
        }
      }}
      onOpenChange={(open) => {
        if (!open) closeWithSelection(false);
      }}
      open
      overlayClassName="fixed inset-0 z-[210] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-[color-mix(in_srgb,var(--darker-background)_82%,transparent)] p-0 backdrop-blur-[3px] data-[placement=desktop]:absolute data-[placement=desktop]:z-[2] [&::backdrop]:bg-transparent"
      overlayProps={{ "data-placement": placement }}
      portalContainer={portalContainer}
    >
      <header className="border-border flex items-center justify-between gap-2 border-b p-2">
        <span className="text-small flex min-w-0 items-center gap-2 font-medium">
          <Kbd>↑ ↓</Kbd> Themes & backgrounds
        </span>
        <nav aria-label="Theme actions" className="flex items-center gap-1">
          {activeTheme ? (
            <>
              <Button
                aria-label={`Share ${activeTheme.name}`}
                onClick={() =>
                  void shareThemeLink({
                    name: activeTheme.name,
                    reference: { kind: activeTheme.kind, slug: activeTheme.slug },
                  })
                }
                size="compactIcon"
                title="Share theme"
                variant="ghost"
              >
                <ShareIcon />
              </Button>
              <a
                aria-label={`Open ${activeTheme.name} on GitHub`}
                className={buttonVariants({ size: "compactIcon", variant: "ghost" })}
                href={activeTheme.repository}
                rel="noreferrer"
                target="_blank"
                title="View on GitHub"
              >
                <ExternalLinkIcon />
              </a>
            </>
          ) : null}
          <Button
            aria-label="Close theme switcher"
            onClick={() => closeWithSelection(false)}
            size="compactIcon"
            variant="ghost"
          >
            <CloseIcon />
          </Button>
        </nav>
      </header>

      <div className="home-theme-picker__grid" ref={gridRef}>
        <ThemePickerGallery
          active={row === "community"}
          activeIndex={indices.community}
          activePreviewRef={activePreviewRef}
          index={0}
          items={community}
          label="Community"
          onActivate={() => activateRow("community")}
          onSelect={(id) => selectTheme("community", id)}
          renderPreview={(theme, loading) => (
            <ThemePreviewImage
              alt=""
              fill
              loading={loading}
              sizes="(max-width: 640px) 66vw, 512px"
              preview={theme.preview}
            />
          )}
          status={
            communityError
              ? "Unavailable"
              : communityThemes
                ? "No matches"
                : "Loading community themes…"
          }
        />
        <ThemePickerGallery
          active={row === "official"}
          activeIndex={indices.official}
          activePreviewRef={activePreviewRef}
          index={1}
          items={official}
          label="Official"
          onActivate={() => activateRow("official")}
          onSelect={(id) => selectTheme("official", id)}
          renderPreview={(theme, loading) => (
            <ThemePreviewImage
              alt=""
              fill
              loading={loading}
              sizes="(max-width: 640px) 66vw, 512px"
              preview={theme.preview}
            />
          )}
        />
        <ThemePickerGallery
          active={row === "backgrounds"}
          activeIndex={indices.backgrounds}
          activePreviewRef={activePreviewRef}
          index={2}
          items={backgrounds}
          label="Backgrounds"
          onActivate={() => activateRow("backgrounds")}
          onSelect={selectBackground}
          renderPreview={(item, loading) => (
            <BackgroundPreviewImage
              preference={item.preference}
              color={previewedTheme.colors.background}
              loading={loading}
            />
          )}
        />
      </div>

      <div className="home-theme-picker__actions">
        {row === "backgrounds" ? (
          <Button
            aria-label="Automatic"
            aria-pressed={background.kind === "automatic"}
            aria-keyshortcuts="a"
            className="aria-pressed:border-primary aria-pressed:text-primary max-sm:w-10 max-sm:shrink-0 max-sm:px-0"
            onClick={selectAutomatic}
            size="compact"
            title="Automatic"
            variant="secondary"
          >
            <Kbd variant="action">A</Kbd>
            <LinkIcon aria-hidden="true" className="size-4 sm:hidden" />
            {background.kind === "automatic" ? (
              <CheckIcon aria-hidden="true" className="max-sm:hidden" />
            ) : null}
            <span className="max-sm:sr-only">Automatic</span>
          </Button>
        ) : null}
        <Button
          aria-keyshortcuts="Space"
          disabled={!activeItems.length}
          onClick={previewSelection}
          size="compact"
          variant="secondary"
        >
          <Kbd variant="action">Space</Kbd>
          {activeTheme?.id === previewedThemeId ? "Previewing" : "Preview"}
        </Button>
        <Button
          aria-keyshortcuts="Enter"
          disabled={!activeItems.length}
          onClick={() => closeWithSelection(true)}
          size="compact"
        >
          <Kbd variant="action">Enter</Kbd>
          {row === "backgrounds" ? "Use background" : "Use theme"}
        </Button>
      </div>

      <ThemePickerFooter
        activeIndex={indices[row]}
        count={activeItems.length}
        onQueryChange={updateQuery}
        onSelectAdjacent={selectAdjacent}
        query={query}
      />
    </Modal>
  );
}
