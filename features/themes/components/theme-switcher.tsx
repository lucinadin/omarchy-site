"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { ThemePreviewImage } from "@/features/themes/components/theme-preview-image";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  ExternalLinkIcon,
  SearchIcon,
  ShareIcon,
} from "@/icons";
import { notifySite } from "@/lib/site-notification-events";
import { getCommunityThemeOptions, loadCommunityThemeOptions } from "@/lib/themes/client-catalog";
import { omarchyThemes } from "@/lib/themes/official";
import {
  applyDocumentTheme,
  getAppliedThemeId,
  persistThemePreference,
  previewTheme,
  type ThemeTransitionOrigin,
} from "@/lib/themes/theme-runtime";
import { shareThemeLink } from "@/lib/themes/theme-share-client";
import type { OmarchyTheme, OmarchyThemeOption, ThemeKind } from "@/lib/themes/themes";
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

const previewOffsets = [-4, -3, -2, -1, 0, 1, 2, 3, 4] as const;

type ThemePickerSession = {
  initialTheme: OmarchyTheme;
  previewedThemeId: string;
  selectedThemeId: string;
};

function cyclicTheme(themes: readonly OmarchyThemeOption[], activeIndex: number, offset: number) {
  const index = (activeIndex + offset + themes.length) % themes.length;
  return themes[index];
}

type ThemePickerKeyboardAction =
  | { kind: "cancel" }
  | { direction: -1 | 1; kind: "select-adjacent" }
  | { kind: "preview"; theme: OmarchyThemeOption }
  | { kind: "commit"; theme: OmarchyThemeOption };

function isThemePickerToggle(event: ReactKeyboardEvent<HTMLElement>) {
  return (
    event.code === "Space" && event.ctrlKey && event.shiftKey && !event.altKey && event.metaKey
  );
}

function themePickerKeyboardAction(
  event: ReactKeyboardEvent<HTMLElement>,
  activeTheme: OmarchyThemeOption | undefined,
  query: string
): ThemePickerKeyboardAction | null {
  if (event.key === "Escape" || isThemePickerToggle(event)) return { kind: "cancel" };
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;

  const target = event.target;
  const isTextInput = target instanceof HTMLInputElement;
  const isAction =
    target instanceof HTMLElement && target.closest("button, a[href], input, select") !== null;
  if (event.key === "ArrowLeft" && !isAction) {
    return { direction: -1, kind: "select-adjacent" };
  }
  if (event.key === "ArrowRight" && !isAction) {
    return { direction: 1, kind: "select-adjacent" };
  }
  if (event.key === " " && activeTheme && !isAction && (!isTextInput || query.trim() === "")) {
    return { kind: "preview", theme: activeTheme };
  }
  if (event.key === "Enter" && activeTheme && !isAction) {
    return { kind: "commit", theme: activeTheme };
  }
  return null;
}

function getElementCenter(element: HTMLElement | null): ThemeTransitionOrigin | undefined {
  if (!element) return undefined;
  const bounds = element.getBoundingClientRect();
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
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
    <footer className="border-border grid grid-cols-[32px_minmax(0,1fr)_auto_32px] items-center gap-2 border-t px-2 py-[0.35rem] [@media(max-width:620px)]:grid-cols-[32px_minmax(0,1fr)_32px]">
      <button
        aria-label="Previous theme"
        className="border-border bg-surface text-foreground [&:hover]:bg-primary [&:hover]:text-primary-foreground inline-flex size-8 cursor-pointer items-center justify-center border p-0 disabled:cursor-default disabled:opacity-50 [&_svg]:size-[13px]"
        disabled={count === 0}
        onClick={() => onSelectAdjacent(-1)}
        type="button"
      >
        <ChevronLeftIcon />
      </button>
      <label className="border-border bg-background grid h-8 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border px-[0.55rem] py-0">
        <SearchIcon aria-hidden="true" className="text-primary size-[11px]" />
        <span className="sr-only">Filter themes</span>
        <input
          className="text-micro/ui text-bright-foreground w-full min-w-0 border-0 bg-transparent p-0 outline-none"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Type to filter themes"
          type="search"
          value={query}
        />
      </label>
      <span className="text-micro/ui text-muted-foreground whitespace-nowrap [@media(max-width:620px)]:hidden">
        {count ? `${activeIndex + 1} / ${count}` : "0 / 0"}
      </span>
      <button
        aria-label="Next theme"
        className="border-border bg-surface text-foreground [&:hover]:bg-primary [&:hover]:text-primary-foreground inline-flex size-8 cursor-pointer items-center justify-center border p-0 disabled:cursor-default disabled:opacity-50 [&_svg]:size-[13px]"
        disabled={count === 0}
        onClick={() => onSelectAdjacent(1)}
        type="button"
      >
        <ChevronRightIcon />
      </button>
    </footer>
  );
}

export function ThemeSwitcher({
  initialTheme: initialThemeValue,
  initialSelection = initialThemeValue,
  onClose,
  placement,
  portalContainer,
}: ThemeSwitcherProps) {
  const { requestTheme } = useThemePreferenceRequest();
  const activePreviewRef = useRef<HTMLElement>(null);
  const closingRef = useRef(false);
  const settledRef = useRef(false);
  const [collection, setCollection] = useState<ThemeKind>(initialSelection.kind);
  const [communityThemes, setCommunityThemes] = useState<readonly OmarchyThemeOption[] | null>(
    getCommunityThemeOptions
  );
  const [loadingCommunityThemes, setLoadingCommunityThemes] = useState(
    initialSelection.kind === "community" && communityThemes === null
  );
  const [query, setQuery] = useState("");
  const [themeSession, setThemeSession] = useState<ThemePickerSession>({
    initialTheme: initialThemeValue,
    previewedThemeId: initialThemeValue.id,
    selectedThemeId: initialSelection.id,
  });
  const { initialTheme, previewedThemeId, selectedThemeId } = themeSession;
  const themes: readonly OmarchyThemeOption[] =
    collection === "official" ? omarchyThemes : (communityThemes ?? []);
  const filter = query.trim().toLowerCase();
  const filteredThemes = filter
    ? themes.filter((theme) => theme.name.toLowerCase().includes(filter))
    : themes;
  const activeIndex = Math.max(
    0,
    filteredThemes.findIndex((theme) => theme.id === selectedThemeId)
  );
  const activeTheme = filteredThemes[activeIndex];

  useEffect(
    () => () => {
      if (!settledRef.current && getAppliedThemeId() !== initialTheme.id) {
        applyDocumentTheme(initialTheme);
      }
    },
    [initialTheme]
  );

  const selectAdjacent = (direction: -1 | 1) => {
    if (filteredThemes.length === 0) return;
    const nextThemeId = cyclicTheme(filteredThemes, activeIndex, direction).id;
    setThemeSession((current) => ({ ...current, selectedThemeId: nextThemeId }));
  };

  const getActiveOrigin = () => getElementCenter(activePreviewRef.current);

  const previewSelectedTheme = (theme: OmarchyTheme, origin = getActiveOrigin()) => {
    if (theme.id === previewedThemeId) return;
    previewTheme(theme, origin);
    setThemeSession((current) => ({ ...current, previewedThemeId: theme.id }));
  };

  const closeWithTheme = (theme: OmarchyTheme, persist: boolean, origin = getActiveOrigin()) => {
    if (closingRef.current) return;
    closingRef.current = true;
    requestTheme({
      origin,
      themeId: theme.id,
      transitionType: persist ? "theme-apply" : "theme-revert",
      update: () => {
        if (persist) persistThemePreference(theme);
        settledRef.current = true;
        onClose();
      },
    });
  };

  const cancelAndClose = () => closeWithTheme(initialTheme, false);
  const commitAndClose = (theme: OmarchyTheme, origin?: ThemeTransitionOrigin) =>
    closeWithTheme(theme, true, origin);

  const selectCollection = (nextCollection: ThemeKind) => {
    setCollection(nextCollection);
    setQuery("");

    if (nextCollection === "official") {
      setLoadingCommunityThemes(false);
      const selectedTheme =
        initialSelection.kind === "official" ? initialSelection : omarchyThemes[0];
      setThemeSession((current) => ({ ...current, selectedThemeId: selectedTheme.id }));
    } else {
      setLoadingCommunityThemes(communityThemes === null);
      if (communityThemes) {
        const selected =
          communityThemes.find((theme) => theme.id === initialSelection.id) ?? communityThemes[0];
        setThemeSession((current) => ({ ...current, selectedThemeId: selected.id }));
      }
    }
  };

  useEffect(() => {
    if (collection !== "community" || communityThemes) return;

    let cancelled = false;
    void loadCommunityThemeOptions()
      .then((loadedThemes) => {
        if (cancelled) return;
        setCommunityThemes(loadedThemes);
        setThemeSession((current) => ({
          ...current,
          selectedThemeId: (
            loadedThemes.find((theme) => theme.id === current.selectedThemeId) ??
            loadedThemes.find((theme) => theme.id === initialSelection.id) ??
            loadedThemes[0]
          ).id,
        }));
        setLoadingCommunityThemes(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCollection("official");
        setThemeSession((current) => ({ ...current, selectedThemeId: omarchyThemes[0].id }));
        setLoadingCommunityThemes(false);
        notifySite("Community themes could not be loaded");
      });

    return () => {
      cancelled = true;
    };
  }, [collection, communityThemes, initialSelection.id]);

  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    const normalizedQuery = nextQuery.trim().toLowerCase();
    const firstMatch = themes.find((theme) => theme.name.toLowerCase().includes(normalizedQuery));
    if (firstMatch) {
      setThemeSession((current) => ({ ...current, selectedThemeId: firstMatch.id }));
    }
  };

  return (
    <Modal
      ariaLabel="Switch Omarchy theme"
      className="fixed top-1/2 left-1/2 z-[211] grid h-[min(88%,36rem)] w-[min(1060px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 grid-rows-[42px_minmax(0,1fr)_48px] overflow-hidden border border-[color-mix(in_srgb,var(--foreground)_38%,var(--border))] bg-[color-mix(in_srgb,var(--dark-background)_97%,transparent)] data-[placement=desktop]:absolute data-[placement=desktop]:z-[3] [@media(max-width:620px)]:h-[min(82%,32rem)]"
      data-placement={placement}
      initialFocus="content"
      onKeyDownCapture={(event) => {
        const action = themePickerKeyboardAction(event, activeTheme, query);
        if (!action) return;

        event.preventDefault();
        switch (action.kind) {
          case "cancel":
            event.stopPropagation();
            cancelAndClose();
            break;
          case "select-adjacent":
            selectAdjacent(action.direction);
            break;
          case "preview":
            previewSelectedTheme(action.theme);
            break;
          case "commit":
            commitAndClose(action.theme);
            break;
          default:
            return unreachable(action);
        }
      }}
      onOpenChange={(open) => {
        if (!open) cancelAndClose();
      }}
      open
      overlayClassName="fixed inset-0 z-[210] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-[color-mix(in_srgb,var(--darker-background)_82%,transparent)] p-0 backdrop-blur-[3px] data-[placement=desktop]:absolute data-[placement=desktop]:z-[2] [&::backdrop]:bg-transparent"
      overlayProps={{ "data-placement": placement }}
      portalContainer={portalContainer}
    >
      <header className="border-border grid grid-cols-[minmax(0,1fr)_auto] items-center border-b py-0 pr-[0.4rem] pl-3">
        <div className="flex min-w-0 items-center gap-[0.55rem]">
          <SegmentedControl
            aria-label="Theme collection"
            onValueChange={(nextCollection) => {
              if (nextCollection === "official" || nextCollection === "community") {
                void selectCollection(nextCollection);
              }
            }}
            value={collection}
          >
            <SegmentedControlItem value="official">Official</SegmentedControlItem>
            <SegmentedControlItem value="community">Community</SegmentedControlItem>
          </SegmentedControl>
          <strong className="text-meta text-bright-foreground truncate font-medium">
            {activeTheme?.name ??
              (loadingCommunityThemes ? "Loading community themes…" : "No matches")}
          </strong>
        </div>
        <nav aria-label="Theme actions" className="flex items-center gap-[0.15rem]">
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
            onClick={cancelAndClose}
            size="compactIcon"
            variant="ghost"
          >
            <CloseIcon />
          </Button>
        </nav>
      </header>

      <div className="home-theme-picker__carousel">
        {filteredThemes.length > 0 ? (
          previewOffsets.map((offset) => {
            const theme = cyclicTheme(filteredThemes, activeIndex, offset);
            const active = offset === 0;

            if (active) {
              const previewing = theme.id === previewedThemeId;

              return (
                <figure
                  aria-label={`${theme.name} theme preview`}
                  className="home-theme-picker__preview"
                  data-distance={Math.abs(offset)}
                  data-offset={offset}
                  key={`${theme.id}-${offset}`}
                  ref={activePreviewRef}
                >
                  <ThemePreviewImage
                    alt=""
                    fill
                    loading="eager"
                    sizes="(max-width: 800px) 78vw, 720px"
                    preview={theme.preview}
                  />
                  <div className="absolute bottom-[0.55rem] left-1/2 z-[2] flex -translate-x-1/2 items-center gap-[0.45rem] whitespace-nowrap [&_kbd]:min-h-[18px] [&_kbd]:border-[color-mix(in_srgb,currentColor_32%,transparent)] [&_kbd]:bg-[color-mix(in_srgb,currentColor_10%,transparent)] [&_kbd]:px-[0.35rem] [&_kbd]:text-current [&_svg]:size-2.5">
                    <button
                      aria-keyshortcuts="Space"
                      className="text-micro/ui text-bright-foreground [&:is(:hover,:focus-visible):not(:disabled)]:border-bright-foreground inline-flex min-h-[30px] cursor-pointer items-center gap-[0.35rem] border border-[color-mix(in_srgb,var(--foreground)_46%,var(--border))] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] px-[0.55rem] py-[0.32rem] disabled:cursor-default disabled:opacity-[0.78]"
                      data-previewing={previewing}
                      disabled={previewing}
                      onClick={(event) =>
                        previewSelectedTheme(theme, {
                          x: event.clientX,
                          y: event.clientY,
                        })
                      }
                      type="button"
                    >
                      <Kbd>Space</Kbd>
                      {previewing ? (
                        <>
                          <CheckIcon aria-hidden="true" /> Previewing
                        </>
                      ) : (
                        "Preview"
                      )}
                    </button>
                    <button
                      aria-keyshortcuts="Enter"
                      className="border-primary bg-primary text-micro/ui text-primary-foreground [&:is(:hover,:focus-visible):not(:disabled)]:border-bright-foreground inline-flex min-h-[30px] cursor-pointer items-center gap-[0.35rem] border px-[0.55rem] py-[0.32rem]"
                      onClick={(event) =>
                        commitAndClose(theme, {
                          x: event.clientX,
                          y: event.clientY,
                        })
                      }
                      type="button"
                    >
                      <Kbd>Enter</Kbd>
                      Use theme
                    </button>
                  </div>
                </figure>
              );
            }

            return (
              <button
                aria-label={`Select ${theme.name}`}
                className="home-theme-picker__preview"
                data-distance={Math.abs(offset)}
                data-offset={offset}
                key={`${theme.id}-${offset}`}
                onClick={() =>
                  setThemeSession((current) => ({
                    ...current,
                    selectedThemeId: theme.id,
                  }))
                }
                type="button"
              >
                <ThemePreviewImage
                  alt=""
                  fill
                  loading="lazy"
                  sizes="160px"
                  preview={theme.preview}
                />
              </button>
            );
          })
        ) : (
          <p aria-live="polite" className="text-meta text-muted-foreground m-auto">
            {loadingCommunityThemes ? "Loading verified community themes…" : "No themes match"}
          </p>
        )}
      </div>

      <ThemePickerFooter
        activeIndex={activeIndex}
        count={filteredThemes.length}
        onQueryChange={updateQuery}
        onSelectAdjacent={selectAdjacent}
        query={query}
      />
    </Modal>
  );
}
