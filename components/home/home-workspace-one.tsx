import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { LogoEffectsSurface } from "@/features/effects/components/logo-effects-surface";
import { ArrowDownIcon, ArrowRightIcon, GitHubLogoIcon, HeartIcon } from "@/icons";
import { siteBrand } from "@/lib/site-brand";
import { omarchyDonateUrl, omarchyGithubUrl, omarchyIsoDownloadUrl } from "@/lib/site-links";
import { cn } from "@/lib/utils";

export function HomeWorkspaceOne() {
  return (
    <div className="gap-fluid-md p-fluid-xl relative isolate grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:z-[-1] before:bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--background)_8%,transparent)_0%,color-mix(in_srgb,var(--background)_14%,transparent)_34%,color-mix(in_srgb,var(--background)_66%,transparent)_72%,color-mix(in_srgb,var(--background)_88%,transparent)_100%)] before:content-[''] max-md:overflow-auto [@media(max-height:700px)_and_(min-width:801px)]:gap-[0.85rem] [@media(max-height:700px)_and_(min-width:801px)]:px-[1.4rem] [@media(max-height:700px)_and_(min-width:801px)]:pt-[0.9rem] [@media(max-height:700px)_and_(min-width:801px)]:pb-[1.2rem] [@media(max-width:620px)]:grid-rows-[minmax(0,1fr)_auto] [@media(max-width:620px)]:gap-6 [@media(max-width:620px)]:overflow-y-auto [@media(max-width:620px)]:p-[1.2rem]">
      <LogoEffectsSurface className="w-full min-w-0 self-center max-md:self-start [@media(max-height:700px)_and_(min-width:801px)]:mx-auto [@media(max-height:700px)_and_(min-width:801px)]:w-[92%]" />

      <div className="gap-x-fluid-2xl grid grid-cols-[minmax(0,1.08fr)_minmax(15rem,0.92fr)] items-end gap-y-4 [grid-template-areas:'body_tagline'_'body_actions'] max-md:grid-cols-[minmax(0,1fr)_minmax(13rem,0.9fr)] [@media(max-width:620px)]:grid-cols-1 [@media(max-width:620px)]:items-start [@media(max-width:620px)]:gap-5 [@media(max-width:620px)]:[grid-template-areas:'tagline'_'body'_'actions']">
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

        <div className="flex min-w-0 flex-row flex-wrap items-stretch gap-2 [grid-area:actions]">
          <a
            className={buttonVariants({ size: "hero", variant: "primary" })}
            href={omarchyIsoDownloadUrl}
          >
            <span className="min-w-0 truncate">Download the ISO</span>
            <ArrowDownIcon aria-hidden="true" className="shrink-0" size={15} />
          </a>
          <Link
            className={buttonVariants({ size: "hero", variant: "secondary" })}
            href="/manual/"
            transitionTypes={["site-route"]}
          >
            <span className="min-w-0 truncate">Read the manual</span>
            <ArrowRightIcon aria-hidden="true" className="shrink-0" size={15} />
          </Link>
          <a
            aria-label="Donate to Omarchy"
            className={cn(
              buttonVariants({ size: "hero", variant: "secondary" }),
              "[@media(max-width:1099px)]:hidden!"
            )}
            href={omarchyDonateUrl}
            title="Donate to Omarchy"
          >
            <HeartIcon aria-hidden="true" className="shrink-0" size={15} />
            <span className="hidden min-w-0 truncate [@media(min-width:1440px)]:inline">
              Donate
            </span>
          </a>
          <a
            aria-label="View Omarchy on GitHub"
            className={cn(
              buttonVariants({ size: "hero", variant: "secondary" }),
              "[@media(max-width:1099px)]:hidden!"
            )}
            href={omarchyGithubUrl}
            title="View Omarchy on GitHub"
          >
            <GitHubLogoIcon />
            <span className="hidden min-w-0 truncate [@media(min-width:1440px)]:inline">
              GitHub
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
