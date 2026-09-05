"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ArrowUpIcon } from "@/icons";

const longContentViewportRatio = 1.75;
const revealScrollViewportRatio = 0.8;

function scrollToTop() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ behavior: prefersReducedMotion ? "auto" : "smooth", top: 0 });
}

function PageBackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const pageContent = document.querySelector("main");
    let isLongContent = false;
    let currentVisibility = false;

    function updateVisibility() {
      const nextVisibility =
        isLongContent && window.scrollY > window.innerHeight * revealScrollViewportRatio;

      if (nextVisibility === currentVisibility) return;

      currentVisibility = nextVisibility;
      setIsVisible(nextVisibility);
    }

    function updateContentEligibility() {
      isLongContent =
        pageContent !== null &&
        pageContent.scrollHeight > window.innerHeight * longContentViewportRatio;
      updateVisibility();
    }

    updateContentEligibility();
    window.addEventListener("resize", updateContentEligibility);
    window.addEventListener("scroll", updateVisibility, { passive: true });

    const contentResizeObserver = new ResizeObserver(updateContentEligibility);
    if (pageContent) contentResizeObserver.observe(pageContent);

    return () => {
      contentResizeObserver.disconnect();
      window.removeEventListener("resize", updateContentEligibility);
      window.removeEventListener("scroll", updateVisibility);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <Button
      aria-label="Back to top"
      className="fixed right-[max(1.25rem,env(safe-area-inset-right))] bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 rounded-full"
      onClick={scrollToTop}
      size="icon"
      variant="secondary"
    >
      <ArrowUpIcon aria-hidden="true" size={16} />
    </Button>
  );
}

export function BackToTopButton() {
  const pathname = usePathname();
  return <PageBackToTopButton key={pathname} />;
}
