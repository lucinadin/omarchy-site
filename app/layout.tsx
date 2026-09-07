import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { HomeCommandRuntime } from "@/components/home/home-command-runtime";
import { BackToTopButton } from "@/components/site/back-to-top-button";
import { HistoryTransitions } from "@/components/site/history-transitions";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNotificationRuntime } from "@/components/site/site-notification-runtime";
import { SiteSearchRuntime } from "@/components/site/site-search-runtime";
import { ScreenOverlayTarget } from "@/features/effects/components/screen-overlay-target";
import { SecretLabRuntime } from "@/features/effects/components/secret-lab-runtime";
import { getLogoCapabilityBootstrapScript } from "@/lib/effects/logo/capability-bootstrap";
import { siteTagline, siteTitle } from "@/lib/site-brand";
import { getThemeBootstrapScript } from "@/lib/themes/theme-bootstrap";
import { wallpapers } from "@/lib/themes/wallpapers";
import { LogoEffectsProvider, ScreenEffectsProvider, ThemePreferenceProvider } from "@/providers";
import "@wterm/react/css";

import "./globals.css";
import "./view-transitions.css";

const jetBrainsMono = localFont({
  variable: "--font-jetbrains-mono",
  display: "swap",
  src: "../public/assets/fonts/JetBrainsMono-Variable.woff2",
  weight: "100 800",
});

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: "%s",
  },
  description: siteTagline,
  icons: { icon: "/assets/images/favicon.png" },
  openGraph: {
    title: "Omarchy",
    description: siteTagline,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Omarchy",
    description: siteTagline,
  },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: "#1a1b26",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${jetBrainsMono.variable} scrollbar-thumb-muted scrollbar-track-background`}
      data-theme="tokyo-night"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script data-omarchy-theme-bootstrap suppressHydrationWarning>
          {getThemeBootstrapScript(wallpapers)}
        </script>
        <script data-omarchy-logo-capability-bootstrap suppressHydrationWarning>
          {getLogoCapabilityBootstrapScript()}
        </script>
        <link href="/llms.txt" rel="describedby" type="text/markdown" />
      </head>
      <body>
        <HistoryTransitions />
        <ScreenEffectsProvider>
          <LogoEffectsProvider>
            <ThemePreferenceProvider>
              {children}
              <BackToTopButton />
              <SiteFooter />
              <SiteSearchRuntime />
              <SiteNotificationRuntime />
              <HomeCommandRuntime />
            </ThemePreferenceProvider>
            <ScreenOverlayTarget target="viewport" />
            <SecretLabRuntime />
          </LogoEffectsProvider>
        </ScreenEffectsProvider>
      </body>
    </html>
  );
}
