import { omarchyDonateUrl, omarchyIsoDownloadUrl } from "@/lib/site-links";

export type SiteLink = {
  href: string;
  internal?: boolean;
  label: string;
};

export function getSiteLinkKind(link: SiteLink) {
  return link.internal ? "internal" : "external";
}

type SiteLinkGroup = {
  label: string;
  links: readonly SiteLink[];
};

export const primaryLinks: readonly SiteLink[] = [
  { href: "/themes/", internal: true, label: "Themes" },
  { href: "/manual/", internal: true, label: "Manual" },
  { href: "/news/", internal: true, label: "News" },
  {
    href: "https://supply.37signals.com/collections/omarchy",
    label: "Merch",
  },
];

export const moreLinkGroups: readonly SiteLinkGroup[] = [
  {
    label: "Project",
    links: [
      { href: "https://github.com/omacom/omarchy", label: "GitHub" },
      { href: "https://omarchyplugins.com/", label: "Plugins" },
      { href: "/security/", internal: true, label: "Security" },
      { href: "/brand/", internal: true, label: "Brand" },
    ],
  },
  {
    label: "Community",
    links: [
      { href: "/teams/", internal: true, label: "Teams" },
      { href: "/air/", internal: true, label: "AIR" },
      { href: "/meetups/", internal: true, label: "Meetups" },
      { href: "/workstations/", internal: true, label: "Workstations" },
      { href: "https://discord.gg/tXFUdasqhY", label: "Discord" },
    ],
  },
  {
    label: "Foundation",
    links: [
      { href: "/foundation/", internal: true, label: "About" },
      { href: "/patrons/", internal: true, label: "Patrons" },
      { href: "/patrons/badges/", internal: true, label: "Patron badges" },
      { href: omarchyDonateUrl, label: "Donate" },
      { href: "/sponsorships/", internal: true, label: "Sponsorships" },
    ],
  },
];

export const footerLinkGroups: readonly SiteLinkGroup[] = [
  {
    label: "Use Omarchy",
    links: [
      { href: omarchyIsoDownloadUrl, label: "Get the ISO" },
      { href: "/manual/", internal: true, label: "Manual" },
      { href: "/themes/", internal: true, label: "Themes" },
      { href: "https://omarchyplugins.com/", label: "Plugins" },
      { href: "https://omarchy.org/screensaver/", label: "Screensaver" },
    ],
  },
  {
    label: "Community",
    links: [
      { href: "/news/", internal: true, label: "News" },
      { href: "/teams/", internal: true, label: "Teams" },
      { href: "/air/", internal: true, label: "AIR" },
      { href: "/meetups/", internal: true, label: "Meetups" },
      { href: "/workstations/", internal: true, label: "Workstations" },
      { href: "https://discord.gg/tXFUdasqhY", label: "Discord" },
    ],
  },
  {
    label: "Foundation",
    links: [
      { href: "/foundation/", internal: true, label: "About" },
      { href: "/patrons/", internal: true, label: "Patrons" },
      { href: "/patrons/badges/", internal: true, label: "Patron badges" },
      { href: omarchyDonateUrl, label: "Donate" },
      { href: "/sponsorships/", internal: true, label: "Sponsorships" },
    ],
  },
  {
    label: "Project",
    links: [
      { href: "https://github.com/omacom/omarchy", label: "GitHub" },
      {
        href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        label: "Code of conduct",
      },
      { href: "/security/", internal: true, label: "Security" },
      { href: "/brand/", internal: true, label: "Brand" },
      { href: "/omakub/", internal: true, label: "Omakub" },
      {
        href: "https://supply.37signals.com/collections/omarchy",
        label: "Merch",
      },
    ],
  },
];
