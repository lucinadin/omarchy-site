import type { Metadata } from "next";
import type { ComponentPropsWithoutRef } from "react";

import { PageHeader, PageHeaderEyebrow, PageHeaderTitle } from "@/components/site/page-header";
import { PageTransition } from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRightIcon, BugIcon, MailIcon, ShieldAlertIcon } from "@/icons";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Security — Omarchy",
  description: "How to responsibly report a security vulnerability in Omarchy.",
  alternates: { canonical: "/security/" },
  openGraph: {
    title: "Security at Omarchy",
    description: "How to responsibly report a security vulnerability in Omarchy.",
    images: ["/assets/images/opengraph.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Security at Omarchy",
    description: "How to responsibly report a security vulnerability in Omarchy.",
    images: ["/assets/images/opengraph.png"],
  },
};

const sections = [
  { href: "#vulnerability", label: "What is a vulnerability?" },
  { href: "#report", label: "What to include" },
  { href: "#disclosure", label: "Responsible disclosure" },
  { href: "#credits", label: "Credits" },
  { href: "#support", label: "Regular bugs and support" },
] as const;

function SecurityPolicySection({ className, ...props }: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={cn(
        "[&_h2]:text-title-md [&_h2]:leading-display [&_h2]:text-foreground [&_p]:text-body [&_p]:text-muted-foreground grid scroll-mt-28 gap-5 [&_h2]:m-0 [&_h2]:font-normal [&_h2]:tracking-[-0.045em] [&_p]:m-0 [&_p]:text-pretty",
        className
      )}
      {...props}
    />
  );
}

function SecurityPolicyList({ className, ...props }: ComponentPropsWithoutRef<"ul">) {
  return (
    <ul
      className={cn(
        "[&>li]:text-body [&>li]:text-muted-foreground [&>li]:before:text-primary m-0 grid list-none gap-[0.9rem] p-0 [&>li]:grid [&>li]:grid-cols-[0.75rem_minmax(0,1fr)] [&>li]:gap-[0.8rem] [&>li]:text-pretty [&>li]:before:content-['›']",
        className
      )}
      {...props}
    />
  );
}

export default function SecurityPage() {
  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="page-main overflow-clip">
          <PageHeader>
            <PageHeaderEyebrow>Security</PageHeaderEyebrow>
            <PageHeaderTitle>Security at Omarchy</PageHeaderTitle>
          </PageHeader>

          <section
            className="border-border mt-fluid-2xl p-fluid-lg mx-auto grid max-w-[900px] gap-[1.4rem] border bg-[color-mix(in_srgb,var(--card)_78%,var(--background))]"
            aria-labelledby="security-report-title"
          >
            <h2
              className="text-meta leading-ui text-primary m-0 font-bold"
              id="security-report-title"
            >
              Report a vulnerability
            </h2>
            <p className="text-body text-muted-foreground m-0 text-pretty">
              If you believe you’ve found a security vulnerability in Omarchy, please tell the{" "}
              <a
                className="text-link underline-offset-[0.2em]"
                href="https://omarchy.org/teams/#security"
              >
                Omarchy Security Team
              </a>{" "}
              privately so we have an opportunity to investigate and fix it before it is made
              public.
            </p>
            <a
              aria-label="Email a security report to security@omarchy.org"
              className={cn(
                buttonVariants({ size: "default", variant: "primary" }),
                "justify-self-start [@media(max-width:520px)]:justify-self-stretch"
              )}
              href="mailto:security@omarchy.org?subject=Security%20report"
            >
              <MailIcon aria-hidden="true" size={16} />
              security@omarchy.org
            </a>
          </section>

          <aside className="mt-fluid-xl grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 border border-[color-mix(in_srgb,var(--ansi-yellow)_42%,var(--border))] bg-[color-mix(in_srgb,var(--ansi-yellow)_7%,var(--background))] px-[1.15rem] py-4">
            <ShieldAlertIcon
              className="mt-[0.1rem] text-(color:--ansi-yellow)"
              aria-hidden="true"
              size={20}
            />
            <p className="text-small leading-copy text-foreground m-0 text-pretty">
              Please don’t report potential vulnerabilities publicly in GitHub Issues, Discord, or
              social media before they’ve been resolved.
            </p>
          </aside>

          <div className="gap-fluid-layout pt-fluid-section grid grid-cols-[minmax(12rem,0.35fr)_minmax(0,1fr)] [@media(max-width:800px)]:grid-cols-1">
            <nav
              className="sticky top-28 self-start [@media(max-width:800px)]:static [@media(max-width:800px)]:overflow-hidden"
              aria-label="Security policy sections"
            >
              <p className="text-meta leading-ui text-primary m-0 font-bold">On this page</p>
              <ol className="border-border mt-4 mb-0 list-none border-t p-0 [@media(max-width:800px)]:flex [@media(max-width:800px)]:overflow-x-auto">
                {sections.map((section) => (
                  <li
                    className="border-border border-b [@media(max-width:800px)]:flex-none"
                    key={section.href}
                  >
                    <a
                      className="text-meta leading-ui text-muted-foreground [&:hover]:text-bright-foreground block py-[0.8rem] no-underline [@media(max-width:800px)]:pr-5"
                      href={section.href}
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <article className="[&>section+section]:border-border [&_a]:text-link [&>section+section]:mt-fluid-2xl [&>section+section:not(#support)]:pt-fluid-2xl max-w-[800px] min-w-0 [&_a]:underline-offset-[0.2em] [&>section+section]:border-t">
              <SecurityPolicySection id="vulnerability">
                <h2>What is a vulnerability?</h2>
                <p>
                  We consider a bug a security vulnerability when it can be exploited to cross a
                  meaningful security boundary: an untrusted or lower-privileged party gains access,
                  permissions, or control they didn’t already have.
                </p>
                <p>
                  Code that could be more robust but does not cross a security boundary is an
                  improvement rather than a security vulnerability. We may still merge a proposed
                  fix and credit the reporter in our release notes.
                </p>
                <p>
                  Eligibility for our{" "}
                  <a href="https://omarchy.org/security/credits/">security credits</a> page depends
                  on whether a report identifies a confirmed security vulnerability, not on its
                  severity.
                </p>
              </SecurityPolicySection>

              <SecurityPolicySection id="report">
                <h2>What to include</h2>
                <p>Give us enough information to understand and reproduce the issue:</p>
                <SecurityPolicyList>
                  <li>The affected component and Omarchy version.</li>
                  <li>An explanation of what an attacker can do before and after exploitation.</li>
                  <li>Steps to reproduce the issue and any proof of concept.</li>
                  <li>Your preferred contact details for follow-up.</li>
                </SecurityPolicyList>
              </SecurityPolicySection>

              <SecurityPolicySection id="disclosure">
                <h2>Responsible disclosure</h2>
                <p>Please act in good faith while investigating and reporting vulnerabilities:</p>
                <SecurityPolicyList>
                  <li>
                    Only test systems and accounts you own or have explicit permission to test.
                  </li>
                  <li>
                    Avoid privacy violations, disruption, data destruction, and service degradation.
                  </li>
                  <li>Don’t exploit a vulnerability beyond what is needed to demonstrate it.</li>
                  <li>
                    Give us a reasonable opportunity to investigate and address the issue before
                    publishing details.
                  </li>
                </SecurityPolicyList>
                <p>
                  We’ll review your report and keep you informed as we’re able while we work toward
                  a resolution.
                </p>
              </SecurityPolicySection>

              <SecurityPolicySection id="credits">
                <h2>Credits</h2>
                <p>
                  Researchers who privately report a confirmed security vulnerability and give us
                  the chance to ship a fix are thanked on the{" "}
                  <a href="https://omarchy.org/security/credits/">security credits</a> page.
                  Accepted improvements that don’t cross a security boundary may still be credited
                  in our release notes.
                </p>
                <p>
                  Credits link to each reporter’s X profile and show their avatar. For duplicate
                  reports, only the first reporter is eligible for credit.
                </p>
              </SecurityPolicySection>

              <SecurityPolicySection
                className="border-border p-fluid-lg grid-cols-[auto_minmax(0,1fr)] border bg-[color-mix(in_srgb,var(--card)_78%,var(--background))]"
                id="support"
              >
                <BugIcon className="text-primary mt-[0.2rem]" aria-hidden="true" size={20} />
                <div className="grid gap-4">
                  <h2>Regular bugs and support</h2>
                  <p>
                    For anything that isn’t a security vulnerability, please use the{" "}
                    <a
                      className="inline-flex items-center gap-[0.35rem]"
                      href="https://github.com/omacom/omarchy/issues"
                    >
                      Omarchy issue tracker
                      <ArrowRightIcon aria-hidden="true" size={14} />
                    </a>
                    .
                  </p>
                </div>
              </SecurityPolicySection>
            </article>
          </div>
        </main>
      </PageTransition>
    </>
  );
}
