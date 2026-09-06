import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { LogoEffectsSurface } from "@/features/effects/components/logo-effects-surface";
import { ArrowDownIcon, ArrowRightIcon, GitHubLogoIcon, HeartIcon } from "@/icons";
import { siteBrand } from "@/lib/site-brand";
import { omarchyDonateUrl, omarchyGithubUrl, omarchyIsoDownloadUrl } from "@/lib/site-links";
import { cn } from "@/lib/utils";

export function HomeWorkspaceOne() {
  return (
    <div className="gap-fluid-md p-fluid-xl relative isolate grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:z-[-1] before:bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--background)_8%,transparent)_0%,color-mix(in_srgb,var(--background)_14%,transparent)_34%,color-mix(in_srgb,var(--background)_66%,transparent)_72%,color-mix(in_srgb,var(--background)_88%,transparent)_100%)] before:content-[''] max-md:gap-6 max-md:overflow-auto max-md:p-5 [@media(max-height:700px)]:lg:gap-3 [@media(max-height:700px)]:lg:px-6 [@media(max-height:700px)]:lg:pt-4 [@media(max-height:700px)]:lg:pb-5">
      <LogoEffectsSurface className="w-full min-w-0 self-center max-md:self-start [@media(max-height:700px)]:lg:mx-auto [@media(max-height:700px)]:lg:w-11/12" />

      <div className="gap-x-fluid-2xl grid grid-cols-[minmax(0,1.08fr)_minmax(15rem,0.92fr)] items-end gap-y-4 [grid-template-areas:'body_tagline'_'body_actions'] max-md:grid-cols-1 max-md:items-start max-md:gap-5 max-md:[grid-template-areas:'tagline'_'body'_'actions']">
        <p className="text-body leading-display text-bright-foreground [&_a]:text-primary sm:text-title-sm text-shadow-readable m-0 max-w-[27ch] self-end font-light tracking-[-0.052em] text-balance [grid-area:tagline] [&_a]:decoration-[0.06em] [&_a]:underline-offset-[0.12em]">
          {siteBrand.descriptor} by <a href={siteBrand.authorUrl}>{siteBrand.author}</a>
        </p>

        <div className="self-end [grid-area:body]">
          <h1 className="text-ui/tight text-primary mb-2 font-medium" id="hero-title">
            <span className="sr-only">Omarchy Linux. </span>
            We can fix everything.
          </h1>
          <p className="text-small leading-copy text-foreground [&_a]:text-link text-shadow-readable m-0 max-w-[52ch] text-pretty [&_a]:underline-offset-[0.2em]">
            The malleable OS for the age of agents. Where you can vibe your way through every
            alteration, tweak, and desire. <a href="https://omarchs.fyi">Be the Omarch</a> and
            command your agent!
          </p>
        </div>

        <div className="@container/hero-actions grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-stretch gap-2 [grid-area:actions]">
          <a
            className={cn(
              buttonVariants({ size: "hero", variant: "primary" }),
              "col-span-4 @md/hero-actions:col-span-1"
            )}
            href={omarchyIsoDownloadUrl}
          >
            <span className="whitespace-nowrap">Download the ISO</span>
            <ArrowDownIcon aria-hidden="true" className="size-4 shrink-0" />
          </a>
          <Link
            className={cn(
              buttonVariants({ size: "hero", variant: "secondary" }),
              "col-span-2 @md/hero-actions:col-span-1"
            )}
            href="/manual/"
            transitionTypes={["site-route"]}
          >
            <span className="whitespace-nowrap">Read the manual</span>
            <ArrowRightIcon
              aria-hidden="true"
              className="hidden size-4 shrink-0 @md/hero-actions:block"
            />
          </Link>
          <a
            aria-label="Donate to Omarchy"
            className={cn(
              buttonVariants({ size: "hero", variant: "secondary" }),
              "w-11 px-0 @xl/hero-actions:w-auto @xl/hero-actions:px-3"
            )}
            href={omarchyDonateUrl}
            title="Donate to Omarchy"
          >
            <HeartIcon aria-hidden="true" className="size-4 shrink-0" />
            <span className="hidden @xl/hero-actions:inline">Donate</span>
          </a>
          <a
            aria-label="View Omarchy on GitHub"
            className={cn(
              buttonVariants({ size: "hero", variant: "secondary" }),
              "w-11 px-0 @xl/hero-actions:w-auto @xl/hero-actions:px-3"
            )}
            href={omarchyGithubUrl}
            title="View Omarchy on GitHub"
          >
            <GitHubLogoIcon />
            <span className="hidden @xl/hero-actions:inline">GitHub</span>
          </a>
        </div>
      </div>
    </div>
  );
}
