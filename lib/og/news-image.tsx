import { ImageResponse } from "next/og";

import { ogFonts, ogLogoSource, ogSize, ogWordmarkSource } from "@/lib/og/og-assets";

/* oxlint-disable omarchy/no-unscaled-typography -- Satori renders a fixed 1200×630 image canvas. */

type NewsImageOptions = {
  meta: string;
  title: string;
};

function getTitleSize(title: string) {
  if (title.length <= 34) return 70;
  if (title.length <= 52) return 60;
  if (title.length <= 68) return 52;
  return 46;
}

export function renderNewsOpenGraphImage({ meta, title }: NewsImageOptions) {
  return new ImageResponse(
    <div
      style={{
        background: "#0e0e14",
        color: "#c0caf5",
        display: "flex",
        fontFamily: "JetBrains Mono",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#181a24",
          display: "flex",
          height: 630,
          left: 0,
          position: "absolute",
          top: 0,
          width: 28,
        }}
      />
      <div
        style={{
          background: "#9ece6a",
          display: "flex",
          height: 196,
          left: 0,
          position: "absolute",
          top: 0,
          width: 28,
        }}
      />
      <img
        alt="Omarchy"
        height={83}
        src={ogWordmarkSource}
        style={{
          height: 83,
          left: 68,
          objectFit: "contain",
          position: "absolute",
          top: 62,
          width: 360,
        }}
        width={360}
      />
      <img
        alt=""
        height={64}
        src={ogLogoSource}
        style={{
          height: 64,
          objectFit: "contain",
          position: "absolute",
          right: 68,
          top: 62,
          width: 64,
        }}
        width={64}
      />
      <div
        style={{
          color: "#9ece6a",
          display: "flex",
          fontSize: 24,
          fontWeight: 700,
          left: 70,
          letterSpacing: 2.2,
          position: "absolute",
          top: 201,
        }}
      >
        OMARCHY NEWS
      </div>
      <div
        style={{
          color: "#f4f2fa",
          display: "flex",
          fontSize: getTitleSize(title),
          fontWeight: 700,
          left: 66,
          letterSpacing: -2.2,
          lineHeight: 1.08,
          maxWidth: 1060,
          position: "absolute",
          top: 260,
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: "#7aa2f7",
          display: "flex",
          fontSize: 18,
          fontWeight: 700,
          left: 70,
          letterSpacing: 1.2,
          position: "absolute",
          top: 558,
        }}
      >
        {meta.toUpperCase()}
      </div>
    </div>,
    { ...ogSize, fonts: ogFonts }
  );
}
