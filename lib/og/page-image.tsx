import { ImageResponse } from "next/og";

import { getOgWordmarkSource, ogFonts, ogSize, ogWallpaperSource } from "@/lib/og/og-assets";
import type { ThemeMode } from "@/lib/themes/themes";

/* oxlint-disable omarchy/no-unscaled-typography -- Satori renders a fixed 1200×630 image canvas. */

type PageImageOptions = {
  accent?: string;
  background?: string;
  backgroundSource?: string | null;
  description?: string;
  eyebrow?: string;
  footer?: string;
  foreground?: string;
  layout?: "centered" | "editorial" | "theme";
  mode?: ThemeMode;
  palette?: readonly string[];
  scale?: 1 | 2;
  title: string;
};

function getTitleSize(title: string) {
  if (title.length <= 16) return 92;
  if (title.length <= 24) return 78;
  if (title.length <= 34) return 68;
  if (title.length <= 68) return 58;
  return 46;
}

function CenteredPageContent({
  accent,
  description,
  scale,
  title,
}: Required<Pick<PageImageOptions, "accent" | "scale" | "title">> &
  Pick<PageImageOptions, "description">) {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        gap: 32 * scale,
        height: 630 * scale,
        justifyContent: "center",
        left: 70 * scale,
        position: "absolute",
        top: 0,
        width: 1060 * scale,
      }}
    >
      <img
        alt="Omarchy"
        src={getOgWordmarkSource(accent)}
        width={1000 * scale}
        height={230 * scale}
        style={{ height: 230 * scale, objectFit: "contain", width: 1000 * scale }}
      />
      <div
        style={{
          display: "flex",
          fontSize: 40 * scale,
          fontWeight: 400,
          justifyContent: "center",
          lineHeight: 1.2,
          textAlign: "center",
          width: 1060 * scale,
        }}
      >
        {title}
      </div>
      {description ? (
        <div
          style={{
            display: "flex",
            fontSize: 24 * scale,
            lineHeight: 1.35,
            textAlign: "center",
            width: 1000 * scale,
          }}
        >
          {description}
        </div>
      ) : null}
    </div>
  );
}

export function renderPageOpenGraphImage({
  accent = "#9ece6a",
  background = "#000000",
  backgroundSource = ogWallpaperSource,
  description,
  eyebrow,
  footer,
  foreground = "#f4f2fa",
  layout = "editorial",
  mode = "dark",
  palette,
  scale = 1,
  title,
}: PageImageOptions) {
  const centeredEyebrow = layout === "centered" ? eyebrow : undefined;
  const overlay = mode === "light" ? "255,255,255" : "0,0,0";

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
          height={630 * scale}
          src={backgroundSource}
          style={{
            height: 630 * scale,
            left: 0,
            objectFit: "cover",
            position: "absolute",
            top: 0,
            width: 1200 * scale,
          }}
          width={1200 * scale}
        />
      ) : null}
      <div
        style={{
          background:
            layout === "theme"
              ? `linear-gradient(90deg, rgba(${overlay},0.96) 0%, rgba(${overlay},0.88) 55%, rgba(${overlay},0.24) 100%)`
              : `rgba(${overlay},0.65)`,
          height: 630 * scale,
          left: 0,
          position: "absolute",
          top: 0,
          width: 1200 * scale,
        }}
      />
      {palette && palette.length > 1 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: 630 * scale,
            left: 0,
            position: "absolute",
            top: 0,
            width: 24 * scale,
          }}
        >
          {palette.map((color) => (
            <div
              key={color}
              style={{ background: color, display: "flex", flex: 1, width: 24 * scale }}
            />
          ))}
        </div>
      ) : null}

      {layout === "centered" ? (
        <CenteredPageContent
          accent={accent}
          description={description}
          scale={scale}
          title={title}
        />
      ) : (
        <>
          <img
            alt="Omarchy"
            height={90 * scale}
            src={getOgWordmarkSource(accent)}
            style={{
              height: 90 * scale,
              left: 70 * scale,
              objectFit: "contain",
              position: "absolute",
              top: 62 * scale,
              width: 390 * scale,
            }}
            width={390 * scale}
          />
          {eyebrow ? (
            <div
              style={{
                color: accent,
                display: "flex",
                fontSize: 23 * scale,
                fontWeight: 700,
                left: 70 * scale,
                letterSpacing: 2.1 * scale,
                position: "absolute",
                top: 180 * scale,
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24 * scale,
              left: 64 * scale,
              position: "absolute",
              top: 240 * scale,
              width: 1068 * scale,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: getTitleSize(title) * scale,
                fontWeight: 700,
                letterSpacing: -3 * scale,
                lineHeight: 1.04,
              }}
            >
              {title}
            </div>
            {description ? (
              <div style={{ display: "flex", fontSize: 28 * scale, lineHeight: 1.35 }}>
                {description}
              </div>
            ) : null}
          </div>
        </>
      )}
      {centeredEyebrow ? (
        <div
          style={{
            color: accent,
            display: "flex",
            fontSize: 22 * scale,
            fontWeight: 700,
            left: 70 * scale,
            letterSpacing: 1.6 * scale,
            position: "absolute",
            top: 552 * scale,
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      {footer ? (
        <div
          style={{
            color: accent,
            display: "flex",
            fontSize: 22 * scale,
            fontWeight: 700,
            ...(centeredEyebrow ? { right: 70 * scale } : { left: 70 * scale }),
            letterSpacing: 1.6 * scale,
            position: "absolute",
            top: 552 * scale,
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>,
    { width: ogSize.width * scale, height: ogSize.height * scale, fonts: ogFonts }
  );
}
