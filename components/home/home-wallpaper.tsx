"use client";

import { useSyncExternalStore } from "react";

import { HomeExperimentBackground } from "@/components/home/home-experiment-background";
import { Image } from "@/components/ui/image";
import { startWallpaperParallax } from "@/lib/effects/wallpaper/parallax";
import {
  getBackgroundSnapshot,
  getServerBackgroundSnapshot,
  resolveBackground,
  subscribeBackground,
} from "@/lib/themes/background";
import { wallpapers } from "@/lib/themes/wallpapers";

export function HomeWallpaper({ themeId }: { themeId: string | null }) {
  const preference = useSyncExternalStore(
    subscribeBackground,
    getBackgroundSnapshot,
    getServerBackgroundSnapshot
  );
  const background = resolveBackground(preference, themeId);

  // The bootstrap paints the saved background before hydration. Wait for the
  // theme snapshot rather than requesting the default wallpaper first.
  if (themeId === null) {
    return (
      <div aria-hidden="true" className="home-desktop__wallpaper bg-(image:--wallpaper-blur)" />
    );
  }
  if (background?.kind === "experiment") return <HomeExperimentBackground />;
  if (background?.kind === "solid") {
    return (
      <div
        aria-hidden="true"
        className="home-desktop__wallpaper"
        style={{ backgroundColor: background.color }}
      />
    );
  }
  if (!background) {
    return (
      <div aria-hidden="true" className="home-desktop__wallpaper bg-(image:--desktop-wallpaper)" />
    );
  }
  return (
    <Image
      alt=""
      aria-hidden="true"
      className="home-desktop__wallpaper object-cover"
      fetchPriority="high"
      fill
      key={background.themeId}
      loading="eager"
      placeholder="blur"
      ref={startWallpaperParallax}
      sizes="(max-width: 1280px) 100vw, 1280px"
      src={wallpapers[background.themeId]}
    />
  );
}
