import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader, PageHeaderEyebrow, PageHeaderTitle } from "@/components/site/page-header";
import { PageTransition } from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { Card } from "@/components/ui/card";
import { ArrowRightIcon, ArrowUpRightIcon, MailIcon, MapPinIcon } from "@/icons";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Omarchy — The Teams",
  description: "The teams guiding Omarchy.",
  alternates: { canonical: "/teams/" },
  openGraph: {
    title: "The Omarchy Teams",
    description: "The teams guiding Omarchy.",
    images: ["/assets/images/social/teams.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Omarchy Teams",
    description: "The teams guiding Omarchy.",
    images: ["/assets/images/social/teams.png"],
  },
};

type TeamMember = {
  image: string;
  location: string;
  name: string;
  profileUrl: string;
};

const coreTeam: readonly TeamMember[] = [
  {
    image: "/assets/images/team/dhh.webp",
    location: "USA/Denmark",
    name: "DHH",
    profileUrl: "https://dhh.dk",
  },
  {
    image: "/assets/images/team/ryan-hughes.webp",
    location: "USA",
    name: "Ryan Hughes",
    profileUrl: "https://x.com/ryanrhughes",
  },
  {
    image: "/assets/images/team/tobi-lutke.webp",
    location: "Canada",
    name: "Tobi Lütke",
    profileUrl: "https://x.com/tobi",
  },
  {
    image: "/assets/images/team/bjarne-overli.webp",
    location: "Norway",
    name: "Bjarne Øverli",
    profileUrl: "https://x.com/iamdothash",
  },
  {
    image: "/assets/images/team/hancore.webp",
    location: "Germany",
    name: "HANCORE",
    profileUrl: "https://github.com/HANCORE-linux",
  },
  {
    image: "/assets/images/team/spencer-bull.webp",
    location: "USA",
    name: "Spencer Bull",
    profileUrl: "https://x.com/SpencerGBull",
  },
];

const securityTeam: readonly TeamMember[] = [
  {
    image: "/assets/images/team/adrian-rangel.webp",
    location: "Mexico",
    name: "Adrian Rangel",
    profileUrl: "https://x.com/acrogenesis",
  },
  {
    image: "/assets/images/team/mehmet-ince.webp",
    location: "UK",
    name: "Mehmet İnce",
    profileUrl: "https://x.com/mdisec",
  },
  {
    image: "/assets/images/team/erik-melton.webp",
    location: "Norway",
    name: "Erik Melton",
    profileUrl: "https://x.com/meltonaerik",
  },
  {
    image: "/assets/images/team/sayem-chowdhury.webp",
    location: "Bangladesh",
    name: "Sayem Chowdhury",
    profileUrl: "https://x.com/Sayem314",
  },
  {
    image: "/assets/images/team/sebastian-stange.webp",
    location: "Germany",
    name: "Sebastian Stange",
    profileUrl: "https://x.com/bastidotnet",
  },
  {
    image: "/assets/images/team/ryan-hughes.webp",
    location: "USA",
    name: "Ryan Hughes",
    profileUrl: "https://x.com/ryanrhughes",
  },
  {
    image: "/assets/images/team/dhh.webp",
    location: "USA/Denmark",
    name: "DHH",
    profileUrl: "https://dhh.dk",
  },
];

const rangerTeam: readonly TeamMember[] = [
  {
    image: "/assets/images/team/mihai.webp",
    location: "Romania",
    name: "Mihai",
    profileUrl: "https://x.com/SandorhaziM",
  },
  {
    image: "/assets/images/team/mateo-vaz.webp",
    location: "Uruguay",
    name: "Mateo Vaz",
    profileUrl: "https://x.com/Mateo_VX",
  },
  {
    image: "/assets/images/team/nira.webp",
    location: "Nepal",
    name: "Nira",
    profileUrl: "https://x.com/niraletter",
  },
];

const teamIndex = [
  { count: coreTeam.length, description: "Setting the direction", href: "#core", label: "Core" },
  {
    count: securityTeam.length,
    description: "Keeping your system safe",
    href: "#security",
    label: "Security",
  },
  {
    count: rangerTeam.length,
    description: "Helping others find their way",
    href: "#rangers",
    label: "Rangers",
  },
] as const;

function TeamRoster({ members }: { members: readonly TeamMember[] }) {
  return (
    <div className="gap-fluid-xs grid grid-cols-2 [@media(max-width:1050px)]:grid-cols-3 [@media(max-width:520px)]:grid-cols-1 [@media(max-width:800px)]:grid-cols-2">
      {members.map((member) => (
        <Card
          className={cn(
            "group grid min-h-[5.5rem] min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-center overflow-hidden",
            "bg-[color-mix(in_srgb,var(--card)_80%,var(--background))] [transition:background-color_180ms_ease,border-color_180ms_ease,transform_180ms_ease]",
            "hover:[transform:translateY(-0.15rem)] hover:border-[color-mix(in_srgb,var(--primary),var(--border)_35%)] hover:bg-[color-mix(in_srgb,var(--card)_88%,var(--primary)_12%)]"
          )}
          key={member.name}
        >
          <a
            aria-label={`${member.name} profile`}
            className="self-stretch overflow-hidden bg-(--darker-background)"
            href={member.profileUrl}
          >
            <Image
              className="block h-full w-full object-cover [transition:filter_180ms_ease,transform_220ms_ease] group-hover:[transform:scale(1.035)] group-hover:[filter:saturate(1.08)_contrast(1.03)]"
              alt=""
              height={240}
              sizes="88px"
              src={member.image}
              width={240}
            />
          </a>
          <div className="grid min-w-0 gap-[0.65rem] p-4">
            <h3 className="text-title-sm leading-ui m-0 font-medium">
              <a
                className="text-foreground inline-flex items-center gap-[0.4rem] no-underline"
                href={member.profileUrl}
              >
                {member.name}
                <ArrowUpRightIcon aria-hidden="true" size={13} />
              </a>
            </h3>
            <p className="text-meta leading-ui text-muted-foreground m-0 flex items-center gap-[0.4rem]">
              <MapPinIcon aria-hidden="true" size={12} />
              {member.location}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}

type TeamSectionProps = {
  action?: ReactNode;
  description: string;
  id: string;
  members: readonly TeamMember[];
  title: string;
};

function TeamSection({ action, description, id, members, title }: TeamSectionProps) {
  return (
    <section
      className="gap-x-fluid-layout py-fluid-section grid scroll-mt-16 grid-cols-[minmax(13rem,0.32fr)_minmax(0,1fr)] gap-y-10 [@media(max-width:1050px)]:grid-cols-1"
      id={id}
    >
      <header className="sticky top-28 grid gap-4 self-start [@media(max-width:1050px)]:static">
        <p className="text-meta leading-ui text-primary m-0">{description}</p>
        <h2 className="text-title-md leading-display text-foreground m-0 max-w-[11ch] font-normal tracking-[-0.045em]">
          {title}
        </h2>
        {action}
      </header>
      <TeamRoster members={members} />
    </section>
  );
}

export default function TeamsPage() {
  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="page-main [&>section+section]:border-border overflow-clip [&>section+section]:border-t">
          <PageHeader
            align="start"
            className="gap-x-fluid-layout grid grid-cols-[minmax(0,1fr)_minmax(21rem,0.85fr)] items-end gap-y-10 [@media(max-width:800px)]:grid-cols-1"
            visualClassName="col-start-1 row-start-1 mb-0 justify-self-start"
          >
            <div className="col-start-1 row-start-2">
              <PageHeaderEyebrow>Community</PageHeaderEyebrow>
              <PageHeaderTitle className="max-w-[13ch]">The teams guiding Omarchy</PageHeaderTitle>
            </div>

            <nav
              className="col-start-2 row-span-2 row-start-1 grid w-full gap-5 [@media(max-width:800px)]:col-start-1 [@media(max-width:800px)]:row-span-1 [@media(max-width:800px)]:row-start-3"
              aria-label="Omarchy teams"
            >
              {teamIndex.map((team) => (
                <a
                  className="text-foreground [&:hover>span]:text-bright-foreground grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 no-underline"
                  href={team.href}
                  key={team.href}
                >
                  <strong className="text-title-md text-primary min-w-[1.4ch] leading-none font-normal tracking-[-0.05em]">
                    {team.count}
                  </strong>
                  <span className="text-small">
                    {team.label}
                    <small className="text-micro leading-ui text-muted-foreground mt-[0.2rem] block">
                      {team.description}
                    </small>
                  </span>
                </a>
              ))}
            </nav>
          </PageHeader>

          <TeamSection
            description="Setting the direction"
            id="core"
            members={coreTeam}
            title="Omarchy Core"
          />

          <TeamSection
            action={
              <Link
                className="text-meta text-link mt-2 inline-flex items-center gap-[0.45rem] justify-self-start underline-offset-[0.2em]"
                href="/security/"
                transitionTypes={["site-route"]}
              >
                Report a security issue
                <ArrowRightIcon aria-hidden="true" size={14} />
              </Link>
            }
            description="Keeping your system safe"
            id="security"
            members={securityTeam}
            title="Omarchy Security"
          />

          <TeamSection
            action={
              <a
                className="text-meta text-link mt-2 inline-flex items-center gap-[0.45rem] justify-self-start underline-offset-[0.2em]"
                href="mailto:rangers@omarchy.org"
              >
                <MailIcon aria-hidden="true" size={14} />
                Apply to join
              </a>
            }
            description="Helping others find their way"
            id="rangers"
            members={rangerTeam}
            title="Omarchy Rangers"
          />
        </main>
      </PageTransition>
    </>
  );
}
