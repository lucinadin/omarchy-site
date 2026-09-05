import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

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
import { Card, CardFooter } from "@/components/ui/card";
import { ArrowUpRightIcon, MailIcon } from "@/icons";
import { omarchyDonateUrl } from "@/lib/site-links";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Omacom Foundation — Omarchy",
  description: "The foundation funding Omarchy.",
  alternates: { canonical: "/patrons/" },
  openGraph: {
    title: "Omacom Foundation",
    description: "The foundation funding Omarchy.",
    images: ["/assets/images/social/patrons.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Omacom Foundation",
    description: "The foundation funding Omarchy.",
    images: ["/assets/images/social/patrons.png"],
  },
};

const foundingPatrons = [
  {
    company: "Shopify",
    companyUrl: "https://www.shopify.com/",
    image: "/assets/images/patrons/tobi-lutke.webp",
    name: "Tobi Lütke",
    profileUrl: "https://x.com/tobi",
  },
  {
    company: "Stripe",
    companyUrl: "https://stripe.com",
    image: "/assets/images/patrons/patrick-collison.webp",
    name: "Patrick Collison",
    profileUrl: "https://x.com/patrickc",
  },
  {
    company: "Dell Technologies",
    companyUrl: "https://www.dell.com",
    image: "/assets/images/patrons/michael-dell.webp",
    name: "Michael Dell",
    profileUrl: "https://x.com/MichaelDell",
  },
  {
    company: "Block",
    companyUrl: "https://block.xyz",
    image: "/assets/images/patrons/jack-dorsey.webp",
    name: "Jack Dorsey",
    profileUrl: "https://x.com/jack",
  },
  {
    company: "Cloudflare",
    companyUrl: "https://www.cloudflare.com",
    image: "/assets/images/patrons/matthew-prince.webp",
    name: "Matthew Prince",
    profileUrl: "https://x.com/eastdakota",
  },
  {
    company: "Sesame",
    companyUrl: "https://www.sesame.com",
    image: "/assets/images/patrons/brendan-iribe.webp",
    name: "Brendan Iribe",
    profileUrl: "https://x.com/brendaniribe",
  },
  {
    company: "37signals",
    companyUrl: "https://37signals.com",
    image: "/assets/images/patrons/jason-fried.webp",
    name: "Jason Fried",
    profileUrl: "https://x.com/jasonfried",
  },
  {
    company: "Dropbox",
    companyUrl: "https://www.dropbox.com",
    image: "/assets/images/patrons/drew-houston.webp",
    name: "Drew Houston",
    profileUrl: "https://x.com/drewhouston",
  },
  {
    company: "OpenClaw",
    companyUrl: "https://openclaw.ai",
    image: "/assets/images/patrons/peter-steinberger.webp",
    name: "Peter Steinberger",
    profileUrl: "https://x.com/steipete",
  },
  {
    company: "Coinbase",
    companyUrl: "https://www.coinbase.com",
    image: "/assets/images/patrons/brian-armstrong.webp",
    name: "Brian Armstrong",
    profileUrl: "https://x.com/brian_armstrong",
  },
  {
    company: "TapTap",
    companyUrl: "https://www.taptap.io",
    image: "/assets/images/patrons/yunjie-dai.webp",
    name: "Yunjie Dai",
    profileUrl: "https://x.com/xdanger",
  },
  {
    company: "37signals",
    companyUrl: "https://37signals.com",
    image: "/assets/images/patrons/dhh.webp",
    name: "DHH",
    profileUrl: "https://dhh.dk",
  },
] as const;

const foundingTokenPatrons = [
  {
    image: "/assets/images/patrons/meta.webp",
    name: "Meta Superintelligence Labs",
    url: "https://www.meta.com/superintelligence/",
  },
] as const;

const distinguishedPatrons = [
  {
    company: "Oodle",
    companyUrl: "https://heyoodle.com/",
    image: "/assets/images/patrons/ryan-hughes.webp",
    name: "Ryan R. Hughes",
    profileUrl: "https://x.com/ryanrhughes",
  },
  {
    company: "DXStudio",
    companyUrl: "https://dxvc.ai",
    image: "/assets/images/patrons/ed-huang.webp",
    name: "Ed Huang",
    profileUrl: "https://x.com/dxhuang",
  },
  {
    company: "Metaco",
    companyUrl: "https://ripple.com/products/custody/",
    image: "/assets/images/patrons/adrien-treccani.webp",
    name: "Adrien Treccani",
    profileUrl: "https://www.linkedin.com/in/atreccani/",
  },
  {
    company: "Notion",
    companyUrl: "https://www.notion.com",
    image: "/assets/images/patrons/max-schoening.webp",
    name: "Max Schoening",
    profileUrl: "https://x.com/mschoening",
  },
] as const;

const corporatePatrons = [
  {
    image: "/assets/images/patrons/1password.webp",
    name: "1Password",
    url: "https://1password.com",
  },
  {
    image: "/assets/images/patrons/37signals.webp",
    name: "37signals",
    url: "https://37signals.com",
  },
] as const;

const distinguishedTokenPatrons = [
  {
    image: "/assets/images/patrons/anthropic.webp",
    name: "Anthropic",
    url: "https://www.anthropic.com",
  },
  {
    image: "/assets/images/patrons/fireworks.webp",
    name: "Fireworks",
    url: "https://fireworks.ai",
  },
  {
    image: "/assets/images/patrons/openai.webp",
    name: "OpenAI",
    url: "https://openai.com",
  },
] as const;

type Patron =
  | (typeof foundingPatrons)[number]
  | (typeof foundingTokenPatrons)[number]
  | (typeof distinguishedTokenPatrons)[number]
  | (typeof distinguishedPatrons)[number]
  | (typeof corporatePatrons)[number];

type PatronsSectionProps = {
  children: ReactNode;
  description: string;
  id: string;
  title: string;
  titleId: string;
};

function PatronsSection({ children, description, id, title, titleId }: PatronsSectionProps) {
  return (
    <section className="border-border py-fluid-section border-b" id={id} aria-labelledby={titleId}>
      <header className="mb-fluid-xl flex items-end justify-between gap-8 [@media(max-width:520px)]:flex-col [@media(max-width:520px)]:items-start">
        <h2
          className="text-title-lg text-bright-foreground m-0 font-light tracking-[-0.045em]"
          id={titleId}
        >
          <a className="[font-weight:inherit] text-inherit no-underline" href={`#${id}`}>
            {title}
          </a>
        </h2>
        <p className="text-small leading-copy text-muted-foreground m-0 text-right [@media(max-width:520px)]:text-left">
          {description}
        </p>
      </header>
      {children}
    </section>
  );
}

function PatronsGrid({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div
      className={cn(
        "gap-fluid-sm grid",
        compact
          ? "grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),14rem))] justify-center"
          : "grid-cols-4 [@media(max-width:1050px)]:grid-cols-3 [@media(max-width:800px)]:grid-cols-2"
      )}
    >
      {children}
    </div>
  );
}

function PatronPortrait({
  alt,
  contain = false,
  image,
  sizes,
}: {
  alt: string;
  contain?: boolean;
  image: string;
  sizes?: string;
}) {
  return (
    <Image
      alt={alt}
      className={cn(
        "block size-full [transition:filter_180ms_ease,transform_220ms_ease] group-hover:[transform:scale(1.025)] group-hover:[filter:saturate(1.08)_contrast(1.03)]",
        contain ? "object-contain" : "object-cover"
      )}
      height={240}
      sizes={sizes}
      src={image}
      width={240}
    />
  );
}

function PatronCard({ patron }: { patron: Patron }) {
  const isIndividualPatron = "profileUrl" in patron;
  const profileUrl = isIndividualPatron ? patron.profileUrl : patron.url;

  return (
    <Card className="group min-w-0 overflow-hidden bg-[color-mix(in_srgb,var(--card)_82%,var(--background))] [transition:background-color_180ms_ease,border-color_180ms_ease,transform_180ms_ease] hover:[transform:translateY(-0.2rem)] hover:border-[color-mix(in_srgb,var(--primary),var(--border)_35%)] hover:bg-[color-mix(in_srgb,var(--card)_88%,var(--primary)_12%)]">
      <a
        aria-label={isIndividualPatron ? `${patron.name} profile` : patron.name}
        className="block aspect-square overflow-hidden bg-(--darker-background)"
        href={profileUrl}
      >
        <PatronPortrait
          alt=""
          contain={!isIndividualPatron}
          image={patron.image}
          sizes={
            isIndividualPatron
              ? "(max-width: 520px) 42vw, (max-width: 1050px) 28vw, 18vw"
              : undefined
          }
        />
      </a>
      <div className="px-4 pt-4 pb-[0.9rem] [@media(max-width:520px)]:px-[0.8rem]">
        <h3 className="text-title-sm leading-ui text-foreground m-0 font-medium">
          <a className="no-underline" href={profileUrl}>
            {patron.name}
          </a>
        </h3>
      </div>
      {isIndividualPatron && (
        <CardFooter className="border-border mt-auto border-t px-4 py-[0.72rem] [@media(max-width:520px)]:px-[0.8rem]">
          <a
            className="text-meta text-muted-foreground hover:text-link flex w-full items-center justify-between gap-[0.35rem] no-underline"
            href={patron.companyUrl}
          >
            {patron.company}
            <ArrowUpRightIcon aria-hidden="true" size={13} />
          </a>
        </CardFooter>
      )}
    </Card>
  );
}

export default function PatronsPage() {
  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="page-main overflow-clip">
          <PageHeader>
            <PageHeaderEyebrow>Foundation</PageHeaderEyebrow>
            <PageHeaderTitle>The Omacom Foundation</PageHeaderTitle>
            <PageHeaderDescription>
              Twelve people put up a million dollars each. Four more put up $100,000 each, while
              1Password and 37signals committed $100,000 a year for three years. Four AI labs added
              another $1.95 million in compute tokens. That buys time and infrastructure for the
              public code and people behind it.
            </PageHeaderDescription>
            <PageHeaderMeta
              className="flex items-center gap-5 text-left"
              aria-label="Fourteen point nine five million dollars committed"
            >
              <strong className="text-title-xl leading-ui text-primary font-normal tracking-[-0.05em]">
                $14.95M
              </strong>
              <span className="text-small leading-ui text-muted-foreground max-w-[24ch]">
                committed by twenty-two backers
              </span>
            </PageHeaderMeta>
          </PageHeader>

          <PatronsSection
            description="Each contributing $1,000,000 to the mission"
            id="founding-patrons"
            title="Founding Patrons"
            titleId="founding-patrons-title"
          >
            <PatronsGrid>
              {foundingPatrons.map((patron) => (
                <PatronCard key={patron.name} patron={patron} />
              ))}
            </PatronsGrid>

            <a
              className="text-small text-link mt-6 flex items-center justify-end gap-2 underline-offset-[0.2em]"
              href="https://oligarchy.fyi"
            >
              Elite capital. Public code.
              <ArrowUpRightIcon aria-hidden="true" size={14} />
            </a>
          </PatronsSection>

          <PatronsSection
            description="Each contributing $1,500,000 in tokens to the mission"
            id="founding-token-patrons"
            title="Founding Token Patrons"
            titleId="founding-token-patrons-title"
          >
            <PatronsGrid compact>
              {foundingTokenPatrons.map((patron) => (
                <PatronCard key={patron.name} patron={patron} />
              ))}
            </PatronsGrid>
          </PatronsSection>

          <PatronsSection
            description="Each contributing $100,000 to the mission"
            id="distinguished-patrons"
            title="Distinguished Patrons"
            titleId="distinguished-patrons-title"
          >
            <PatronsGrid>
              {distinguishedPatrons.map((patron) => (
                <PatronCard key={patron.name} patron={patron} />
              ))}
            </PatronsGrid>

            <p className="text-small text-muted-foreground mt-6 mb-0 flex items-center justify-end gap-[0.45rem]">
              Get in touch with
              <a
                className="text-link inline-flex items-center gap-[0.4rem] underline-offset-[0.2em]"
                href="mailto:david@omarchy.org"
              >
                <MailIcon aria-hidden="true" size={14} />
                david@omarchy.org
              </a>
            </p>
          </PatronsSection>

          <PatronsSection
            description="Each contributing $100,000 a year for three years"
            id="distinguished-corporate-patrons"
            title="Distinguished Corporate Patrons"
            titleId="corporate-patrons-title"
          >
            <PatronsGrid compact>
              {corporatePatrons.map((patron) => (
                <PatronCard key={patron.name} patron={patron} />
              ))}
            </PatronsGrid>
          </PatronsSection>

          <PatronsSection
            description="Each contributing $150,000 in tokens to the mission"
            id="distinguished-token-patrons"
            title="Distinguished Token Patrons"
            titleId="distinguished-token-patrons-title"
          >
            <PatronsGrid compact>
              {distinguishedTokenPatrons.map((patron) => (
                <PatronCard key={patron.name} patron={patron} />
              ))}
            </PatronsGrid>
          </PatronsSection>

          <section
            className="gap-fluid-sm pt-fluid-section grid grid-cols-[minmax(0,1fr)]"
            aria-label="Other patron tiers"
          >
            <Card
              className="bg-[color-mix(in_srgb,var(--card)_78%,var(--background))]"
              id="everyone"
            >
              <div className="min-h-sponsor-panel gap-fluid-2xl p-fluid-lg grid">
                <div className="grid gap-4">
                  <p className="text-small leading-copy text-muted-foreground m-0">
                    Each contributing as they see fit to the mission
                  </p>
                  <h2 className="text-title-md leading-display text-foreground m-0 max-w-[14ch] font-normal tracking-[-0.045em]">
                    <a className="[font-weight:inherit] text-inherit no-underline" href="#everyone">
                      Patrons
                    </a>
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3 self-end">
                  <a
                    className={buttonVariants({ size: "compact", variant: "primary" })}
                    href={omarchyDonateUrl}
                  >
                    Become a patron
                  </a>
                  <Link
                    className={buttonVariants({ size: "compact", variant: "secondary" })}
                    href="/patrons/badges/"
                    transitionTypes={["site-route"]}
                  >
                    Collect your badge
                  </Link>
                </div>
              </div>
            </Card>
          </section>
        </main>
      </PageTransition>
    </>
  );
}
