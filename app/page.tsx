import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense, ViewTransition } from "react";

import { HomeDesktopShell } from "@/components/home/home-desktop-shell";
import { HomeWorkspaceOne } from "@/components/home/home-workspace-one";
import { CommunityVideoCard } from "@/components/site/community-video-card";
import { PageTransition } from "@/components/site/page-transition";
import { SiteAnnouncement } from "@/components/site/site-announcement";
import { SiteHeader } from "@/components/site/site-header";
import { YouTubeVideo } from "@/components/site/youtube-video";
import { NewsIndex, NewsIndexSkeleton } from "@/features/news/components/news-index";
import { ArrowRightIcon } from "@/icons";
import { siteTagline } from "@/lib/site-brand";

export const metadata: Metadata = {
  description: siteTagline,
  openGraph: {
    description: siteTagline,
    images: [
      {
        alt: "Omarchy — Beautiful, Fun & Agentic Linux by DHH",
        height: 630,
        url: "/assets/og/home.png",
        width: 1200,
      },
    ],
    title: "Omarchy",
    type: "website",
  },
  title: `Omarchy — ${siteTagline}`,
  twitter: {
    card: "summary_large_image",
    description: siteTagline,
    images: [
      {
        alt: "Omarchy — Beautiful, Fun & Agentic Linux by DHH",
        url: "/assets/og/home.png",
      },
    ],
    title: "Omarchy",
  },
};

const foundations = [
  { href: "https://archlinux.org/", name: "Arch", role: "The base" },
  { href: "https://hypr.land/", name: "Hyprland", role: "The window manager" },
  { href: "https://quickshell.org/", name: "Quickshell", role: "The desktop" },
  { href: "https://neovim.io/", name: "Neovim (btw)", role: "The editor" },
  { href: "https://www.chromium.org/Home/", name: "Chromium", role: "The browser" },
  { href: "https://ghostty.org/", name: "Ghostty", role: "The terminal" },
  { href: "https://obsidian.md/", name: "Obsidian", role: "The notes" },
  { href: "https://www.libreoffice.org/", name: "LibreOffice", role: "The office" },
];

const popularPlugins = [
  {
    author: "QuickshellSpotify",
    category: "Widgets",
    description:
      "Spotify controls in Quickshell, using around 60 MB instead of the official client’s roughly 950 MB.",
    href: "https://plugins.omarchy.org/plugin.html?id=quickshell.spotify",
    image: "https://plugins.omarchy.org/assets/img/plugins/8-stappmus-omarchy-spotify-card.webp",
    imageHeight: 450,
    imageWidth: 720,
    kind: "Bar widget",
    name: "Omarchy Spotify",
  },
  {
    author: "Carmine Paolino",
    category: "Hardware",
    description:
      "Save monitor layouts by display identity and restore them after hotplug, lid changes, and suspend.",
    href: "https://plugins.omarchy.org/plugin.html?id=crmne.hyprmoncfg",
    image: "https://plugins.omarchy.org/assets/img/plugins/5-crmne-omarchy-hyprmoncfg-card.webp",
    imageHeight: 405,
    imageWidth: 720,
    kind: "Bar widget",
    name: "hyprmoncfg",
  },
  {
    author: "SirJul1337",
    category: "Appearance",
    description: "Preview and switch between lock screen designs made for Omarchy.",
    href: "https://plugins.omarchy.org/plugin.html?id=io.github.sirjul1337.lock-explorer",
    image:
      "https://plugins.omarchy.org/assets/img/plugins/10-sirjul1337-omarchy-lock-explorer-card.webp",
    imageHeight: 406,
    imageWidth: 720,
    kind: "Overlay",
    name: "Lock Screen Explorer",
  },
  {
    author: "agx",
    category: "Productivity",
    description:
      "Track per-app screen time locally, with live bar data, trends, and usage breakdowns.",
    href: "https://plugins.omarchy.org/plugin.html?id=agx.screen-time",
    image:
      "https://plugins.omarchy.org/assets/img/plugins/4-ax1g-quickshell-screentime-plugin-card.webp",
    imageHeight: 405,
    imageWidth: 720,
    kind: "Bar widget",
    name: "Screen Time",
  },
] as const;

const communityVideos = [
  {
    creator: "NetworkChuck",
    id: "9SDkU5VDQEQ",
    poster: "/assets/images/video/networkchuck.webp",
    title: "You need to switch to Linux RIGHT NOW!!",
  },
  {
    creator: "Typecraft",
    id: "5JPYJfN7HY0",
    poster: "/assets/images/video/typecraft.webp",
    title: "They finally fixed Linux",
  },
  {
    creator: "LinuxBTW",
    id: "qBKMe8AatY0",
    poster: "/assets/images/video/linuxbtw.webp",
    title: "I Didn't Expect Omarchy 4 to Be This Good",
  },
  {
    creator: "Alex Finn",
    id: "KO2T0oET9go",
    poster: "/assets/images/video/alex-finn.webp",
    title: "If you use AI, switch to Omarchy immediately",
  },
] as const;

export default function HomePage() {
  return (
    <PageTransition>
      <div className="site-shell site-shell--announced [--site-announcement-height:2.25rem] [--site-chrome-height:calc(var(--site-announcement-height)+var(--site-header-height))] [--site-header-height:4rem]">
        <SiteAnnouncement />
        <SiteHeader />
        <main className="pt-(--site-chrome-height) md:pt-0">
          <section
            className="content-container h-[calc(100svh-var(--site-chrome-height))] max-h-144 min-h-0 p-0 md:flex md:h-svh md:max-h-none md:flex-col md:px-(--page-gutter) md:pt-[calc(var(--site-chrome-height)+1rem)] md:pb-4 [@media(max-width:620px)]:px-0"
            aria-labelledby="hero-title"
          >
            <HomeDesktopShell>
              <HomeWorkspaceOne />
            </HomeDesktopShell>
          </section>

          <section
            className="content-container gap-fluid-layout pt-fluid-section pb-fluid-2xl grid grid-cols-[minmax(0,0.95fr)_minmax(440px,1.05fr)] [@media(max-width:1050px)]:grid-cols-1"
            aria-labelledby="included-title"
          >
            <header className="max-w-[680px]">
              <p className="text-meta leading-ui text-primary m-0 font-medium">
                The Omarchy defaults
              </p>
              <h2 className="section-title mt-4 mb-0" id="included-title">
                There’s zero bloat here. Just everything I use.
              </h2>
            </header>
            <ul className="border-border m-0 list-none border-t p-0">
              {foundations.map((foundation) => (
                <li key={foundation.name}>
                  <a
                    className="border-border [&:hover]:bg-bright-foreground [&:hover]:text-background focus-visible:bg-bright-foreground focus-visible:text-background focus-visible:outline-accent flex items-baseline justify-between gap-8 border-b p-4 text-inherit no-underline transition-[background-color,color] duration-[120ms] ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2"
                    href={foundation.href}
                  >
                    <span className="text-ui font-bold text-inherit">{foundation.name}</span>
                    <span className="text-meta m-0 text-inherit opacity-[0.72]">
                      {foundation.role}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="content-container section-divider pt-fluid-2xl pb-fluid-section"
            aria-labelledby="plugins-title"
          >
            <header className="mb-fluid-2xl flex items-end justify-between gap-8 [@media(max-width:520px)]:flex-col [@media(max-width:520px)]:items-start">
              <div className="max-w-[760px]">
                <p className="text-meta leading-ui text-primary mt-0 mb-4 font-medium">
                  Extend Omarchy
                </p>
                <h2 className="section-title m-0" id="plugins-title">
                  More than 2,350 plugins. Already.
                </h2>
                <p className="text-lead leading-copy text-muted-foreground mt-5 mb-0">
                  Add panels, bar widgets, overlays, and hardware controls without waiting on the
                  core system. These four are a small sample.
                </p>
              </div>
              <a
                className="text-small text-link inline-flex flex-none items-center gap-[0.45rem] underline-offset-[0.2em]"
                href="https://plugins.omarchy.org/?sort=hearts#catalog"
              >
                Browse all plugins <ArrowRightIcon aria-hidden="true" size={15} />
              </a>
            </header>
            <div className="gap-fluid-sm grid max-w-full snap-x snap-proximity scrollbar-thin [scrollbar-color:var(--muted)_transparent] auto-cols-[85%] grid-flow-col auto-rows-fr overflow-x-auto overscroll-x-contain pt-1 pb-3 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-2 xl:grid-cols-4">
              {popularPlugins.map((plugin) => (
                <a
                  className="group border-border hover:border-primary focus-visible:outline-accent grid min-w-0 snap-start grid-rows-[auto_1fr] border text-inherit no-underline transition-[background-color,border-color,transform] duration-[160ms] ease-[ease] hover:[transform:translateY(-2px)] hover:bg-[color-mix(in_srgb,var(--card)_82%,var(--background))] focus-visible:outline-2 focus-visible:outline-offset-3"
                  href={plugin.href}
                  key={plugin.href}
                >
                  <div className="aspect-video overflow-hidden bg-(--dark-background)">
                    {/* HTML-in-Canvas can only capture CORS-clean pixels; the plugin CDN allows anonymous requests. */}
                    <Image
                      alt={`Preview of ${plugin.name}`}
                      className="block h-full w-full object-cover transition-transform duration-[180ms] ease-[ease] group-hover:scale-[1.025]"
                      crossOrigin="anonymous"
                      height={plugin.imageHeight}
                      sizes="(max-width: 640px) calc(100vw - 2.5rem), (max-width: 1050px) 46vw, 23vw"
                      src={plugin.image}
                      width={plugin.imageWidth}
                    />
                  </div>
                  <div className="p-fluid-sm flex flex-col">
                    <div className="text-micro leading-ui text-primary flex items-center justify-between gap-[0.65rem]">
                      <span>{plugin.category}</span>
                      <span className="text-muted-foreground">{plugin.kind}</span>
                    </div>
                    <h3 className="text-title-sm text-foreground mt-4 mb-0 leading-tight font-medium tracking-[-0.025em]">
                      {plugin.name}
                    </h3>
                    <p className="text-small leading-copy text-muted-foreground mt-3 mb-6">
                      {plugin.description}
                    </p>
                    <span className="text-meta text-link mt-auto inline-flex items-center gap-[0.45rem]">
                      By {plugin.author} <ArrowRightIcon aria-hidden="true" size={14} />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>

          <section
            className="content-container gap-fluid-layout pt-fluid-section pb-fluid-2xl grid grid-cols-[minmax(220px,0.34fr)_minmax(0,1fr)] items-center [@media(max-width:1050px)]:grid-cols-1"
            aria-labelledby="watch-title"
          >
            <div>
              <p className="text-meta leading-ui text-primary m-0 font-medium">See it in motion</p>
              <h2 className="section-title mt-[0.8rem] mb-0" id="watch-title">
                Omarchy Quattro
              </h2>
              <p className="text-lead leading-copy text-muted-foreground mt-[1.6rem] mb-0 max-w-[68ch]">
                Heavy on the terminal, definitely. Theme-delighted and tiling-window-managed too.
              </p>
            </div>
            <YouTubeVideo
              alt="Omarchy Quattro by David Heinemeier Hansson"
              id="F7fe9pa8OeE"
              poster="/assets/images/video/omarchy-quattro.webp"
              title="Omarchy introduction video"
            />
          </section>

          <section
            className="content-container section-divider pt-fluid-2xl pb-fluid-section"
            aria-labelledby="community-video-title"
          >
            <header className="mb-fluid-xl block">
              <div className="max-w-[950px]">
                <h2 className="section-title m-0" id="community-video-title">
                  They installed Omarchy and made up their own minds.
                </h2>
                <p className="text-lead leading-copy text-muted-foreground mt-[1.6rem] mb-0 max-w-[68ch]">
                  NetworkChuck, Typecraft, and LinuxBTW came for the Linux desktop. Alex Finn came
                  for the agents. See where each one landed.
                </p>
              </div>
            </header>
            <div className="gap-fluid-xl grid grid-cols-1 sm:grid-cols-2">
              {communityVideos.map((video) => (
                <CommunityVideoCard
                  creator={video.creator}
                  id={video.id}
                  key={video.id}
                  poster={video.poster}
                  title={video.title}
                />
              ))}
            </div>
          </section>

          <section className="content-container py-fluid-section" aria-labelledby="news-title">
            <header className="mb-10 flex items-end justify-between gap-8 [@media(max-width:520px)]:flex-col [@media(max-width:520px)]:items-start">
              <div>
                <p className="text-meta leading-ui text-primary m-0 font-medium">
                  From DHH and the Omarchy team
                </p>
                <h2 className="section-title mt-[0.8rem] mb-0" id="news-title">
                  Latest news
                </h2>
              </div>
              <Link
                className="text-small text-link underline-offset-[0.2em]"
                href="/news/"
                transitionTypes={["site-route"]}
              >
                All news →
              </Link>
            </header>
            <Suspense
              fallback={
                <ViewTransition exit="slide-down" default="none">
                  <NewsIndexSkeleton limit={4} />
                </ViewTransition>
              }
            >
              <ViewTransition enter="slide-up" default="none">
                <NewsIndex heading="h3" limit={4} />
              </ViewTransition>
            </Suspense>
          </section>
        </main>
      </div>
    </PageTransition>
  );
}
