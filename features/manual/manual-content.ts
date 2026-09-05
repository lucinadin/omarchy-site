import "server-only";
import type { MDXContent } from "mdx/types";

import ManualChapter0 from "@/content/manual/01-welcome-to-omarchy.mdx";
import ManualChapter1 from "@/content/manual/02-getting-started.mdx";
import ManualChapter2 from "@/content/manual/03-coming-from-mac-or-windows.mdx";
import ManualChapter3 from "@/content/manual/04-navigation.mdx";
import ManualChapter4 from "@/content/manual/05-the-top-bar.mdx";
import ManualChapter5 from "@/content/manual/06-themes.mdx";
import ManualChapter6 from "@/content/manual/07-hotkeys.mdx";
import ManualChapter7 from "@/content/manual/08-unified-clipboard-history.mdx";
import ManualChapter8 from "@/content/manual/09-reminders.mdx";
import ManualChapter9 from "@/content/manual/10-notices.mdx";
import ManualChapter10 from "@/content/manual/11-text-extraction-dictation.mdx";
import ManualChapter11 from "@/content/manual/12-screenshots-recording.mdx";
import ManualChapter12 from "@/content/manual/13-toggles-idle-screensaver.mdx";
import ManualChapter13 from "@/content/manual/14-omarchy-cli.mdx";
import ManualChapter14 from "@/content/manual/15-terminal.mdx";
import ManualChapter15 from "@/content/manual/16-neovim.mdx";
import ManualChapter16 from "@/content/manual/17-ai.mdx";
import ManualChapter17 from "@/content/manual/18-development-tools.mdx";
import ManualChapter18 from "@/content/manual/19-shell-tools.mdx";
import ManualChapter19 from "@/content/manual/20-shell-functions.mdx";
import ManualChapter20 from "@/content/manual/21-tuis.mdx";
import ManualChapter21 from "@/content/manual/22-guis.mdx";
import ManualChapter22 from "@/content/manual/23-browsers.mdx";
import ManualChapter23 from "@/content/manual/24-commercial-apps-services.mdx";
import ManualChapter24 from "@/content/manual/25-web-apps.mdx";
import ManualChapter25 from "@/content/manual/26-gaming.mdx";
import ManualChapter26 from "@/content/manual/27-filling-out-pdfs.mdx";
import ManualChapter27 from "@/content/manual/28-windows-vm.mdx";
import ManualChapter28 from "@/content/manual/29-other-packages.mdx";
import ManualChapter29 from "@/content/manual/30-updates.mdx";
import ManualChapter30 from "@/content/manual/31-dotfiles.mdx";
import ManualChapter31 from "@/content/manual/32-shell-plugins.mdx";
import ManualChapter32 from "@/content/manual/33-monitors.mdx";
import ManualChapter33 from "@/content/manual/34-keyboard-mouse-trackpad.mdx";
import ManualChapter34 from "@/content/manual/35-networking.mdx";
import ManualChapter35 from "@/content/manual/36-system-sleep.mdx";
import ManualChapter36 from "@/content/manual/37-hardware-authentication.mdx";
import ManualChapter37 from "@/content/manual/38-fonts.mdx";
import ManualChapter38 from "@/content/manual/39-backgrounds.mdx";
import ManualChapter39 from "@/content/manual/40-prompt.mdx";
import ManualChapter40 from "@/content/manual/41-branding.mdx";
import ManualChapter41 from "@/content/manual/42-common-tweaks.mdx";
import ManualChapter42 from "@/content/manual/43-making-your-own-theme.mdx";
import ManualChapter43 from "@/content/manual/44-mac-support.mdx";
import ManualChapter44 from "@/content/manual/45-troubleshooting.mdx";
import ManualChapter45 from "@/content/manual/46-faq.mdx";
import ManualChapter46 from "@/content/manual/47-system-snapshots.mdx";
import ManualChapter47 from "@/content/manual/48-security.mdx";
import ManualChapter48 from "@/content/manual/49-omarchy-on.mdx";
import ManualChapter49 from "@/content/manual/50-dual-boot-install.mdx";
import ManualChapter50 from "@/content/manual/51-unattended-installs.mdx";
import ManualTableOfContents from "@/content/manual/toc.mdx";

type ManualContentEntry = {
  Content: MDXContent;
  href: string;
  slug: string;
  title: string;
};

export const manualContent: ManualContentEntry[] = [
  {
    Content: ManualChapter0,
    href: "/manual/",
    slug: "",
    title: "Welcome to Omarchy!",
  },
  {
    Content: ManualChapter1,
    href: "/manual/getting-started/",
    slug: "getting-started",
    title: "Getting Started",
  },
  {
    Content: ManualChapter2,
    href: "/manual/coming-from-mac-or-windows/",
    slug: "coming-from-mac-or-windows",
    title: "Coming From Mac or Windows",
  },
  {
    Content: ManualChapter3,
    href: "/manual/navigation/",
    slug: "navigation",
    title: "Navigation",
  },
  {
    Content: ManualChapter4,
    href: "/manual/the-top-bar/",
    slug: "the-top-bar",
    title: "The Top Bar",
  },
  {
    Content: ManualChapter5,
    href: "/manual/themes/",
    slug: "themes",
    title: "Themes",
  },
  {
    Content: ManualChapter6,
    href: "/manual/hotkeys/",
    slug: "hotkeys",
    title: "Hotkeys",
  },
  {
    Content: ManualChapter7,
    href: "/manual/unified-clipboard-history/",
    slug: "unified-clipboard-history",
    title: "Unified Clipboard & History",
  },
  {
    Content: ManualChapter8,
    href: "/manual/reminders/",
    slug: "reminders",
    title: "Reminders",
  },
  {
    Content: ManualChapter9,
    href: "/manual/notices/",
    slug: "notices",
    title: "Notices",
  },
  {
    Content: ManualChapter10,
    href: "/manual/text-extraction-dictation/",
    slug: "text-extraction-dictation",
    title: "Text Extraction & Dictation",
  },
  {
    Content: ManualChapter11,
    href: "/manual/screenshots-recording/",
    slug: "screenshots-recording",
    title: "Screenshots & Recording",
  },
  {
    Content: ManualChapter12,
    href: "/manual/toggles-idle-screensaver/",
    slug: "toggles-idle-screensaver",
    title: "Toggles, Idle & the Screensaver",
  },
  {
    Content: ManualChapter13,
    href: "/manual/omarchy-cli/",
    slug: "omarchy-cli",
    title: "Omarchy CLI",
  },
  {
    Content: ManualChapter14,
    href: "/manual/terminal/",
    slug: "terminal",
    title: "Terminal",
  },
  {
    Content: ManualChapter15,
    href: "/manual/neovim/",
    slug: "neovim",
    title: "Neovim",
  },
  {
    Content: ManualChapter16,
    href: "/manual/ai/",
    slug: "ai",
    title: "AI",
  },
  {
    Content: ManualChapter17,
    href: "/manual/development-tools/",
    slug: "development-tools",
    title: "Development Tools",
  },
  {
    Content: ManualChapter18,
    href: "/manual/shell-tools/",
    slug: "shell-tools",
    title: "Shell Tools",
  },
  {
    Content: ManualChapter19,
    href: "/manual/shell-functions/",
    slug: "shell-functions",
    title: "Shell Functions",
  },
  {
    Content: ManualChapter20,
    href: "/manual/tuis/",
    slug: "tuis",
    title: "TUIs",
  },
  {
    Content: ManualChapter21,
    href: "/manual/guis/",
    slug: "guis",
    title: "GUIs",
  },
  {
    Content: ManualChapter22,
    href: "/manual/browsers/",
    slug: "browsers",
    title: "Browsers",
  },
  {
    Content: ManualChapter23,
    href: "/manual/commercial-apps-services/",
    slug: "commercial-apps-services",
    title: "Commercial apps/services",
  },
  {
    Content: ManualChapter24,
    href: "/manual/web-apps/",
    slug: "web-apps",
    title: "Web Apps",
  },
  {
    Content: ManualChapter25,
    href: "/manual/gaming/",
    slug: "gaming",
    title: "Gaming",
  },
  {
    Content: ManualChapter26,
    href: "/manual/filling-out-pdfs/",
    slug: "filling-out-pdfs",
    title: "Filling out PDFs",
  },
  {
    Content: ManualChapter27,
    href: "/manual/windows-vm/",
    slug: "windows-vm",
    title: "Windows VM",
  },
  {
    Content: ManualChapter28,
    href: "/manual/other-packages/",
    slug: "other-packages",
    title: "Other Packages",
  },
  {
    Content: ManualChapter29,
    href: "/manual/updates/",
    slug: "updates",
    title: "Updates",
  },
  {
    Content: ManualChapter30,
    href: "/manual/dotfiles/",
    slug: "dotfiles",
    title: "Dotfiles",
  },
  {
    Content: ManualChapter31,
    href: "/manual/shell-plugins/",
    slug: "shell-plugins",
    title: "Shell Plugins",
  },
  {
    Content: ManualChapter32,
    href: "/manual/monitors/",
    slug: "monitors",
    title: "Monitors",
  },
  {
    Content: ManualChapter33,
    href: "/manual/keyboard-mouse-trackpad/",
    slug: "keyboard-mouse-trackpad",
    title: "Keyboard, Mouse, Trackpad",
  },
  {
    Content: ManualChapter34,
    href: "/manual/networking/",
    slug: "networking",
    title: "Networking",
  },
  {
    Content: ManualChapter35,
    href: "/manual/system-sleep/",
    slug: "system-sleep",
    title: "System sleep",
  },
  {
    Content: ManualChapter36,
    href: "/manual/hardware-authentication/",
    slug: "hardware-authentication",
    title: "Hardware authentication",
  },
  {
    Content: ManualChapter37,
    href: "/manual/fonts/",
    slug: "fonts",
    title: "Fonts",
  },
  {
    Content: ManualChapter38,
    href: "/manual/backgrounds/",
    slug: "backgrounds",
    title: "Backgrounds",
  },
  {
    Content: ManualChapter39,
    href: "/manual/prompt/",
    slug: "prompt",
    title: "Prompt",
  },
  {
    Content: ManualChapter40,
    href: "/manual/branding/",
    slug: "branding",
    title: "Branding",
  },
  {
    Content: ManualChapter41,
    href: "/manual/common-tweaks/",
    slug: "common-tweaks",
    title: "Common tweaks",
  },
  {
    Content: ManualChapter42,
    href: "/manual/making-your-own-theme/",
    slug: "making-your-own-theme",
    title: "Making your own theme",
  },
  {
    Content: ManualChapter43,
    href: "/manual/mac-support/",
    slug: "mac-support",
    title: "Mac support",
  },
  {
    Content: ManualChapter44,
    href: "/manual/troubleshooting/",
    slug: "troubleshooting",
    title: "Troubleshooting",
  },
  {
    Content: ManualChapter45,
    href: "/manual/faq/",
    slug: "faq",
    title: "FAQ",
  },
  {
    Content: ManualChapter46,
    href: "/manual/system-snapshots/",
    slug: "system-snapshots",
    title: "System snapshots",
  },
  {
    Content: ManualChapter47,
    href: "/manual/security/",
    slug: "security",
    title: "Security",
  },
  {
    Content: ManualChapter48,
    href: "/manual/omarchy-on/",
    slug: "omarchy-on",
    title: "Omarchy on...",
  },
  {
    Content: ManualChapter49,
    href: "/manual/dual-boot-install/",
    slug: "dual-boot-install",
    title: "Dual Boot Install",
  },
  {
    Content: ManualChapter50,
    href: "/manual/unattended-installs/",
    slug: "unattended-installs",
    title: "Unattended Installs",
  },
];

export const manualTableOfContents: ManualContentEntry = {
  Content: ManualTableOfContents,
  href: "/manual/toc/",
  slug: "toc",
  title: "Table of Contents",
};
