"use client";

/* oxlint-disable react/iframe-missing-sandbox -- YouTube's cross-origin player requires script and origin access. */

import Image from "next/image";
import { useState } from "react";

import { YouTubePlayIcon } from "@/icons";

type YouTubeVideoProps = {
  alt: string;
  id: string;
  poster: string;
  title: string;
};

export function YouTubeVideo({ alt, id, poster, title }: YouTubeVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  if (isPlaying) {
    return (
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="border-border block aspect-video w-full border"
        referrerPolicy="strict-origin-when-cross-origin"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title={title}
      />
    );
  }

  return (
    <button
      aria-label={`Play: ${title}`}
      className="group border-border relative block aspect-video overflow-hidden border text-inherit"
      onClick={() => setIsPlaying(true)}
      type="button"
    >
      <span className="relative block aspect-video overflow-hidden bg-(--dark-background)">
        <Image
          alt={alt}
          className="block h-full w-full object-cover transition-transform duration-[180ms] ease-[ease] group-hover:scale-[1.02]"
          height={720}
          sizes="(max-width: 900px) 100vw, 66vw"
          src={poster}
          width={1280}
        />
        <span className="absolute inset-0 flex items-center justify-center [&_svg]:block [&_svg]:h-auto [&_svg]:w-[min(13%,5.5rem)] [&_svg]:overflow-visible [&_svg]:transition-transform [&_svg]:duration-[180ms] [&_svg]:ease-[ease] [&_svg]:[shape-rendering:geometricPrecision] group-hover:[&_svg]:-translate-y-[0.1rem]">
          <YouTubePlayIcon />
        </span>
      </span>
    </button>
  );
}
