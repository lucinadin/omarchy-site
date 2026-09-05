import type { Metadata } from "next";
import Image from "next/image";

import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from "@/components/site/page-header";
import { PageTransition } from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { buttonVariants } from "@/components/ui/button";
import { DownloadIcon } from "@/icons";

export const metadata: Metadata = {
  title: "Brand — Omarchy",
  description: "The official Omarchy logo and wordmark, and the terms for using them.",
  alternates: { canonical: "/brand/" },
  openGraph: {
    title: "The Omarchy Brand",
    description: "The official Omarchy logo and wordmark, and the terms for using them.",
    images: ["/assets/images/opengraph.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Omarchy Brand",
    description: "The official Omarchy logo and wordmark, and the terms for using them.",
    images: ["/assets/images/opengraph.png"],
  },
};

const brandColors = [
  { color: "#9ece6a", label: "Wordmark" },
  { color: "#1a1b26", label: "Background" },
  { color: "#0e0e14", label: "Deep background" },
  { color: "#c0caf5", label: "Bright text" },
] as const;

function DownloadLink({ href, label }: { href: string; label: string }) {
  return (
    <a className={buttonVariants({ size: "compact", variant: "secondary" })} download href={href}>
      {label}
      <DownloadIcon aria-hidden="true" size={14} />
    </a>
  );
}

export default function BrandPage() {
  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="brand-shell page-main pb-fluid-section overflow-clip">
          <PageHeader>
            <PageHeaderEyebrow>Official assets</PageHeaderEyebrow>
            <PageHeaderTitle>The Omarchy brand</PageHeaderTitle>
            <PageHeaderDescription>
              The official Omarchy logo and wordmark, and the terms for using them.
            </PageHeaderDescription>
          </PageHeader>

          <section
            className="gap-fluid-lg py-fluid-section grid content-start"
            aria-labelledby="brand-wordmark-title"
          >
            <header>
              <h2
                className="text-title-md text-foreground m-0 font-normal tracking-[-0.04em]"
                id="brand-wordmark-title"
              >
                Wordmark
              </h2>
            </header>
            <figure className="border-border p-fluid-layout m-0 flex min-w-0 items-center justify-center overflow-hidden border bg-(--darker-background)">
              <Image
                alt="OMARCHY wordmark"
                className="block h-auto w-[min(100%,70rem)] max-w-full"
                height={950}
                priority
                sizes="(max-width: 800px) 84vw, 72vw"
                src="/assets/brand/omarchy-wordmark.svg"
                width={4131}
              />
            </figure>
            <div className="flex flex-wrap gap-3" aria-label="Wordmark downloads">
              <DownloadLink href="/assets/brand/omarchy-wordmark.svg" label="SVG · vector" />
              <DownloadLink href="/assets/brand/omarchy-wordmark.png" label="PNG · 4096px" />
            </div>
          </section>

          <div className="border-border gap-fluid-2xl grid grid-cols-2 border-t [@media(max-width:800px)]:grid-cols-1">
            <section
              className="gap-fluid-lg py-fluid-2xl grid content-start"
              aria-labelledby="brand-logo-title"
            >
              <header>
                <h2
                  className="text-title-md text-foreground m-0 font-normal tracking-[-0.04em]"
                  id="brand-logo-title"
                >
                  Logo
                </h2>
              </header>
              <figure className="border-border p-fluid-layout [@media(width>800px)]:h-brand-panel m-0 flex min-w-0 items-center justify-center overflow-hidden border bg-(--darker-background) [@media(max-width:800px)]:min-h-96">
                <Image
                  alt="Omarchy logo"
                  className="block h-auto w-[min(55%,18rem)] max-w-full"
                  height={1200}
                  sizes="(max-width: 800px) 42vw, 18vw"
                  src="/assets/brand/omarchy-logo.svg"
                  width={1200}
                />
              </figure>
              <div className="flex flex-wrap gap-3" aria-label="Logo downloads">
                <DownloadLink href="/assets/brand/omarchy-logo.svg" label="SVG · vector" />
                <DownloadLink href="/assets/brand/omarchy-logo.png" label="PNG · 4096px" />
              </div>
            </section>

            <section
              className="gap-fluid-lg py-fluid-2xl grid content-start"
              aria-labelledby="brand-colors-title"
            >
              <header>
                <h2
                  className="text-title-md text-foreground m-0 font-normal tracking-[-0.04em]"
                  id="brand-colors-title"
                >
                  Official palette
                </h2>
              </header>
              <div className="border-border [@media(width>800px)]:h-brand-panel grid grid-cols-2 border [@media(max-width:520px)]:grid-cols-1">
                {brandColors.map(({ color, label }) => (
                  <div
                    className="border-border grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-center gap-4 p-4 [@media(max-width:520px)]:[&:nth-child(n+2)]:border-t [@media(width>520px)]:[&:nth-child(even)]:border-l [@media(width>520px)]:[&:nth-child(n+3)]:border-t"
                    key={color}
                  >
                    <span
                      aria-hidden="true"
                      className="block aspect-square border border-[color-mix(in_srgb,var(--bright-foreground)_28%,transparent)]"
                      style={{ backgroundColor: color }}
                    />
                    <div className="grid min-w-0 gap-[0.3rem]">
                      <strong className="text-meta text-bright-foreground">{label}</strong>
                      <code className="text-meta text-muted-foreground">{color}</code>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section
            className="border-border gap-fluid-lg py-fluid-section grid content-start border-t"
            aria-labelledby="brand-oma-logo-title"
          >
            <h2
              className="text-title-md text-foreground m-0 font-normal tracking-[-0.04em]"
              id="brand-oma-logo-title"
            >
              OMA Logo
            </h2>
            <figure className="border-border p-fluid-layout m-0 flex min-w-0 items-center justify-center overflow-hidden border bg-(--darker-background)">
              <Image
                alt="OMA logo"
                className="block h-auto w-[min(55%,18rem)] max-w-full"
                height={800}
                src="/assets/brand/oma-logo.svg"
                width={800}
              />
            </figure>
            <div className="flex flex-wrap gap-3" aria-label="OMA Logo downloads">
              <DownloadLink href="/assets/brand/oma-logo.svg" label="SVG · vector" />
              <DownloadLink href="/assets/brand/oma-logo.png" label="PNG · 4096px" />
            </div>
          </section>

          <section
            className="border-border pt-fluid-section flex justify-center border-t text-center"
            aria-labelledby="brand-trademark-title"
          >
            <div className="grid max-w-3xl justify-items-center gap-4">
              <h2
                className="text-title-md text-foreground m-0 font-normal tracking-[-0.04em]"
                id="brand-trademark-title"
              >
                Trademark
              </h2>
              <p className="text-ui leading-copy text-muted-foreground m-0">
                Omarchy is a pending trademark. All rights reserved.
              </p>
              <p className="text-ui leading-copy text-muted-foreground m-0">
                Write{" "}
                <a className="text-link underline-offset-[0.2em]" href="mailto:david@omarchy.org">
                  david@omarchy.org
                </a>{" "}
                for partnerships.
              </p>
            </div>
          </section>
        </main>
      </PageTransition>
    </>
  );
}
