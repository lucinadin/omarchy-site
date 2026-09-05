import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageBackLink } from "@/components/site/page-back-link";
import { PageTransition } from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { Card } from "@/components/ui/card";
import { ArrowLeftIcon, ArrowUpRightIcon } from "@/icons";

const SECURITY_CREDITS = [
  {
    credit: "Omarchy 4.0.2",
    href: "https://x.com/RogerKernel",
    image: "/assets/images/credits/roger-pinol.webp",
    name: "Roger Piñol",
  },
  {
    credit: "Omarchy 4.0.2",
    href: "https://x.com/LopesR1993",
    image: "/assets/images/credits/ruben-lopes.webp",
    name: "Ruben Lopes",
  },
  {
    credit: "Omarchy 4.0.2",
    href: "https://www.linkedin.com/in/afoliveira2/",
    image: "/assets/images/credits/afonso-oliveira.webp",
    name: "Afonso Oliveira",
  },
  {
    credit: "Omarchy 4.0.2",
    href: "https://x.com/encrypted_past",
    image: "/assets/images/credits/sick.webp",
    name: "_SiCk",
  },
  {
    credit: "Omarchy 4.0.2",
    href: "https://x.com/badsectorlabs",
    image: "/assets/images/credits/erik-hunstad.webp",
    name: "Erik Hunstad",
  },
  {
    credit: "First credited report",
    href: "https://x.com/teles_dev",
    image: "/assets/images/credits/teles.webp",
    name: "Teles",
  },
] as const;

export const metadata: Metadata = {
  title: "Security Credits — Omarchy",
  description:
    "Thanking the people who reported security issues in Omarchy privately, and gave us the chance to fix them.",
  alternates: { canonical: "/security/credits/" },
  openGraph: {
    title: "Security Credits",
    description:
      "Thanking the people who reported security issues in Omarchy privately, and gave us the chance to fix them.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Security Credits",
    description:
      "Thanking the people who reported security issues in Omarchy privately, and gave us the chance to fix them.",
  },
};

export default function SecurityCreditsPage() {
  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="page-main overflow-clip">
          <header className="mx-auto flex max-w-[900px] flex-col items-center text-center">
            <PageBackLink href="/security/">Security</PageBackLink>
            <p className="text-meta leading-ui text-primary m-0 font-medium">
              Responsible disclosure
            </p>
            <h1 className="text-title-xl text-bright-foreground mt-4 mb-0 font-light tracking-[-0.045em] text-balance">
              Security credits
            </h1>
            <p className="text-lead text-muted-foreground mt-6 mb-0 max-w-[70ch] text-pretty">
              They found it, told us privately, and waited for the patch.
            </p>
          </header>

          <section
            className="my-fluid-section gap-fluid-sm mx-auto grid max-w-[1120px] grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]"
            aria-label="Security researchers"
          >
            {SECURITY_CREDITS.map((researcher) => (
              <Card
                className="w-full overflow-hidden bg-[color-mix(in_srgb,var(--card)_82%,var(--background))]"
                key={researcher.name}
              >
                <a
                  aria-label={`${researcher.name} profile`}
                  className="block aspect-square bg-(--darker-background)"
                  href={researcher.href}
                >
                  <Image
                    alt={researcher.name}
                    className="h-full w-full object-cover"
                    height={240}
                    sizes="(max-width: 700px) 100vw, (max-width: 1050px) 50vw, 33vw"
                    src={researcher.image}
                    width={240}
                  />
                </a>
                <div className="border-border border-t p-[1.4rem]">
                  <p className="text-micro leading-ui text-primary mt-0 mb-[0.45rem] font-bold">
                    {researcher.credit}
                  </p>
                  <h2 className="m-0 tracking-[-0.045em]">
                    <a
                      className="text-title-sm leading-display text-foreground inline-flex items-center gap-2 font-medium no-underline"
                      href={researcher.href}
                    >
                      {researcher.name}
                      <ArrowUpRightIcon aria-hidden="true" size={15} />
                    </a>
                  </h2>
                </div>
              </Card>
            ))}
          </section>

          <footer className="border-border mx-auto flex max-w-[900px] items-center justify-between gap-8 border-t pt-8 [@media(max-width:520px)]:flex-col [@media(max-width:520px)]:items-start">
            <p className="text-small leading-copy text-muted-foreground m-0">
              Found something?{" "}
              <Link className="text-link underline-offset-[0.2em]" href="/security/">
                Report it privately
              </Link>
              . The first reporter of a confirmed vulnerability is credited here.
            </p>
            <Link
              className="text-meta text-link inline-flex flex-none items-center gap-[0.45rem] underline-offset-[0.2em]"
              href="/security/"
            >
              <ArrowLeftIcon aria-hidden="true" size={14} />
              Security policy
            </Link>
          </footer>
        </main>
      </PageTransition>
    </>
  );
}
