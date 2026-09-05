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
import { Card } from "@/components/ui/card";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BadgeCheckIcon,
  BotIcon,
  CircleDollarSignIcon,
} from "@/icons";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Omarchy AIR | Artists in Residence",
  description:
    "A six-month residency for artists working on themes, plugins, and everything else that makes Omarchy beautiful.",
  alternates: { canonical: "/air/" },
  openGraph: {
    title: "Omarchy AIR",
    description:
      "A six-month residency for artists working on themes, plugins, and everything else that makes Omarchy beautiful.",
    images: ["/assets/images/social/air.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Omarchy AIR",
    description:
      "A six-month residency for artists working on themes, plugins, and everything else that makes Omarchy beautiful.",
    images: ["/assets/images/social/air.png"],
  },
};

const residents = [
  {
    image: "/assets/images/air/hancore.webp",
    name: "HANCORE",
    profileUrl: "https://github.com/HANCORE-linux",
    work: "Themes and plugins",
    description: (
      <>
        Solitude and Last Horizon ship with Omarchy, with another twenty themes on the extras page.
        He also sits on <Link href="/teams/">Omarchy Core</Link> and helps steward the{" "}
        <a href="https://omarchyplugins.com/">plugin ecosystem</a>.
      </>
    ),
  },
  {
    image: "/assets/images/air/oldjobobo.webp",
    name: "OldJobobo",
    profileUrl: "https://github.com/OldJobobo",
    work: "Whole-system palettes",
    description: (
      <>
        Lumon, Miasma, and Retro 82 ship with Omarchy. His palettes hold together across the
        terminal, Neovim, btop, and the shell, with ten more available on the{" "}
        <Link href="/themes/">themes page</Link>.
      </>
    ),
  },
  {
    image: "/assets/images/air/taha.webp",
    name: "Taha",
    profileUrl: "https://github.com/tahayvr",
    work: "Identity and theme tools",
    description: (
      <>
        He drew the Omarchy logo and built{" "}
        <a href="https://github.com/tahayvr/omarchist">Omarchist</a>, the GUI for making themes
        without touching a config file. Matte Black is his and ships with Omarchy.
      </>
    ),
  },
] as const;

const support = [
  {
    detail: "for the full six months",
    icon: CircleDollarSignIcon,
    label: "$2,500/month",
  },
  {
    detail: "so the agents never need to stop",
    icon: BotIcon,
    label: "Token account",
  },
  {
    detail: "as AIR alumni after the residency",
    icon: BadgeCheckIcon,
    label: "Permanent recognition",
  },
] as const;

export default function AirPage() {
  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="page-main overflow-clip">
          <PageHeader>
            <PageHeaderEyebrow>Omarchy AIR</PageHeaderEyebrow>
            <PageHeaderTitle>Artists in Residence</PageHeaderTitle>
            <PageHeaderDescription>
              A six-month residency for artists who make Omarchy beautiful. Themes, plugins, and
              whatever else. The Omacom Foundation gives them the time and support to make.
            </PageHeaderDescription>
            <PageHeaderMeta className="flex items-center gap-[0.9rem] text-left">
              <strong className="text-title-lg text-primary leading-none font-light tracking-[-0.06em]">
                3
              </strong>
              <span className="text-meta leading-ui text-bright-foreground">
                first residents
                <small className="text-micro text-muted-foreground mt-[0.15rem] block">
                  Up to five seats at a time
                </small>
              </span>
            </PageHeaderMeta>
          </PageHeader>

          <section className="py-fluid-section" aria-labelledby="air-residents-title">
            <header
              className={cn(
                "mb-fluid-xl flex items-end justify-between gap-8",
                "[@media(max-width:800px)]:flex-col [@media(max-width:800px)]:items-start"
              )}
            >
              <div>
                <p className="section-label">The first residents</p>
                <h2 className="section-title mt-[0.9rem] mb-0" id="air-residents-title">
                  Already shaping Omarchy
                </h2>
              </div>
              <p className="text-small leading-copy text-muted-foreground m-0 max-w-[34ch] text-right text-pretty [@media(max-width:800px)]:text-left">
                Three artists whose work already runs through the system.
              </p>
            </header>

            <div
              className={cn(
                "gap-fluid-sm grid grid-cols-3",
                "[@media(max-width:1050px)]:grid-cols-2 [@media(max-width:520px)]:grid-cols-1"
              )}
            >
              {residents.map((resident) => (
                <Card
                  className="min-w-0 overflow-hidden bg-[color-mix(in_srgb,var(--card)_82%,var(--background))] [&:hover_img]:[transform:scale(1.02)] [&:hover_img]:[filter:saturate(1.08)]"
                  key={resident.name}
                >
                  <a
                    aria-label={`${resident.name} on GitHub`}
                    className="relative block aspect-[16/11] overflow-hidden bg-(--darker-background)"
                    href={resident.profileUrl}
                  >
                    <Image
                      alt=""
                      className="object-cover [transition:filter_180ms_ease,transform_220ms_ease]"
                      fill
                      sizes="(max-width: 720px) calc(100vw - 2.5rem), (max-width: 1100px) 45vw, 30vw"
                      src={resident.image}
                    />
                  </a>
                  <div className="p-fluid-md grid gap-6">
                    <div>
                      <p className="text-micro text-primary mt-0 mb-[0.45rem] font-bold">
                        {resident.work}
                      </p>
                      <h3 className="m-0">
                        <a
                          className="text-title-md text-foreground inline-flex items-center gap-2 font-normal tracking-[-0.035em] no-underline"
                          href={resident.profileUrl}
                        >
                          {resident.name}
                          <ArrowUpRightIcon aria-hidden="true" size={15} />
                        </a>
                      </h3>
                    </div>
                    <p className="text-small leading-copy text-muted-foreground [&_a]:text-link m-0 text-pretty [&_a]:underline-offset-[0.2em]">
                      {resident.description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            <p className="text-meta text-muted-foreground mt-6 mb-0 text-right">
              Remaining seats are by invitation.
            </p>
          </section>

          <section
            className={cn(
              "border-border gap-x-fluid-layout py-fluid-section grid grid-cols-[minmax(15rem,0.65fr)_minmax(0,1fr)] items-end gap-y-10 border-t",
              "[@media(max-width:800px)]:grid-cols-1"
            )}
            aria-labelledby="air-support-title"
          >
            <header>
              <p className="section-label">The residency</p>
              <h2 className="section-title mt-[0.9rem] mb-0" id="air-support-title">
                Six months to make something good
              </h2>
            </header>

            <div className="border-border border-t">
              {support.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className={cn(
                      "border-border grid grid-cols-[auto_minmax(9rem,0.6fr)_minmax(0,1fr)] items-center gap-4 border-b py-4",
                      "[@media(max-width:520px)]:grid-cols-[auto_minmax(0,1fr)] [@media(max-width:520px)]:items-start"
                    )}
                    key={item.label}
                  >
                    <Icon aria-hidden="true" className="text-primary" size={21} strokeWidth={1.5} />
                    <strong className="text-small text-bright-foreground">{item.label}</strong>
                    <span className="text-meta leading-ui text-muted-foreground [@media(max-width:520px)]:col-start-2">
                      {item.detail}
                    </span>
                  </div>
                );
              })}
            </div>

            <Link
              className="text-meta text-link col-start-2 inline-flex items-center gap-[0.45rem] justify-self-start underline-offset-[0.2em] [@media(max-width:800px)]:col-start-1"
              href="/news/2026/08/introducing-omarchy-air/"
              transitionTypes={["nav-forward"]}
            >
              Read the announcement
              <ArrowRightIcon aria-hidden="true" size={14} />
            </Link>
          </section>
        </main>
      </PageTransition>
    </>
  );
}
