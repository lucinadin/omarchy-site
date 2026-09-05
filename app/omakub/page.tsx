import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from "@/components/site/page-header";
import { PageTransition } from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { ArrowUpRightIcon } from "@/icons";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Omakub — Omarchy",
  description: "The story of Omakub, the omakase developer setup for Ubuntu that led to Omarchy.",
  alternates: { canonical: "/omakub/" },
  openGraph: {
    title: "The story of Omakub",
    description: "The omakase developer setup for Ubuntu that led to Omarchy.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The story of Omakub",
    description: "The omakase developer setup for Ubuntu that led to Omarchy.",
  },
};

const earlyAesthetics = [
  {
    alt: "The Omakub desktop: GNOME overview with a misty forest wallpaper, dock, and workspaces",
    caption: "There's only so much you can do with GNOME, but I did what I could.",
    image: "/assets/images/omakub/omakub-desktop.webp",
  },
  {
    alt: "Neovim and a terminal running inside Zellij, showing the Omakub file tree",
    caption: "Neovim and Zellij out of the box.",
    image: "/assets/images/omakub/omakub-neovim.webp",
  },
  {
    alt: "The omakub theme command in a terminal, with the Omakub ASCII banner",
    caption: "Even then, one command could re-theme multiple apps.",
    image: "/assets/images/omakub/omakub-theme.webp",
  },
] as const;

type OmakubSectionHeadingProps = {
  eyebrow: string;
  id?: string;
  title: string;
};

function OmakubSectionHeading({ eyebrow, id, title }: OmakubSectionHeadingProps) {
  return (
    <header className="self-start [@media(width>800px)]:sticky [@media(width>800px)]:top-28">
      <div>
        <p className="text-meta leading-ui text-primary mt-0 mb-[0.8rem] font-medium">{eyebrow}</p>
        <h2
          className="text-title-lg text-bright-foreground m-0 max-w-[12ch] font-light tracking-[-0.045em] text-balance"
          id={id}
        >
          {title}
        </h2>
      </div>
    </header>
  );
}

function StoryParagraph({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return <p className={cn("text-body text-foreground m-0 text-pretty", className)} {...props} />;
}

export default function OmakubPage() {
  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="page-main max-w-[calc(var(--container-standard)+2*var(--page-gutter))] overflow-clip">
          <PageHeader>
            <PageHeaderEyebrow>Before Omarchy</PageHeaderEyebrow>
            <PageHeaderTitle>It began with Omakub</PageHeaderTitle>
            <PageHeaderDescription>
              Before Omarchy, there was Omakub. A humble omakase developer setup for Ubuntu. One
              command turned a fresh installation into as good a base for developers as the rather
              rigid and limited base would allow.
            </PageHeaderDescription>
          </PageHeader>

          <figure className="mt-fluid-2xl">
            <Image
              alt="Omakub — turn a fresh Ubuntu installation into a fully-configured, beautiful, and modern web development system by running a single command"
              className="block h-auto w-full"
              height={1260}
              priority
              sizes="(max-width: 800px) 100vw, 1280px"
              src="/assets/images/omakub/omakub.png"
              width={2400}
            />
          </figure>

          <section
            className="border-border mt-fluid-section gap-fluid-2xl py-fluid-section grid grid-cols-1 border-t [@media(width>800px)]:grid-cols-[minmax(11rem,0.34fr)_minmax(0,1fr)]"
            aria-labelledby="omakub-aesthetics-title"
          >
            <OmakubSectionHeading
              eyebrow="The Ubuntu years"
              id="omakub-aesthetics-title"
              title="Early Aesthetics"
            />
            <div className="gap-fluid-2xl grid">
              {earlyAesthetics.map((item) => (
                <figure
                  className="m-0 w-full [@media(max-width:800px)]:justify-self-stretch"
                  key={item.image}
                >
                  <Image
                    alt={item.alt}
                    className="border-border block h-auto w-full max-w-full border"
                    height={900}
                    sizes="(max-width: 800px) 100vw, 900px"
                    src={item.image}
                    width={1600}
                  />
                  <figcaption className="text-small text-muted-foreground mt-3 max-w-[70ch] font-normal tracking-[-0.01em] text-pretty">
                    {item.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>

          <div className="border-border border-t">
            <section className="gap-fluid-2xl py-fluid-section grid grid-cols-1 [@media(width>800px)]:grid-cols-[minmax(11rem,0.34fr)_minmax(0,1fr)]">
              <OmakubSectionHeading eyebrow="What came next" title="The road to Omarchy" />
              <div className="max-w-reader grid gap-[1.35rem]">
                <StoryParagraph className="text-bright-foreground">
                  Omakub proved the thesis: give developers a beautiful, complete Linux out of the
                  box, and they’ll show up! Tens of thousands did.
                </StoryParagraph>
                <StoryParagraph>
                  But it also found the ceiling. Omakub was a layer of opinion on top of Ubuntu and
                  GNOME, and those come with strong opinions of their own. The ideas I actually
                  cared about — tiling, everything on the keyboard, a system that treats the
                  terminal as the center of the universe — kept fighting the platform instead of
                  flowing from it.
                </StoryParagraph>
                <StoryParagraph>
                  So the omakase moved from Ubuntu to Arch, from GNOME to Hyprland, and became{" "}
                  <Link
                    className="text-link underline-offset-[0.2em]"
                    href="/"
                    transitionTypes={["nav-home"]}
                  >
                    Omarchy
                  </Link>
                  . Not a layer on top of somebody else’s distribution, but the whole meal.
                  Everything Omakub was reaching for, without asking anyone’s permission first.
                </StoryParagraph>
              </div>
            </section>

            <section className="border-border gap-fluid-2xl py-fluid-section grid grid-cols-1 border-t [@media(width>800px)]:grid-cols-[minmax(11rem,0.34fr)_minmax(0,1fr)]">
              <OmakubSectionHeading
                eyebrow="Retired, not forgotten"
                title="The retirement home is staffed"
              />
              <div className="max-w-reader grid gap-[1.35rem]">
                <StoryParagraph className="text-bright-foreground">
                  Omakub itself is now retired. The repositories are archived on GitHub —{" "}
                  <a
                    className="text-link underline-offset-[0.2em]"
                    href="https://github.com/omacom/omakub"
                  >
                    omakub
                  </a>{" "}
                  and{" "}
                  <a
                    className="text-link underline-offset-[0.2em]"
                    href="https://github.com/omacom/omakub-site"
                  >
                    omakub-site
                  </a>
                  . But good ideas don’t retire, they get forked!{" "}
                  <a
                    className="text-link underline-offset-[0.2em]"
                    href="https://omabuntu.omakasui.org/"
                  >
                    Omabuntu
                  </a>{" "}
                  is a community fork continuing on the omakase-Ubuntu thread. If Arch is a step too
                  far and Ubuntu is home, that’s where you should go.
                </StoryParagraph>
                <StoryParagraph>
                  Thanks to everyone who ran it, contributed to it, and showed off their desktops.
                  Omakub walked so Omarchy could run.
                </StoryParagraph>
                <a
                  className="border-border text-ui [&:hover]:border-bright-foreground [&:hover]:bg-bright-foreground [&:hover]:text-background text-link mt-3 inline-flex items-center gap-[0.45rem] justify-self-start border px-4 py-[0.8rem] no-underline underline-offset-[0.2em]"
                  href="https://github.com/omacom/omakub"
                >
                  Browse the archive
                  <ArrowUpRightIcon aria-hidden="true" size={14} />
                </a>
              </div>
            </section>
          </div>
        </main>
      </PageTransition>
    </>
  );
}
