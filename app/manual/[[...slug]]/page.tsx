import type { Metadata } from "next";

import { PageTransition } from "@/components/site/page-transition";
import { ManualArticle } from "@/features/manual/components/manual-document";
import { getManualDocument, getManualStaticParams } from "@/features/manual/manual-queries";
import { siteTagline } from "@/lib/site-brand";

export const dynamicParams = false;

export function generateStaticParams() {
  return getManualStaticParams();
}

export async function generateMetadata({
  params,
}: PageProps<"/manual/[[...slug]]">): Promise<Metadata> {
  const { slug } = await params;
  const document = await getManualDocument(slug?.join("/") ?? "");
  const canonical = document?.chapter.href ?? "/manual/";
  const markdown = document?.chapter.slug ? `${canonical}index.md` : "/manual/index.md";
  const socialTitle = document
    ? `${document.chapter.title} — The Omarchy Manual`
    : "The Omarchy Manual";
  const socialImageSlug = document?.chapter.slug || "index";
  const socialImage = {
    alt: socialTitle,
    height: 630,
    url: `/assets/og/manual/${socialImageSlug}.webp`,
    width: 1200,
  };

  const metadata: Metadata = {
    alternates: {
      canonical,
      types: { "text/markdown": markdown },
    },
    openGraph: {
      description: siteTagline,
      images: [socialImage],
      title: socialTitle,
      type: "article",
    },
    title: socialTitle,
    twitter: {
      card: "summary_large_image",
      description: siteTagline,
      images: [socialImage],
      title: socialTitle,
    },
  };

  if (document?.chapter.slug === "toc") {
    metadata.description = `The complete manual for Omarchy — ${siteTagline}.`;
  }

  return metadata;
}

export default async function ManualPage({ params }: PageProps<"/manual/[[...slug]]">) {
  const { slug } = await params;

  return (
    <PageTransition>
      <ManualArticle slug={slug?.join("/") ?? ""} />
    </PageTransition>
  );
}
