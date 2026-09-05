"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, type ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { CommandDialog, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  applicationDisplayName,
  omarchyAppsMenuApplications,
  type OmarchyApplication,
} from "@/content/omarchy-applications";
import type { SearchKind, SearchMatch } from "@/features/discovery/types";
import { useSiteSearch } from "@/features/discovery/use-site-search";
import { useSecretLabUnlocked } from "@/hooks";
import {
  AppWindowIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BookOpenIcon,
  ChevronRightIcon,
  CloseIcon,
  ComputerSettingsIcon,
  GlobeIcon,
  HomeIcon,
  InformationIcon,
  NewsIcon,
  PackageOpenIcon,
  PaletteIcon,
  SettingsIcon,
  TerminalIcon,
} from "@/icons";
import { requestHomeDesktopSurface } from "@/lib/home-desktop-events";
import { openSecretLab } from "@/lib/secret-lab-access";
import type { SiteSearchView } from "@/lib/site-search-events";
import { cn } from "@/lib/utils";
import { unreachable } from "@/lib/validation";

type SiteSearchDialogProps = {
  initialView: SiteSearchView;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  placement: "desktop" | "viewport";
  portalContainer: HTMLElement | null;
};

function ResultKindIcon({ kind }: { kind: SearchKind }) {
  switch (kind) {
    case "application":
      return <AppWindowIcon aria-hidden className="size-3.5 text-current" />;
    case "manual":
      return <BookOpenIcon aria-hidden className="size-3.5 text-current" />;
    case "news":
      return <NewsIcon aria-hidden className="size-3.5 text-current" />;
    case "resource":
      return <PackageOpenIcon aria-hidden className="size-3.5 text-current" />;
    case "page":
      return <GlobeIcon aria-hidden className="size-3.5 text-current" />;
    default:
      return unreachable(kind);
  }
}

function ApplicationKindIcon({ application }: { application: OmarchyApplication }) {
  switch (application.kind) {
    case "tui":
      return <TerminalIcon aria-hidden className="size-3.5 text-current" />;
    case "web-app":
      return <GlobeIcon aria-hidden className="size-3.5 text-current" />;
    case "service":
      return <SettingsIcon aria-hidden className="size-3.5 text-current" />;
    case "vm":
      return <ComputerSettingsIcon aria-hidden className="size-3.5 text-current" />;
    case "native":
      return <AppWindowIcon aria-hidden className="size-3.5 text-current" />;
    default:
      return unreachable(application.kind);
  }
}

function filterApplications(query: string) {
  const words = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return omarchyAppsMenuApplications;

  return omarchyAppsMenuApplications.filter((application) => {
    const searchable = [
      applicationDisplayName(application),
      application.name,
      application.description,
      ...application.aliases,
    ]
      .join(" ")
      .toLowerCase();
    return words.every((word) => searchable.includes(word));
  });
}

function HomeCommandItem({ className, ...props }: ComponentProps<typeof CommandItem>) {
  return (
    <CommandItem
      className={cn(
        "text-meta/ui text-foreground [&:hover]:bg-primary [&:hover]:text-primary-foreground data-highlighted:bg-primary data-highlighted:text-primary-foreground grid min-h-[39px] w-full cursor-pointer grid-cols-[16px_minmax(0,1fr)_12px] items-center gap-[0.65rem] rounded-none border-0 bg-transparent px-[0.65rem] py-0 text-left no-underline outline-none",
        className
      )}
      {...props}
    />
  );
}

function HomeCommandEmpty({ children }: { children: string }) {
  return (
    <p aria-live="polite" className="text-meta/ui text-muted-foreground m-0 px-[0.65rem] py-4">
      {children}
    </p>
  );
}

function SearchResultItem({ match, onSelect }: { match: SearchMatch; onSelect: () => void }) {
  return (
    <HomeCommandItem
      onSelect={onSelect}
      value={`${match.entry.kind}:${match.entry.title}:${match.entry.url}`}
    >
      <ResultKindIcon kind={match.entry.kind} />
      <span className="min-w-0">
        <span className="block truncate">{match.entry.title}</span>
        <span className="text-micro/ui mt-0.5 block truncate opacity-60">
          {match.entry.parent ?? match.entry.kind}
        </span>
      </span>
      {match.entry.external ? (
        <ArrowUpRightIcon aria-hidden className="size-[11px] opacity-[0.55]" />
      ) : (
        <ChevronRightIcon aria-hidden className="size-[11px] opacity-[0.55]" />
      )}
    </HomeCommandItem>
  );
}

type RootMenuProps = {
  onNavigate: (url: string) => void;
  onOpenApps: () => void;
  onOpenLab: () => void;
  onOpenThemePicker: () => void;
  pathname: string;
  showSecretLab: boolean;
};

function RootMenu({
  onNavigate,
  onOpenApps,
  onOpenLab,
  onOpenThemePicker,
  pathname,
  showSecretLab,
}: RootMenuProps) {
  return (
    <>
      {pathname !== "/" ? (
        <HomeCommandItem onSelect={() => onNavigate("/")} value="home">
          <HomeIcon aria-hidden className="size-3.5 text-current" />
          <span>Home</span>
          <ChevronRightIcon aria-hidden className="size-[11px] opacity-[0.55]" />
        </HomeCommandItem>
      ) : null}
      <HomeCommandItem onSelect={onOpenApps} value="apps">
        <AppWindowIcon aria-hidden className="size-3.5 text-current" />
        <span>Apps</span>
        <ChevronRightIcon aria-hidden className="size-[11px] opacity-[0.55]" />
      </HomeCommandItem>
      <HomeCommandItem onSelect={() => onNavigate("/manual/")} value="learn">
        <BookOpenIcon aria-hidden className="size-3.5 text-current" />
        <span>Learn</span>
        <ChevronRightIcon aria-hidden className="size-[11px] opacity-[0.55]" />
      </HomeCommandItem>
      <HomeCommandItem onSelect={onOpenThemePicker} value="style">
        <PaletteIcon aria-hidden className="size-3.5 text-current" />
        <span>Style</span>
        <ChevronRightIcon aria-hidden className="size-[11px] opacity-[0.55]" />
      </HomeCommandItem>
      <HomeCommandItem onSelect={() => onNavigate("/foundation/")} value="about">
        <InformationIcon aria-hidden className="size-3.5 text-current" />
        <span>About</span>
        <ChevronRightIcon aria-hidden className="size-[11px] opacity-[0.55]" />
      </HomeCommandItem>
      {showSecretLab ? (
        <HomeCommandItem onSelect={onOpenLab} value="secret-lab">
          <SettingsIcon aria-hidden className="size-3.5 text-current" />
          <span>Secret Lab</span>
          <ChevronRightIcon aria-hidden className="size-[11px] opacity-[0.55]" />
        </HomeCommandItem>
      ) : null}
    </>
  );
}

function SearchResults({
  matches,
  onNavigate,
}: {
  matches: SearchMatch[];
  onNavigate: (url: string, external?: boolean) => void;
}) {
  return matches.map((match) => (
    <SearchResultItem
      key={`${match.entry.kind}:${match.entry.title}:${match.entry.url}`}
      match={match}
      onSelect={() => onNavigate(match.entry.url, match.entry.external)}
    />
  ));
}

function ApplicationResults({
  applications,
  onNavigate,
}: {
  applications: readonly OmarchyApplication[];
  onNavigate: (url: string) => void;
}) {
  return applications.map((application) => (
    <HomeCommandItem
      key={application.id}
      onSelect={() => onNavigate(application.manualHref)}
      value={[
        applicationDisplayName(application),
        application.name,
        application.description,
        ...application.aliases,
      ].join(" ")}
    >
      <ApplicationKindIcon application={application} />
      <span className="min-w-0">
        <span className="block truncate">{applicationDisplayName(application)}</span>
        <span className="text-micro/ui mt-0.5 block truncate opacity-60">
          {application.description}
        </span>
      </span>
      <ChevronRightIcon aria-hidden className="size-[11px] opacity-[0.55]" />
    </HomeCommandItem>
  ));
}

function SearchEmptyState({
  applicationCount,
  matchCount,
  query,
  status,
  view,
}: {
  applicationCount: number;
  matchCount: number;
  query: string;
  status: ReturnType<typeof useSiteSearch>["status"];
  view: SiteSearchView;
}) {
  if (view === "apps") {
    return applicationCount === 0 ? <HomeCommandEmpty>No apps found</HomeCommandEmpty> : null;
  }
  if (!query || matchCount > 0) return null;

  switch (status) {
    case "loading":
      return <HomeCommandEmpty>Searching…</HomeCommandEmpty>;
    case "error":
      return <HomeCommandEmpty>Search is unavailable right now</HomeCommandEmpty>;
    case "ready":
      return <HomeCommandEmpty>No matches</HomeCommandEmpty>;
    case "idle":
      return null;
    default:
      return unreachable(status);
  }
}

export function SiteSearchDialog({
  initialView,
  onOpenChange,
  open,
  placement,
  portalContainer,
}: SiteSearchDialogProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<SiteSearchView>(initialView);
  const search = useSiteSearch(view === "root" ? query : "", 10);
  const normalizedQuery = query.trim();
  const applications = view === "apps" ? filterApplications(normalizedQuery) : [];
  const isSecretLabAvailable = useSecretLabUnlocked();

  function navigate(url: string, external = false) {
    onOpenChange(false);
    if (external) {
      window.location.assign(url);
      return;
    }
    router.push(url);
  }

  function showApps() {
    setQuery("");
    setView("apps");
  }

  function showRoot() {
    setQuery("");
    setView("root");
  }

  function openThemePicker() {
    onOpenChange(false);
    requestHomeDesktopSurface("theme");
  }

  function openLab() {
    onOpenChange(false);
    openSecretLab();
  }

  return (
    <CommandDialog
      className="fixed top-1/2 left-1/2 z-[211] grid max-h-[min(82%,34rem)] w-[min(300px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border border-[color-mix(in_srgb,var(--foreground)_36%,var(--border))] bg-(--dark-background) data-[placement=desktop]:absolute data-[placement=desktop]:z-[3]"
      description={
        view === "apps"
          ? "Browse the applications included with Omarchy."
          : "Navigate Omarchy or search the website, manual, and news archive."
      }
      inputValue={query}
      onInputValueChange={setQuery}
      onOpenChange={onOpenChange}
      open={open}
      overlayClassName="fixed inset-0 z-[210] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-[color-mix(in_srgb,var(--darker-background)_70%,transparent)] p-0 backdrop-blur-[3px] data-[placement=desktop]:absolute data-[placement=desktop]:z-[2] [&::backdrop]:bg-transparent"
      placement={placement}
      portalContainer={portalContainer}
      title={view === "apps" ? "Omarchy apps" : "Omarchy menu"}
    >
      <header
        className="border-border grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-[0.4rem] border-b py-0 pr-2 pl-3 data-[view=apps]:grid-cols-[auto_minmax(0,1fr)_auto]"
        data-view={view}
      >
        {view === "apps" ? (
          <Button
            aria-label="Back to Omarchy menu"
            onClick={showRoot}
            size="compactIcon"
            variant="ghost"
          >
            <ArrowLeftIcon aria-hidden />
          </Button>
        ) : null}
        <CommandInput
          autoFocus
          className="text-meta/ui text-bright-foreground placeholder:text-muted-foreground h-auto min-w-0 border-0 bg-transparent p-0 outline-none"
          placeholder={view === "apps" ? "Apps" : "Search Omarchy"}
          wrapperClassName="grid h-auto min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-0 p-0 [&>svg]:size-[13px] [&>svg]:text-primary [&>svg]:opacity-100"
        />
        <Button
          aria-label="Close menu"
          onClick={() => onOpenChange(false)}
          size="compactIcon"
          variant="ghost"
        >
          <CloseIcon aria-hidden />
        </Button>
      </header>

      <CommandList className="max-h-none min-h-0 [scroll-padding-block:0.45rem] scrollbar-thin p-[0.45rem]">
        {view === "root" && !normalizedQuery ? (
          <RootMenu
            onNavigate={navigate}
            onOpenApps={showApps}
            onOpenLab={openLab}
            onOpenThemePicker={openThemePicker}
            pathname={pathname}
            showSecretLab={isSecretLabAvailable}
          />
        ) : null}

        {view === "root" && normalizedQuery ? (
          <SearchResults matches={search.matches} onNavigate={navigate} />
        ) : null}

        {view === "apps" ? (
          <ApplicationResults applications={applications} onNavigate={navigate} />
        ) : null}

        <SearchEmptyState
          applicationCount={applications.length}
          matchCount={search.matches.length}
          query={normalizedQuery}
          status={search.status}
          view={view}
        />
      </CommandList>
    </CommandDialog>
  );
}
