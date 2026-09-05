import { notFound } from "next/navigation";
import { ViewTransition } from "react";

import { PageBackLink } from "@/components/site/page-back-link";
import { SiteShareButton } from "@/components/site/site-share-button";
import { getNewsPost } from "@/features/news/news-queries";
import { getNewsTitleTransitionName } from "@/features/news/news-transitions";

export async function NewsPost({ slug }: { slug: string }) {
  const post = await getNewsPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="reader-document">
      <header className="reader-document__header">
        <PageBackLink href="/news/">News</PageBackLink>
        <div className="mb-[1.1rem] flex items-center justify-between gap-4">
          <p className="text-meta leading-copy text-primary m-0 font-medium">
            {post.author} on <time dateTime={post.dateTime}>{post.date}</time>
          </p>
          <SiteShareButton
            className="hidden md:inline-flex"
            context="article"
            label="Share"
            shareDescription={post.excerpt}
          />
        </div>
        <ViewTransition
          default="none"
          name={getNewsTitleTransitionName(post.slug)}
          share="news-title-morph"
        >
          <h1 className="reader-document__title">{post.title}</h1>
        </ViewTransition>
      </header>
      <div className="typeset typeset-news">
        <post.Content />
      </div>
    </article>
  );
}
