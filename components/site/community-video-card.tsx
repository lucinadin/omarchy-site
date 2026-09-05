import Image from "next/image";

import { YouTubePlayIcon } from "@/icons";

type CommunityVideoCardProps = {
  creator: string;
  id: string;
  poster: string;
  title: string;
};

export function CommunityVideoCard({ creator, id, poster, title }: CommunityVideoCardProps) {
  return (
    <a
      aria-label={`Watch on YouTube: ${title}`}
      className="group grid gap-4 text-inherit no-underline"
      href={`https://www.youtube.com/watch?v=${id}`}
    >
      <span className="border-border relative block aspect-video overflow-hidden border bg-(--dark-background)">
        <Image
          alt={`${title} by ${creator}`}
          className="block h-full w-full object-cover transition-transform duration-[180ms] ease-[ease] group-hover:scale-[1.02]"
          height={720}
          sizes="(min-width: 640px) 50vw, 100vw"
          src={poster}
          width={1280}
        />
        <span className="absolute inset-0 flex items-center justify-center [&_svg]:block [&_svg]:h-auto [&_svg]:w-[min(11%,4rem)] [&_svg]:overflow-visible [&_svg]:transition-transform [&_svg]:duration-[180ms] [&_svg]:ease-[ease] [&_svg]:[shape-rendering:geometricPrecision] group-hover:[&_svg]:-translate-y-[0.1rem]">
          <YouTubePlayIcon />
        </span>
      </span>
      <span className="grid gap-[0.4rem]">
        <span className="text-meta text-primary">{creator}</span>
        <strong className="text-body leading-ui text-bright-foreground">{title}</strong>
      </span>
    </a>
  );
}
