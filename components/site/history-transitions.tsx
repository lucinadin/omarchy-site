"use client";

import { useEffect } from "react";

export function HistoryTransitions() {
  useEffect(() => {
    if (
      !("navigation" in window) ||
      !("NavigationPrecommitController" in window) ||
      !("startViewTransition" in document)
    )
      return;

    const { navigation } = window;
    const controller = new AbortController();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let activeTransition: ViewTransition | null = null;

    navigation.addEventListener(
      "navigate",
      (event) => {
        const current = navigation.currentEntry;
        if (
          !current ||
          event.navigationType !== "traverse" ||
          !event.destination.sameDocument ||
          !event.canIntercept ||
          !event.cancelable ||
          event.hashChange ||
          event.hasUAVisualTransition ||
          document.hidden ||
          reducedMotion.matches
        )
          return;

        const direction =
          event.destination.index < current.index ? "history-back" : "history-forward";
        event.intercept({
          precommitHandler() {
            return new Promise<void>((resolve) => {
              const transition = document.startViewTransition({
                types: [direction],
                async update() {
                  // Capture the outgoing page before letting the browser commit.
                  // Next still restores the route; the browser still restores scroll.
                  resolve();
                  await navigation.transition?.finished;
                },
              });
              activeTransition = transition;
              // A skipped animation must never hold up browser navigation.
              void transition.ready.catch(resolve);
              void transition.finished.catch(resolve);
              event.signal.addEventListener("abort", () => transition.skipTransition(), {
                once: true,
                signal: controller.signal,
              });
            });
          },
        });
      },
      { signal: controller.signal }
    );

    return () => {
      controller.abort();
      activeTransition?.skipTransition();
    };
  }, []);

  return null;
}
