import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PatronBadgeGlareGallery } from "@/components/patrons/patron-badge-glare-gallery";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderMeta,
  PageHeaderTitle,
} from "@/components/site/page-header";
import { PageTransition } from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowUpRightIcon, DownloadIcon } from "@/icons";
import { omarchyDonateUrl } from "@/lib/site-links";

const description =
  "Digital rally credentials for every Omarchy patron: a badge, a social card, and wallpapers for each tier.";

export const metadata: Metadata = {
  alternates: { canonical: "/patrons/badges/" },
  description,
  openGraph: {
    description,
    images: [
      {
        alt: "Four Omarchy patron badges",
        height: 1260,
        url: "/assets/images/social/patron-badges.png",
        width: 2400,
      },
    ],
    title: "Patron Badges",
    type: "website",
  },
  title: "Patron Badges — Omarchy",
  twitter: {
    card: "summary_large_image",
    description,
    images: [
      {
        alt: "Four Omarchy patron badges",
        url: "/assets/images/social/patron-badges.png",
      },
    ],
    title: "Patron Badges",
  },
};

const patronBadgeTiers = [
  {
    amount: "$16",
    description:
      "The entry class. Green foil, gravel flying, and a Quattro heading into the trees. Sixteen bucks gets you on the team.",
    folder: "016",
    id: "016",
    name: "Class 016",
    phase: 0.08,
    stage: "Forest Stage",
  },
  {
    amount: "$256",
    description:
      "Blue foil and a dusty hairpin high up the mountain. This is the class for those who want to put some real weight behind the mission.",
    folder: "256",
    id: "256",
    name: "Class 256",
    phase: 0.31,
    stage: "Mountain Hairpin",
  },
  {
    amount: "$2,048",
    description:
      "Violet foil under the floodlights of the service park, where the car gets rebuilt between stages. Two thousand dollars keeps a lot of open-source developers in the race.",
    folder: "2K",
    id: "2k",
    name: "Class 2K",
    phase: 0.57,
    stage: "Service Park",
  },
  {
    amount: "$8,192",
    description:
      "Magenta foil, four headlights, and a night stage carved out of the mountainside. The top class of open patronage. Thank you!",
    folder: "8K",
    id: "8k",
    name: "Class 8K",
    phase: 0.81,
    stage: "Night Stage",
  },
] as const;

type PatronBadgeTier = (typeof patronBadgeTiers)[number];

function BadgeDownloadLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      className="text-meta inline-flex min-h-8 items-center gap-2 text-(--link) underline-offset-[0.2em]"
      download
      href={href}
    >
      <DownloadIcon aria-hidden="true" size={13} />
      {label}
    </a>
  );
}

function PatronBadgeCard({ badge }: { badge: PatronBadgeTier }) {
  const assetBase = `/assets/images/badges/${badge.folder}/open-omarchy-${badge.folder}`;
  return (
    <Card
      className="group min-w-0 overflow-hidden bg-[color-mix(in_srgb,var(--card)_82%,var(--background))] [transition:border-color_180ms_ease,transform_180ms_ease] hover:[transform:translateY(-0.2rem)] hover:border-[color-mix(in_srgb,var(--primary),var(--border)_35%)]"
      id={badge.id}
    >
      <a
        aria-label={`Download the ${badge.name} badge`}
        className="p-fluid-md relative isolate block aspect-square overflow-hidden bg-(--darker-background)"
        data-badge-id={badge.id}
        data-badge-phase={badge.phase}
        data-patron-badge-art
        download
        href={`${assetBase}-badge.png`}
      >
        <span className="relative block size-full" data-patron-badge-stage>
          <span
            className="relative block size-full origin-center overflow-hidden"
            data-patron-badge-plane
          >
            <Image
              alt={`${badge.name} patron badge: ${badge.stage}`}
              className="block size-full object-cover data-[foil-live=true]:opacity-0"
              data-patron-badge-image
              height={640}
              sizes="(max-width: 800px) calc(100vw - 2.5rem), 42vw"
              src={`/assets/images/badges/${badge.folder}/preview.webp`}
              width={640}
            />
            <canvas
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-[1] block size-full opacity-0 data-[live=true]:opacity-100"
              data-patron-badge-glare
              height={1}
              width={1}
            />
          </span>
        </span>
      </a>

      <div className="p-fluid-md grid flex-1 content-start gap-5">
        <header>
          <p className="text-meta text-primary m-0 font-medium">
            {badge.stage} · {badge.amount}
          </p>
          <h2 className="text-title-md leading-display text-foreground mt-3 mb-0 font-normal tracking-[-0.04em]">
            <a className="text-inherit no-underline" href={`#${badge.id}`}>
              {badge.name}
            </a>
          </h2>
        </header>

        <p className="text-small leading-copy text-muted-foreground m-0">{badge.description}</p>

        <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-2">
          <BadgeDownloadLink href={`${assetBase}-badge.png`} label="Badge" />
          <BadgeDownloadLink href={`${assetBase}-social.png`} label="Social card" />
          <BadgeDownloadLink href={`${assetBase}-wallpaper.jpg`} label="Desktop" />
          <BadgeDownloadLink href={`${assetBase}-mobile.jpg`} label="Mobile" />
        </div>
      </div>
    </Card>
  );
}

export default function PatronBadgesPage() {
  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="page-main overflow-clip">
          <PageHeader backHref="/patrons/" backLabel="Patrons">
            <PageHeaderEyebrow>Omacom Foundation</PageHeaderEyebrow>
            <PageHeaderTitle>Patron badges</PageHeaderTitle>
            <PageHeaderDescription>
              Every patron gets a digital rally credential: a badge for the web, a card for social
              posts, and wallpapers for desktop and phone. Four classes, one for each tier.
            </PageHeaderDescription>
            <PageHeaderMeta className="flex flex-wrap items-center justify-center gap-3">
              <a
                className={buttonVariants({ size: "compact", variant: "primary" })}
                href={omarchyDonateUrl}
              >
                Become a patron
                <ArrowUpRightIcon aria-hidden="true" size={14} />
              </a>
              <Link
                className={buttonVariants({ size: "compact", variant: "secondary" })}
                href="/patrons/"
                transitionTypes={["site-route"]}
              >
                Meet the patrons
              </Link>
            </PageHeaderMeta>
          </PageHeader>

          <PatronBadgeGlareGallery>
            {patronBadgeTiers.map((badge) => (
              <PatronBadgeCard badge={badge} key={badge.id} />
            ))}
          </PatronBadgeGlareGallery>

          <p className="text-small leading-copy text-muted-foreground mt-fluid-2xl mx-auto mb-0 max-w-[70ch] text-center">
            Artwork by{" "}
            <a href="https://github.com/OldJobobo" className="text-(--link)">
              OldJobobo
            </a>
            , one of Omarchy’s{" "}
            <Link className="text-(--link)" href="/air/" transitionTypes={["site-route"]}>
              Artists in Residence
            </Link>
            .
          </p>
        </main>
      </PageTransition>
    </>
  );
}
