import type { SearchEntry } from "@/features/discovery/types";
import { siteTagline } from "@/lib/site-brand";
import { omarchyDonateUrl, omarchyIsoDownloadUrl } from "@/lib/site-links";

export type SitePage = {
  description: string;
  title: string;
  url: string;
};

export const sitePages: readonly SitePage[] = [
  {
    description: `${siteTagline}.`,
    title: "Omarchy",
    url: "/",
  },
  {
    description:
      "A six-month residency for artists working on themes, plugins, and everything else that makes Omarchy beautiful.",
    title: "Omarchy AIR",
    url: "/air/",
  },
  {
    description: "The official Omarchy logo and wordmark, and the terms for using them.",
    title: "The Omarchy Brand",
    url: "/brand/",
  },
  {
    description:
      "The nonprofit foundation that holds the trademarks, funds the infrastructure, and supports the projects and people Omarchy depends on.",
    title: "The Omacom Foundation",
    url: "/foundation/",
  },
  {
    description: "Omarchy meetups around the world, plus the guidelines for running one.",
    title: "Omarchy Meetups",
    url: "/meetups/",
  },
  {
    description: "The story of Omakub, the omakase developer setup for Ubuntu that led to Omarchy.",
    title: "The Story of Omakub",
    url: "/omakub/",
  },
  {
    description: "The foundation funding Omarchy.",
    title: "Omacom Foundation Patrons",
    url: "/patrons/",
  },
  {
    description:
      "Digital rally credentials for every Omarchy patron: a badge, a social card, and wallpapers for each tier.",
    title: "Omarchy Patron Badges",
    url: "/patrons/badges/",
  },
  {
    description: "How to responsibly report a security vulnerability in Omarchy.",
    title: "Security at Omarchy",
    url: "/security/",
  },
  {
    description:
      "The people who reported security issues in Omarchy privately and gave us the chance to fix them.",
    title: "Security Credits",
    url: "/security/credits/",
  },
  {
    description:
      "The open-source projects the Omacom Foundation sponsors: Hyprland, Quickshell, and mise.",
    title: "Omacom Foundation Sponsorships",
    url: "/sponsorships/",
  },
  {
    description: "The teams guiding Omarchy.",
    title: "The Omarchy Teams",
    url: "/teams/",
  },
  {
    description: "The official and community-made themes for Omarchy.",
    title: "Omarchy Themes",
    url: "/themes/",
  },
  {
    description: "Omarchy workstations shared by the community.",
    title: "Omarchy Workstations",
    url: "/workstations/",
  },
];

export const projectResources: readonly SearchEntry[] = [
  {
    external: true,
    kind: "resource",
    text: "Support the Omacom Foundation and claim a patron badge.",
    title: "Become an Omarchy patron",
    url: omarchyDonateUrl,
  },
  {
    external: true,
    kind: "resource",
    text: "Download the latest Omarchy ISO image.",
    title: "Get the ISO",
    url: omarchyIsoDownloadUrl,
  },
  {
    external: true,
    kind: "resource",
    text: "The source code for Omarchy on GitHub.",
    title: "Omarchy on GitHub",
    url: "https://github.com/omacom/omarchy",
  },
  {
    external: true,
    kind: "resource",
    text: "Plugins made for Omarchy.",
    title: "Omarchy Plugins",
    url: "https://omarchyplugins.com/",
  },
  {
    external: true,
    kind: "resource",
    text: "Join the Omarchy community on Discord.",
    title: "Omarchy Discord",
    url: "https://discord.gg/tXFUdasqhY",
  },
  {
    external: true,
    kind: "resource",
    text: "Official Omarchy shirts, hats, and other merchandise.",
    title: "Omarchy Merch",
    url: "https://supply.37signals.com/collections/omarchy",
  },
];
