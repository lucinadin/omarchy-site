import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderMeta,
  PageHeaderTitle,
} from "@/components/site/page-header";
import { PageTransition } from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { ArrowRightIcon, ArrowUpRightIcon } from "@/icons";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sponsorships — Omarchy",
  description:
    "The open-source projects the Omacom Foundation sponsors: Hyprland, Quickshell, and mise.",
  alternates: { canonical: "/sponsorships/" },
  openGraph: {
    title: "Omacom Foundation Funding",
    description:
      "The open-source projects the Omacom Foundation sponsors: Hyprland, Quickshell, and mise.",
    images: ["/assets/images/social/sponsorships.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Omacom Foundation Funding",
    description:
      "The open-source projects the Omacom Foundation sponsors: Hyprland, Quickshell, and mise.",
    images: ["/assets/images/social/sponsorships.png"],
  },
};

const sponsorships = [
  {
    announcementHref: "/news/2026/08/omacom-foundation-to-be-exclusive-hyprland-sponsor/",
    creator: "Vaxry",
    creatorUrl: "https://x.com/vaxryy",
    description:
      "Hyprland has been at the heart of Omarchy since day one. The three-year sponsorship gives Vaxry room to focus on the compositor and makes Hyprperks free for everyone.",
    image: "/assets/images/logos/hyprland.svg",
    imageHeight: 348,
    imageWidth: 290,
    level: "Exclusive",
    name: "Hyprland",
    projectUrl: "https://hypr.land/",
  },
  {
    announcementHref: "/news/2026/08/omacom-foundation-to-be-premier-quickshell-sponsor/",
    creator: "outfoxxed",
    creatorUrl: "https://x.com/outfoxxedd",
    description:
      "Quickshell draws the Omarchy bar, menu, notifications, OSDs, and lock screen. The three-year sponsorship backs the toolkit behind the desktop introduced with Quattro.",
    image: "/assets/images/logos/quickshell.svg",
    imageHeight: 725,
    imageWidth: 725,
    level: "Premier",
    name: "Quickshell",
    projectUrl: "https://quickshell.org/",
  },
  {
    announcementHref: "/news/2026/08/omacom-foundation-to-be-premier-mise-sponsor/",
    creator: "jdx",
    creatorUrl: "https://x.com/jdxcode",
    description:
      "mise manages language runtimes and lazy-loads coding-agent CLIs throughout Omarchy. The sponsorship supports the maintenance work that keeps new tools one command away.",
    image: "/assets/images/logos/mise.svg",
    imageHeight: 226,
    imageWidth: 215,
    level: "Premier",
    name: "mise",
    projectUrl: "https://mise.jdx.dev/",
  },
] as const;

export default function SponsorshipsPage() {
  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="page-main overflow-clip">
          <PageHeader>
            <PageHeaderEyebrow>Sponsorships</PageHeaderEyebrow>
            <PageHeaderTitle>Funding the tools Omarchy runs on</PageHeaderTitle>
            <PageHeaderDescription>
              The Omacom Foundation puts patron funding back into the open-source projects Omarchy
              depends on.
            </PageHeaderDescription>
            <PageHeaderMeta className="flex items-center gap-4">
              <strong className="text-title-xl text-primary leading-none font-normal tracking-[-0.05em]">
                {sponsorships.length}
              </strong>
              <span className="text-small leading-ui text-muted-foreground max-w-none">
                active project sponsorships
              </span>
            </PageHeaderMeta>
          </PageHeader>

          <section
            className="min-[1200px]:gap-fluid-sm min-[1200px]:py-fluid-xl grid min-[1200px]:grid-cols-2"
            aria-label="Funded projects"
          >
            {sponsorships.map((sponsorship) => (
              <article
                className="border-border gap-fluid-layout py-fluid-section min-[1200px]:gap-fluid-sm min-[1200px]:p-fluid-xs grid grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.3fr)] border-b min-[1200px]:grid-cols-1 min-[1200px]:grid-rows-[var(--spacing-sponsor-panel)_minmax(0,1fr)] min-[1200px]:border [@media(max-width:800px)]:grid-cols-1 [@media(max-width:800px)]:gap-8"
                key={sponsorship.name}
              >
                <a
                  aria-label={`${sponsorship.name} website`}
                  className="group border-border min-h-sponsor-panel p-fluid-2xl flex items-center justify-center overflow-hidden border bg-[color-mix(in_srgb,var(--darker-background)_88%,var(--card))] min-[1200px]:h-full min-[1200px]:min-h-0 [@media(max-width:800px)]:min-h-60"
                  href={sponsorship.projectUrl}
                >
                  <Image
                    alt={`${sponsorship.name} logo`}
                    className={cn(
                      "max-h-brand-mark block h-auto w-auto max-w-[min(100%,15rem)] [transition:filter_180ms_ease,opacity_180ms_ease,transform_220ms_ease] group-hover:[transform:scale(1.035)] group-hover:opacity-[0.86] group-hover:[filter:saturate(1.06)_contrast(1.03)]",
                      sponsorship.name === "Hyprland" && "max-w-36"
                    )}
                    height={sponsorship.imageHeight}
                    sizes="(max-width: 800px) 40vw, 20vw"
                    src={sponsorship.image}
                    width={sponsorship.imageWidth}
                  />
                </a>

                <div className="gap-fluid-lg grid min-w-0 content-center min-[1200px]:content-start">
                  <div className="flex items-start justify-between gap-8 [@media(max-width:520px)]:flex-col">
                    <div className="grid gap-[0.55rem]">
                      <span className="text-meta text-primary font-bold uppercase">
                        {sponsorship.level}
                      </span>
                      <h2 className="section-title m-0">{sponsorship.name}</h2>
                    </div>
                    <a
                      className="text-meta text-link mt-[0.3rem] inline-flex flex-none items-center gap-[0.45rem] underline-offset-[0.2em]"
                      href={sponsorship.projectUrl}
                    >
                      Visit project
                      <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
                    </a>
                  </div>

                  <p className="text-body leading-copy text-muted-foreground m-0 max-w-[66ch] text-pretty">
                    {sponsorship.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-7 gap-y-[0.9rem]">
                    <Link
                      className="text-meta text-link inline-flex items-center gap-[0.45rem] underline-offset-[0.2em]"
                      href={sponsorship.announcementHref}
                      transitionTypes={["site-route"]}
                    >
                      Read the announcement
                      <ArrowRightIcon aria-hidden="true" className="size-3.5" />
                    </Link>
                    <a
                      className="text-meta text-link inline-flex items-center gap-[0.45rem] underline-offset-[0.2em]"
                      href={sponsorship.creatorUrl}
                    >
                      Built by {sponsorship.creator}
                      <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
                    </a>
                  </div>
                </div>
              </article>
            ))}

            <article className="border-border gap-fluid-layout py-fluid-section min-[1200px]:gap-fluid-sm min-[1200px]:p-fluid-xs grid grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.3fr)] border-b min-[1200px]:grid-cols-1 min-[1200px]:grid-rows-[var(--spacing-sponsor-panel)_minmax(0,1fr)] min-[1200px]:border [@media(max-width:800px)]:grid-cols-1 [@media(max-width:800px)]:gap-8">
              <div className="group border-border min-h-sponsor-panel p-fluid-2xl flex items-center justify-center overflow-hidden border bg-[color-mix(in_srgb,var(--darker-background)_88%,var(--card))] text-[color-mix(in_srgb,var(--muted-foreground)_38%,transparent)] min-[1200px]:h-full min-[1200px]:min-h-0 [@media(max-width:800px)]:min-h-60">
                <span className="text-symbol leading-none font-light" aria-hidden="true">
                  +
                </span>
              </div>
              <div className="gap-fluid-lg grid min-w-0 content-center min-[1200px]:content-start">
                <div className="flex items-start justify-between gap-8 [@media(max-width:520px)]:flex-col">
                  <div className="grid gap-[0.55rem]">
                    <span className="text-meta text-primary font-bold uppercase">
                      To be announced
                    </span>
                    <h2 className="section-title m-0">Next sponsorship</h2>
                  </div>
                </div>
              </div>
            </article>
          </section>

          <section className="pt-fluid-2xl flex items-center justify-between gap-8 [@media(max-width:520px)]:flex-col [@media(max-width:520px)]:items-start">
            <p className="text-small text-muted-foreground m-0">Funded by the Omacom Foundation</p>
            <Link
              className="text-meta text-link inline-flex items-center gap-[0.45rem] underline-offset-[0.2em]"
              href="/patrons/"
              transitionTypes={["site-route"]}
            >
              Meet the founding patrons
              <ArrowRightIcon aria-hidden="true" className="size-3.5" />
            </Link>
          </section>
        </main>
      </PageTransition>
    </>
  );
}
