import { ImageResponse } from "next/og";

import { getOgWordmarkSource, ogFonts, ogSize } from "@/lib/og/og-assets";
import type { ThemeKind } from "@/lib/themes/themes";

/* oxlint-disable omarchy/no-unscaled-typography -- Satori renders a fixed 1200×630 image canvas. */

type ThemeImageOptions = {
  accent: string;
  background: string;
  backgroundSource?: string;
  foreground: string;
  kind: ThemeKind;
  name: string;
  palette?: readonly string[];
};

function getTitleSize(name: string) {
  if (name.length <= 16) return 92;
  if (name.length <= 24) return 78;
  if (name.length <= 34) return 68;
  return 58;
}

export function renderThemeOpenGraphImage({
  accent,
  background,
  backgroundSource,
  foreground,
  kind,
  name,
  palette,
}: ThemeImageOptions) {
  const railColors = palette?.length ? palette : [accent];

  return new ImageResponse(
    <div
      style={{
        background,
        color: foreground,
        display: "flex",
        fontFamily: "JetBrains Mono",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      {backgroundSource ? (
        <img
          alt=""
          height={630}
          src={backgroundSource}
          style={{
            height: 630,
            left: 0,
            objectFit: "cover",
            position: "absolute",
            top: 0,
            width: 1200,
          }}
          width={1200}
        />
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: 630,
          left: 0,
          position: "absolute",
          top: 0,
          width: 18,
        }}
      >
        {railColors.map((color, index) => (
          <div
            key={`${color}-${index}`}
            style={{ background: color, display: "flex", flex: 1, width: 18 }}
          />
        ))}
      </div>
      <img
        alt="Omarchy"
        height={90}
        src={getOgWordmarkSource(accent)}
        style={{
          height: 90,
          left: 70,
          objectFit: "contain",
          position: "absolute",
          top: 62,
          width: 390,
        }}
        width={390}
      />
      <div
        style={{
          color: accent,
          display: "flex",
          fontSize: 23,
          fontWeight: 700,
          left: 70,
          letterSpacing: 2.1,
          position: "absolute",
          top: 232,
        }}
      >
        {kind === "official" ? "OFFICIAL OMARCHY THEME" : "COMMUNITY OMARCHY THEME"}
      </div>
      <div
        style={{
          color: foreground,
          display: "flex",
          fontSize: getTitleSize(name),
          fontWeight: 700,
          left: 64,
          letterSpacing: -3,
          lineHeight: 1.04,
          maxWidth: 1068,
          position: "absolute",
          top: 292,
        }}
      >
        {name}
      </div>
      <div
        style={{
          color: accent,
          display: "flex",
          fontSize: 22,
          fontWeight: 700,
          left: 70,
          letterSpacing: 1.6,
          position: "absolute",
          top: 552,
        }}
      >
        OMARCHY.ORG/THEMES
      </div>
    </div>,
    { ...ogSize, fonts: ogFonts }
  );
}
