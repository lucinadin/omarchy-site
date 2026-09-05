import { ImageResponse } from "next/og";

import { ogFonts, ogSize, ogWordmarkSource } from "@/lib/og/og-assets";
import { siteBrand } from "@/lib/site-brand";

/* oxlint-disable omarchy/no-unscaled-typography -- Satori renders a fixed 1200×630 image canvas. */

export function renderBaseOpenGraphImage() {
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
      <img
        alt="Omarchy"
        height={245}
        src={ogWordmarkSource}
        style={{
          height: 245,
          left: 68,
          objectFit: "contain",
          position: "absolute",
          top: 145,
          width: 1064,
        }}
        width={1064}
      />
      <div
        style={{
          color: "#9ece6a",
          display: "flex",
          fontSize: 22,
          fontWeight: 700,
          left: 70,
          letterSpacing: 2.2,
          position: "absolute",
          top: 442,
        }}
      >
        WE CAN FIX EVERYTHING.
      </div>
      <div
        style={{
          alignItems: "flex-end",
          bottom: 52,
          display: "flex",
          left: 70,
          justifyContent: "space-between",
          position: "absolute",
          right: 68,
        }}
      >
        <div
          style={{
            alignItems: "baseline",
            display: "flex",
            fontSize: 31,
            letterSpacing: -1,
            lineHeight: 1.28,
          }}
        >
          <span>{siteBrand.descriptor}</span>
          <span style={{ color: "#9ece6a", display: "flex", marginLeft: 18 }}>
            {`by ${siteBrand.author}`}
          </span>
        </div>
        <div
          style={{
            color: "#7aa2f7",
            display: "flex",
            fontSize: 31,
            fontWeight: 700,
            letterSpacing: 1.8,
            lineHeight: 1.28,
          }}
        >
          OMARCHY.ORG
        </div>
      </div>
    </div>,
    { ...ogSize, fonts: ogFonts }
  );
}
