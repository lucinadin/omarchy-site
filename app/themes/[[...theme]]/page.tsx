import type { Metadata } from "next";

import {
  PageHeader,
  PageHeaderBody,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from "@/components/site/page-header";
import { PageTransition } from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { CommunityThemeGallery } from "@/features/themes/components/community-theme-gallery";
import { OfficialThemeGallery } from "@/features/themes/components/official-theme-gallery";
import { getShareableTheme, getThemeOpenGraphStaticParams } from "@/lib/themes/theme-catalog";
import {
  getThemeOpenGraphHref,
  getThemeShareHref,
  getThemeShareKey,
  parseThemeShareKey,
} from "@/lib/themes/theme-sharing";

export const dynamicParams = false;

const themesDescription = "The official and community-made themes for Omarchy.";

export function generateStaticParams() {
  return [
    { theme: undefined },
    ...getThemeOpenGraphStaticParams().map(({ kind, slug }) => ({ theme: [kind, slug] })),
  ];
}

function getSharedTheme(theme?: string[]) {
  const reference = parseThemeShareKey(theme?.join("/"));
  return reference ? getShareableTheme(reference) : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/themes/[[...theme]]">): Promise<Metadata> {
  const sharedTheme = getSharedTheme((await params).theme);

  if (!sharedTheme) {
    return {
      alternates: { canonical: "/themes/" },
      description: themesDescription,
      title: "Themes — Omarchy",
    };
  }

  const description =
    sharedTheme.kind === "official"
      ? `${sharedTheme.name} is an official theme included with Omarchy.`
      : `${sharedTheme.name} is a community-made theme for Omarchy.`;
  const title = `${sharedTheme.name} — Omarchy Theme`;
  const reference = { kind: sharedTheme.kind, slug: sharedTheme.slug };
  const canonical = getThemeShareHref(reference);
  const socialImage = getThemeOpenGraphHref(reference);
  const image = {
    alt: `${sharedTheme.name} Omarchy theme`,
    height: 630,
    url: socialImage,
    width: 1200,
  };

  return {
    alternates: { canonical },
    description,
    openGraph: { description, images: [image], title, type: "website", url: canonical },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [{ alt: image.alt, url: socialImage }],
      title,
    },
  };
}

export default async function ThemesPage({ params }: PageProps<"/themes/[[...theme]]">) {
  const sharedTheme = getSharedTheme((await params).theme);
  const initialThemeKey = sharedTheme
    ? getThemeShareKey({ kind: sharedTheme.kind, slug: sharedTheme.slug })
    : undefined;

  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="page-main">
          <PageHeader>
            <PageHeaderEyebrow>Built into Omarchy</PageHeaderEyebrow>
            <PageHeaderTitle>Themes</PageHeaderTitle>
            <PageHeaderBody className="typeset">
              <p>
                Omarchy is yours to shape. Start with one of twenty-two complete themes, grab a
                favorite from the community, or make your own. Bend the whole machine to your taste.
              </p>
            </PageHeaderBody>
          </PageHeader>

          <section className="mt-fluid-section" aria-labelledby="official-themes-heading">
            <header className="mb-8 block">
              <div>
                <p className="text-meta leading-copy text-primary mt-0 mb-[0.7rem] max-w-[66ch] font-medium">
                  Installed by default
                </p>
                <h2
                  className="text-title-md text-foreground m-0 leading-tight font-normal"
                  id="official-themes-heading"
                >
                  Official themes
                </h2>
              </div>
              <p className="text-small leading-copy text-muted-foreground mt-fluid-md mb-0 max-w-[66ch]">
                Click a card to open the theme switcher. Hover or focus it to apply, share, or open
                its source.
              </p>
            </header>
            <OfficialThemeGallery initialThemeKey={initialThemeKey} />
          </section>

          <section
            className="border-border mt-fluid-xl pt-fluid-xl border-t"
            aria-labelledby="extra-themes-heading"
          >
            <header className="mb-8 block">
              <div>
                <p className="text-meta leading-copy text-primary mt-0 mb-[0.7rem] max-w-[66ch] font-medium">
                  Made by the Omarchy community
                </p>
                <h2
                  className="text-title-md text-foreground m-0 leading-tight font-normal"
                  id="extra-themes-heading"
                >
                  The Extra Themes
                </h2>
              </div>
              <p className="text-small leading-copy text-muted-foreground mt-fluid-md mb-0 max-w-[66ch]">
                Omarchy was built to be remixed. The community has already made more than a hundred
                themes. Take one, change it, make it yours.
              </p>
            </header>
            <CommunityThemeGallery initialThemeKey={initialThemeKey} />
          </section>
        </main>
      </PageTransition>
    </>
  );
}
