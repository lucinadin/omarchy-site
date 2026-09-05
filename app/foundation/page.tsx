import type { Metadata } from "next";
import Link from "next/link";

import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from "@/components/site/page-header";
import { PageTransition } from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { Card, CardFooter } from "@/components/ui/card";
import { ArrowRightIcon, PaletteIcon, ShieldCheckIcon, UserGroupIcon } from "@/icons";

export const metadata: Metadata = {
  title: "The Omacom Foundation — Omarchy",
  description:
    "The nonprofit foundation that holds the trademarks, funds the infrastructure, and supports the projects and people Omarchy depends on.",
  alternates: { canonical: "/foundation/" },
  openGraph: {
    title: "The Omacom Foundation",
    description:
      "The nonprofit foundation that holds the trademarks, funds the infrastructure, and supports the projects and people Omarchy depends on.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Omacom Foundation",
    description:
      "The nonprofit foundation that holds the trademarks, funds the infrastructure, and supports the projects and people Omarchy depends on.",
  },
};

const foundationWork = [
  {
    description:
      "The foundation is funded by cash patrons, compute-token partners, and an open tier for everyone. Together they give Omarchy the time and infrastructure to stay independent.",
    href: "/patrons/",
    icon: UserGroupIcon,
    label: "The Patrons",
    title: "Patrons",
  },
  {
    description:
      "Multi-year sponsorships for the projects Omarchy is built on — Hyprland, Quickshell, and mise — so the people behind them can work without thinking about fundraising.",
    href: "/sponsorships/",
    icon: ShieldCheckIcon,
    label: "The Sponsorships",
    title: "Sponsorships",
  },
  {
    description:
      "Omarchy AIR pays artists a six-month stipend to work freely on themes, plugins, and whatever else makes the system beautiful.",
    href: "/air/",
    icon: PaletteIcon,
    label: "Omarchy AIR",
    title: "Artists in Residence",
  },
] as const;

export default function FoundationPage() {
  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="page-main overflow-clip">
          <PageHeader>
            <PageHeaderEyebrow>Omacom Foundation</PageHeaderEyebrow>
            <PageHeaderTitle>The nonprofit behind Omarchy</PageHeaderTitle>
            <PageHeaderDescription>
              It holds the trademarks, funds the infrastructure, promotes the work, and supports the
              open-source projects and developers the distro depends on.
            </PageHeaderDescription>
          </PageHeader>

          <section
            className="mt-fluid-section gap-fluid-sm grid grid-cols-3 [@media(max-width:1050px)]:grid-cols-1"
            aria-label="What the foundation supports"
          >
            {foundationWork.map((item) => {
              const Icon = item.icon;

              return (
                <Card
                  className="min-h-full bg-[color-mix(in_srgb,var(--card)_82%,var(--background))]"
                  key={item.title}
                >
                  <div className="p-fluid-lg grid gap-[1.4rem]">
                    <Icon aria-hidden="true" className="text-primary" size={22} strokeWidth={1.5} />
                    <h2 className="text-title-md leading-display text-foreground m-0 font-normal tracking-[-0.045em]">
                      {item.title}
                    </h2>
                    <p className="text-small leading-copy text-muted-foreground m-0 text-pretty">
                      {item.description}
                    </p>
                  </div>
                  <CardFooter className="border-border mt-auto border-t p-0">
                    <Link
                      className="text-meta text-foreground [&:hover]:bg-bright-foreground [&:hover]:text-background px-fluid-lg flex w-full items-center justify-between py-4 no-underline"
                      href={item.href}
                    >
                      {item.label}
                      <ArrowRightIcon aria-hidden="true" size={14} />
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </section>
        </main>
      </PageTransition>
    </>
  );
}
