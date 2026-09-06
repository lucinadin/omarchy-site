import type { ConfigExtension } from "cn/compiler";

export default {
  extend: {
    // Tailwind does not share its CSS theme with cn's build-time classifier.
    theme: {
      spacing: [
        "fluid-xs",
        "fluid-sm",
        "fluid-md",
        "fluid-lg",
        "fluid-xl",
        "fluid-2xl",
        "fluid-layout",
        "fluid-section",
        "brand-panel",
        "sponsor-panel",
        "brand-mark",
        "meetup-map",
      ],
    },
    classGroups: {
      // cn 0.2.5 omits Tailwind's max-h-none from its default max-height group.
      "max-h": [{ "max-h": ["none"] }],
      px: ["px-site-frame"],
      left: ["left-control-progress"],
      shadow: [{ shadow: ["overlay", "notification"] }],
      "inset-shadow": [{ "inset-shadow": ["keycap"] }],
      "text-shadow": [{ "text-shadow": ["readable"] }],
      // Keep these in sync with custom --text-* tokens in app/globals.css; cn does not read CSS.
      "font-size": [
        {
          text: [
            "body",
            "lead",
            "meta",
            "micro",
            "small",
            "symbol",
            "title-lg",
            "title-md",
            "title-sm",
            "title-xl",
            "ui",
          ],
        },
      ],
    },
  },
} satisfies ConfigExtension;
