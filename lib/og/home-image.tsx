import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { ogFonts, ogSize, ogWordmarkSource } from "@/lib/og/og-assets";
import { siteBrand } from "@/lib/site-brand";

/* oxlint-disable omarchy/no-unscaled-typography -- Satori renders a fixed 1200×630 image canvas. */
/* oxlint-disable omarchy/no-shadow-drift -- Satori consumes inline styles rather than the website's Tailwind theme. */

const readableTextShadow = "0 2px 12px rgba(0,0,0,0.98)";

const background = await readFile(
  join(process.cwd(), "public/assets/og/home-theme-collage.jpg"),
  "base64"
);
const backgroundSource = `data:image/jpeg;base64,${background}`;

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
        src={backgroundSource}
        style={{ height: "100%", objectFit: "cover", width: "100%" }}
        width={1200}
      />
      <img
        alt="Omarchy"
        height={244}
        src={ogWordmarkSource}
        style={{
          height: 244,
          left: 64,
          objectFit: "contain",
          position: "absolute",
          top: 188,
          width: 1072,
        }}
        width={1072}
      />
      <div
        style={{
          color: "#f4f2fa",
          display: "flex",
          flexDirection: "column",
          fontFamily: "JetBrains Mono",
          fontSize: 27,
          fontWeight: 400,
          left: 68,
          letterSpacing: -0.8,
          lineHeight: 1.28,
          position: "absolute",
          textShadow: readableTextShadow,
          top: 502,
          width: 500,
        }}
      >
        <span>Beautiful, Fun &amp;</span>
        <span>{`Agentic Linux by ${siteBrand.author}`}</span>
      </div>
      <div
        style={{
          color: "#9ece6a",
          display: "flex",
          flexDirection: "column",
          fontFamily: "JetBrains Mono",
          fontSize: 34,
          fontWeight: 700,
          left: 916,
          letterSpacing: -1.2,
          lineHeight: 1.18,
          position: "absolute",
          textShadow: readableTextShadow,
          top: 500,
          width: 240,
        }}
      >
        <span>We can fix</span>
        <span>everything.</span>
      </div>
    </div>,
    { ...ogSize, fonts: ogFonts }
  );
}
