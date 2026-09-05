import Link from "next/link";

import { SiteLinkGlyph } from "@/components/site/site-link-glyph";
import { BasecampIcon, HeyIcon, ThirtySevenSignalsIcon } from "@/icons";
import { siteTagline } from "@/lib/site-brand";
import { footerLinkGroups, getSiteLinkKind, type SiteLink } from "@/lib/site-navigation";
import { cn } from "@/lib/utils";

function FooterLink({ link }: { link: SiteLink }) {
  const kind = getSiteLinkKind(link);
  const content = (
    <>
      <span>{link.label}</span>
      <SiteLinkGlyph
        className={cn(
          "text-small/none text-primary ms-0 inline-block max-w-0 overflow-hidden [font-family:var(--font-jetbrains-mono),ui-monospace,monospace] whitespace-nowrap opacity-0 [transition:opacity_160ms_ease,margin-inline-start_180ms_ease,max-width_180ms_ease,translate_180ms_cubic-bezier(0.2,0.8,0.2,1)] group-focus-visible/footer-link:ms-2 group-focus-visible/footer-link:max-w-4 group-focus-visible/footer-link:opacity-100",
          link.internal
            ? "-translate-x-[0.12rem] group-focus-visible/footer-link:translate-x-[0.16rem]"
            : "-translate-x-[0.08rem] translate-y-[0.08rem] group-focus-visible/footer-link:translate-x-[0.12rem] group-focus-visible/footer-link:-translate-y-[0.12rem]"
        )}
        link={link}
      />
    </>
  );

  if (link.internal) {
    return (
      <Link
        className="group/footer-link text-small text-muted-foreground [&:hover]:text-bright-foreground focus-visible:text-bright-foreground inline-flex min-h-8 items-center justify-self-start px-[0.45rem] py-[0.3rem] no-underline [transition:color_160ms_ease] [&:hover_[data-link-kind=external]]:translate-x-[0.12rem] [&:hover_[data-link-kind=external]]:-translate-y-[0.12rem] [&:hover_[data-link-kind=internal]]:translate-x-[0.16rem] [&:hover_[data-link-kind]]:ms-2 [&:hover_[data-link-kind]]:max-w-4 [&:hover_[data-link-kind]]:opacity-100"
        data-link-kind={kind}
        href={link.href}
        transitionTypes={["site-route"]}
      >
        {content}
      </Link>
    );
  }

  return (
    <a
      className="group/footer-link text-small text-muted-foreground [&:hover]:text-bright-foreground focus-visible:text-bright-foreground inline-flex min-h-8 items-center justify-self-start px-[0.45rem] py-[0.3rem] no-underline [transition:color_160ms_ease] [&:hover_[data-link-kind=external]]:translate-x-[0.12rem] [&:hover_[data-link-kind=external]]:-translate-y-[0.12rem] [&:hover_[data-link-kind=internal]]:translate-x-[0.16rem] [&:hover_[data-link-kind]]:ms-2 [&:hover_[data-link-kind]]:max-w-4 [&:hover_[data-link-kind]]:opacity-100"
      data-link-kind={kind}
      href={link.href}
    >
      {content}
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-border text-meta/copy gap-y-fluid-2xl pt-fluid-2xl mx-auto grid w-full max-w-(--site-frame-max-width) grid-cols-[minmax(0,1fr)_auto] gap-x-0 border-t px-(--page-gutter) pb-8 [&_a]:underline-offset-[0.2em] [@media(max-width:800px)]:grid-cols-1 [@media(max-width:800px)]:gap-12">
      <div className="col-span-full grid gap-3">
        <Link
          aria-label="Omarchy home"
          className="text-meta text-bright-foreground inline-flex w-[min(100%,54ch)] items-center gap-[0.6rem] no-underline"
          href="/"
          transitionTypes={["nav-home"]}
        >
          <span
            aria-hidden="true"
            className="bg-primary block aspect-[4131/950] w-full [mask-image:url('/assets/brand/omarchy-wordmark.svg')] [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat]"
          />
        </Link>
        <p className="text-muted-foreground m-0 max-w-[54ch]">{siteTagline}.</p>
        <p className="text-muted-foreground m-0 max-w-[54ch]">
          Looking to become a partner or patron?
          <br />
          Write <a href="mailto:david@omarchy.org">david@omarchy.org</a>.
        </p>
      </div>

      <div className="col-span-full grid grid-cols-4 gap-8 [@media(max-width:520px)]:gap-x-6 [@media(max-width:520px)]:gap-y-10 [@media(max-width:800px)]:grid-cols-2">
        {footerLinkGroups.map((group) => (
          <section key={group.label}>
            <h2 className="text-primary m-0 mb-[0.9rem] font-medium tracking-[0.05em] uppercase">
              {group.label}
            </h2>
            <nav
              aria-label={`${group.label} links`}
              className="-ms-[0.45rem] grid items-start gap-[0.15rem]"
            >
              {group.links.map((link) => (
                <FooterLink key={link.label} link={link} />
              ))}
            </nav>
          </section>
        ))}
      </div>

      <div
        className="border-border gap-x-fluid-lg flex flex-wrap items-center gap-y-4 border-t pt-6 [@media(max-width:800px)]:flex-col [@media(max-width:800px)]:text-center"
        aria-label="Omarchy partners"
      >
        <div className="inline-flex flex-wrap items-center gap-3 [@media(max-width:800px)]:w-full [@media(max-width:800px)]:justify-center">
          <span className="text-muted-foreground">Incubated at</span>
          <a
            aria-label="37signals"
            className="text-ui text-bright-foreground inline-flex items-center gap-[0.6rem] no-underline"
            href="https://37signals.com/"
          >
            <ThirtySevenSignalsIcon />
            <strong>37signals</strong>
          </a>
          <span className="text-muted-foreground inline-flex flex-wrap items-center gap-[0.4rem] [@media(max-width:800px)]:justify-center">
            <span>(makers of</span>
            <a
              aria-label="Basecamp"
              className="text-ui text-bright-foreground inline-flex items-center gap-[0.35rem] no-underline"
              href="https://basecamp.com/"
            >
              <BasecampIcon />
              <strong>Basecamp</strong>
            </a>
            <span>and</span>
            <a
              aria-label="HEY"
              className="text-ui text-bright-foreground inline-flex items-center gap-[0.35rem] no-underline"
              href="https://hey.com/"
            >
              <HeyIcon />
              <strong>HEY</strong>
            </a>
            <span>)</span>
          </span>
        </div>

        <div className="inline-flex items-center gap-3 [@media(max-width:800px)]:w-full [@media(max-width:800px)]:justify-center">
          <span className="text-muted-foreground">Sponsored hosting by</span>
          <a
            aria-label="Cloudflare"
            className="text-ui text-bright-foreground inline-flex items-center gap-[0.6rem] no-underline"
            href="https://www.cloudflare.com/"
          >
            <span aria-hidden="true" className="inline-flex h-5 items-end gap-[0.6rem]">
              <span className="bg-primary block h-5 w-[43px] [mask-image:url('/assets/images/logos/cloudflare.svg')] [mask-size:133px_20px] [mask-position:0_0] [mask-repeat:no-repeat]" />
              <span className="block h-5 w-[87px] translate-y-[3px] bg-current [mask-image:url('/assets/images/logos/cloudflare.svg')] [mask-size:133px_20px] [mask-position:-46px_-5.8px] [mask-repeat:no-repeat]" />
            </span>
          </a>
        </div>
      </div>

      <div className="border-border flex items-end justify-end gap-6 border-t pt-6 pl-6 [@media(max-width:800px)]:-mt-8 [@media(max-width:800px)]:flex-col [@media(max-width:800px)]:items-center [@media(max-width:800px)]:justify-center [@media(max-width:800px)]:border-t-0 [@media(max-width:800px)]:pt-0 [@media(max-width:800px)]:pl-0 [@media(max-width:800px)]:text-center">
        <Link
          className="text-muted-foreground whitespace-nowrap"
          href="/brand/"
          transitionTypes={["site-route"]}
        >
          Omarchy is a pending trademark.
        </Link>
      </div>
    </footer>
  );
}
