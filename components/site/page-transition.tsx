import { ViewTransition } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      default="none"
      enter={{
        "nav-home": "navigation-back",
        "nav-forward": "navigation-forward",
        "nav-back": "navigation-back",
        "site-route": "content-crossfade",
        default: "none",
      }}
      exit={{
        "nav-home": "navigation-back",
        "nav-forward": "navigation-forward",
        "nav-back": "navigation-back",
        "site-route": "content-crossfade",
        default: "none",
      }}
    >
      {children}
    </ViewTransition>
  );
}
