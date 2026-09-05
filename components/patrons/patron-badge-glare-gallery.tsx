"use client";

import { useEffect, useRef, type ReactNode } from "react";

function loadPatronBadgeGlareRenderer() {
  return import("@/lib/effects/patron-badges/glare-renderer");
}

export function PatronBadgeGlareGallery({ children }: { children: ReactNode }) {
  const galleryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    if (navigator.gpu === undefined) {
      gallery.dataset.renderer = "unsupported";
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gallery.dataset.renderer = "reduced-motion";
      return;
    }

    const abortController = new AbortController();
    let controller: { dispose: () => void } | undefined;
    let started = false;

    const start = () => {
      if (started) return;
      started = true;
      gallery.dataset.renderer = "loading";

      void loadPatronBadgeGlareRenderer()
        .then(({ createPatronBadgeGlareRenderer }) =>
          createPatronBadgeGlareRenderer(
            gallery,
            {
              onError(cause) {
                gallery.dataset.renderer = "error";
                console.error("The patron badge glare renderer failed.", cause);
              },
              onLive() {
                gallery.dataset.renderer = "live";
              },
            },
            abortController.signal
          )
        )
        .then((nextController) => {
          if (abortController.signal.aborted) {
            nextController.dispose();
            return;
          }
          controller = nextController;
        })
        .catch((cause: unknown) => {
          if (abortController.signal.aborted) return;
          const unsupported =
            cause instanceof Error && cause.name === "PatronBadgeGlareUnsupportedError";
          gallery.dataset.renderer = unsupported ? "unsupported" : "error";
          if (!unsupported) {
            console.error("The patron badge glare renderer could not start.", cause);
          }
        });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        start();
      },
      { rootMargin: "240px" }
    );
    observer.observe(gallery);

    return () => {
      observer.disconnect();
      abortController.abort();
      controller?.dispose();
      delete gallery.dataset.renderer;
    };
  }, []);

  return (
    <section
      aria-label="Patron badge classes"
      className="mt-fluid-section gap-fluid-md grid grid-cols-2 [@media(max-width:800px)]:grid-cols-1"
      ref={galleryRef}
    >
      {children}
    </section>
  );
}
