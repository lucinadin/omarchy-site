import type { Metadata } from "next";

import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from "@/components/site/page-header";
import { PageTransition } from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { Card } from "@/components/ui/card";
import { ArrowUpRightIcon, CalendarDaysIcon, PlusIcon } from "@/icons";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Meetups | Omarchy",
  description: "Omarchy meetups around the world, plus the guidelines for running one.",
  alternates: { canonical: "/meetups/" },
  openGraph: {
    title: "Omarchy meetups",
    description: "Omarchy meetups around the world, plus the guidelines for running one.",
    images: ["/assets/images/social/meetups.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Omarchy meetups",
    description: "Omarchy meetups around the world, plus the guidelines for running one.",
    images: ["/assets/images/social/meetups.png"],
  },
};

const meetupRules = [
  {
    name: "About Omarchy",
    text: "Keep the event mainly about Omarchy, Linux, open source, programming, customization, or adjacent hacker culture.",
  },
  {
    name: "Open to everyone",
    text: "No invitation-only official Omarchy events. Capacity limits are fine.",
  },
  {
    name: "Community-run",
    text: "Organizers speak for themselves, not for Omarchy or the Omacom Foundation.",
  },
  {
    name: "No territorial ownership",
    text: "Nobody owns a city. Anyone may organize an Omarchy meetup anywhere.",
  },
  {
    name: "No profiteering",
    text: "Free is preferred. Charging for venue, food, or actual event costs is fine.",
  },
  {
    name: "Sponsors are fine",
    text: "Disclose the sponsor, and do not let the event become a sales pitch.",
  },
  {
    name: "Behave like civilized adults",
    text: "Do not be a jackass. The organizer has final say over removal from their event.",
  },
  {
    name: "Use the name responsibly",
    text: "A city meetup name is fine. Do not imply that you represent Omarchy or the foundation.",
  },
  {
    name: "Submit it",
    text: "Put the event on Luma and submit it to the global calendar so people can find it.",
  },
] as const;

export default function MeetupsPage() {
  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="page-main overflow-clip">
          <PageHeader>
            <PageHeaderEyebrow>Community-run and open to everyone</PageHeaderEyebrow>
            <PageHeaderTitle className="max-w-[16ch]">Meetups around the world</PageHeaderTitle>
            <PageHeaderDescription className="max-w-[66ch]">
              Find the next one near you, or put your city on the calendar.
            </PageHeaderDescription>
          </PageHeader>

          <section
            className="border-border my-fluid-section p-fluid-xs border bg-[color-mix(in_srgb,var(--card)_82%,var(--background))]"
            aria-labelledby="meetups-calendar-title"
          >
            <header
              className={cn(
                "flex items-center justify-between gap-8 px-1 pt-[0.35rem] pb-[1.15rem]",
                "[@media(max-width:520px)]:flex-col [@media(max-width:520px)]:items-start [@media(max-width:520px)]:gap-[0.85rem]"
              )}
            >
              <div className="flex items-center gap-[0.65rem]">
                <CalendarDaysIcon
                  aria-hidden="true"
                  className="text-primary"
                  size={20}
                  strokeWidth={1.5}
                />
                <h2
                  className="text-title-sm leading-display text-foreground m-0 font-medium tracking-[-0.025em]"
                  id="meetups-calendar-title"
                >
                  Upcoming meetups
                </h2>
              </div>
              <a
                className="text-meta text-link flex items-center gap-[0.65rem] underline-offset-[0.2em]"
                href="https://luma.com/omarchy"
              >
                Open in Luma
                <ArrowUpRightIcon aria-hidden="true" size={14} />
              </a>
            </header>
            <iframe
              allowFullScreen
              className="border-border h-meetup-map block w-full border bg-(--darker-background)"
              height="450"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-scripts"
              src="https://luma.com/embed/calendar/cal-SDGGMsEps9ExsrT/events?lt=dark"
              title="Upcoming Omarchy meetups on Luma"
              width="600"
            />
          </section>

          <section
            className="border-border py-fluid-section border-t"
            aria-labelledby="meetups-organize-title"
          >
            <header
              className={cn(
                "mb-fluid-xl gap-x-fluid-layout grid grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)] items-end gap-y-8",
                "[@media(max-width:800px)]:grid-cols-1"
              )}
            >
              <div>
                <p className="section-label">Run your own</p>
                <h2 className="section-title mt-[0.9rem] mb-0" id="meetups-organize-title">
                  Bring Omarchy to your city
                </h2>
              </div>
              <div className="grid gap-5">
                <p className="text-ui leading-copy text-muted-foreground m-0 text-pretty">
                  Keep it open, community-run, and focused on making computers fun again.
                </p>
                <a
                  className="text-meta text-link inline-flex items-center gap-[0.45rem] justify-self-start underline-offset-[0.2em]"
                  href="https://luma.com/omarchy"
                >
                  <PlusIcon aria-hidden="true" size={14} />
                  Submit a meetup
                </a>
              </div>
            </header>

            <ol
              className={cn(
                "gap-fluid-xs m-0 grid list-none grid-cols-3 p-0",
                "[@media(max-width:1050px)]:grid-cols-2 [@media(max-width:520px)]:grid-cols-1"
              )}
            >
              {meetupRules.map((rule, index) => (
                <li className="flex min-w-0" key={rule.name}>
                  <Card className="min-h-48 w-full bg-[color-mix(in_srgb,var(--card)_82%,var(--background))]">
                    <div className="p-fluid-md grid grid-rows-[auto_auto_1fr] gap-[0.9rem]">
                      <span aria-hidden="true" className="text-meta text-primary font-bold">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-title-sm leading-ui text-foreground m-0 font-medium">
                        {rule.name}
                      </h3>
                      <p className="text-meta leading-copy text-muted-foreground m-0 text-pretty">
                        {rule.text}
                      </p>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        </main>
      </PageTransition>
    </>
  );
}
