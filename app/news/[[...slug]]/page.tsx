import type { Metadata } from "next";
import Link from "next/link";

import {
  PageHeader,
  PageHeaderEyebrow,
  PageHeaderMeta,
  PageHeaderTitle,
} from "@/components/site/page-header";
import { PageTransition } from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { NewsIndex } from "@/features/news/components/news-index";
import { NewsPost } from "@/features/news/components/news-post";
import { getNewsPost, getNewsStaticParams } from "@/features/news/news-queries";

export const dynamicParams = false;

export function generateStaticParams() {
  return getNewsStaticParams();
}

function getSocialImage(slug?: string[]) {
  return slug ? `/assets/og/news/${slug.join("/")}.png` : "/assets/og/news/index.png";
}

function getAlternateTypes(markdownUrl: string) {
  return {
    "application/atom+xml": "/news/atom.xml",
    "application/rss+xml": "/news/rss.xml",
    "text/markdown": markdownUrl,
  };
}

export async function generateMetadata({
  params,
}: PageProps<"/news/[[...slug]]">): Promise<Metadata> {
  const { slug } = await params;

  if (!slug) {
    const description = "Announcements, releases, and other news from Omarchy.";
    const socialImage = getSocialImage();

    return {
      alternates: {
        canonical: "/news/",
        types: getAlternateTypes("/news/index.md"),
      },
      description,
      openGraph: {
        description,
        images: [{ alt: "Omarchy News", height: 630, url: socialImage, width: 1200 }],
        title: "Omarchy News",
        type: "website",
      },
      title: "Omarchy News",
      twitter: {
        card: "summary_large_image",
        description,
        images: [{ alt: "Omarchy News", url: socialImage }],
        title: "Omarchy News",
      },
    };
  }

  const post = await getNewsPost(slug.join("/"));
  const canonical = post?.href ?? `/news/${slug.join("/")}/`;
  const description = post?.excerpt ?? "News from Omarchy.";
  const title = post?.title ?? "Omarchy News";
  const socialImage = getSocialImage(slug);

  return {
    alternates: {
      canonical,
      types: getAlternateTypes(`${canonical}index.md`),
    },
    description,
    openGraph: {
      description,
      images: [{ alt: title, height: 630, url: socialImage, width: 1200 }],
      publishedTime: post?.dateTime,
      title,
      type: "article",
    },
    title: post ? `${post.title} — Omarchy News` : "Omarchy News",
    twitter: {
      card: "summary_large_image",
      description,
      images: [{ alt: title, url: socialImage }],
      title,
    },
  };
}

export default async function NewsPage({ params }: PageProps<"/news/[[...slug]]">) {
  const { slug } = await params;
  const postSlug = slug?.join("/");

  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="content-container min-h-screen pt-16 pb-24">
          {postSlug ? (
            <NewsPost slug={postSlug} />
          ) : (
            <section className="mx-auto w-full max-w-[1200px] min-w-0 pt-[calc(var(--page-header-offset)-64px)]">
              <PageHeader className="mb-fluid-2xl">
                <PageHeaderEyebrow>Omarchy News</PageHeaderEyebrow>
                <PageHeaderTitle>Announcements, releases, and other news</PageHeaderTitle>
                <PageHeaderMeta>
                  <nav
                    className="text-small flex items-center justify-center gap-5"
                    aria-label="News feeds"
                  >
                    <Link
                      className="text-link underline-offset-[0.2em]"
                      href="/news/rss.xml"
                      prefetch={false}
                    >
                      RSS feed
                    </Link>
                    <Link
                      className="text-link underline-offset-[0.2em]"
                      href="/news/atom.xml"
                      prefetch={false}
                    >
                      Atom feed
                    </Link>
                  </nav>
                </PageHeaderMeta>
              </PageHeader>
              <NewsIndex className="md:grid-cols-3" />
            </section>
          )}
        </main>
      </PageTransition>
    </>
  );
}
