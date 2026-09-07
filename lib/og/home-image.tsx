import { ImageResponse } from "next/og";

import { ogFonts, ogSize, ogWallpaperSource, ogWordmarkSource } from "@/lib/og/og-assets";
import { siteTagline } from "@/lib/site-brand";

/* oxlint-disable omarchy/no-unscaled-typography -- Satori renders a fixed 1200×630 image canvas. */
/* oxlint-disable omarchy/no-shadow-drift -- Satori consumes inline styles rather than the website's Tailwind theme. */

const readableTextShadow = "0 2px 12px rgba(0,0,0,0.98)";

export function renderHomeOpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        background: "#08090d",
        display: "flex",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      <img
        alt=""
        height={630}
        src={ogWallpaperSource}
        style={{ height: "100%", objectFit: "cover", width: "100%" }}
        width={1200}
      />
      <div
        style={{
          background: "rgba(0,0,0,0.45)",
          height: "100%",
          left: 0,
          position: "absolute",
          top: 0,
          width: "100%",
        }}
      />

      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: 32,
          height: "100%",
          justifyContent: "center",
          left: 0,
          position: "absolute",
          top: 0,
          width: "100%",
        }}
      >
        <img
          alt="Omarchy"
          height={244}
          width={1072}
          src={ogWordmarkSource}
          style={{ height: 244, objectFit: "contain", width: 1072 }}
        />
        <div
          style={{
            color: "#f4f2fa",
            display: "flex",
            fontFamily: "JetBrains Mono",
            fontSize: 32,
            fontWeight: 400,
            lineHeight: 1.2,
            textAlign: "center",
            textShadow: readableTextShadow,
          }}
        >
          {siteTagline}
        </div>
      </div>
      <div
        style={{
          color: "#9ece6a",
          display: "flex",
          fontFamily: "JetBrains Mono",
          fontSize: 22,
          fontWeight: 700,
          left: 70,
          letterSpacing: 1.6,
          lineHeight: 1.18,
          position: "absolute",
          textShadow: readableTextShadow,
          top: 552,
          width: 600,
        }}
      >
        We can fix everything.
      </div>
    </div>,
    { ...ogSize, fonts: ogFonts }
  );
}
