"use client";

import { useEffectEvent, useLayoutEffect, useRef } from "react";

export function usePickerScroll({
  activeIndex,
  axis,
  onSelect,
}: {
  activeIndex: number;
  axis: "x" | "y";
  onSelect: (index: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const selectedIndexRef = useRef(activeIndex);
  const userScrollingRef = useRef(false);
  const settle = useEffectEvent(onSelect);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = () =>
      Array.from(track.querySelectorAll<HTMLElement>(`:scope > [data-picker-index]`));
    const horizontal = axis === "x";
    const dimension = () => (horizontal ? track.clientWidth : track.clientHeight);
    const scroll = () => (horizontal ? track.scrollLeft : track.scrollTop);
    const midpoint = (card: HTMLElement) =>
      horizontal ? card.offsetLeft + card.offsetWidth / 2 : card.offsetTop + card.offsetHeight / 2;
    const center = (behavior: ScrollBehavior) => {
      const card = cards()[selectedIndexRef.current];
      if (!card) return;
      const maximum = horizontal
        ? track.scrollWidth - track.clientWidth
        : track.scrollHeight - track.clientHeight;
      const offset = Math.max(0, Math.min(maximum, midpoint(card) - dimension() / 2));
      if (Math.abs(scroll() - offset) < 1) return;
      track.scrollTo(horizontal ? { left: offset, behavior } : { top: offset, behavior });
    };
    let measuredWidth = track.clientWidth;
    let measuredHeight = track.clientHeight;
    let settleTimer = 0;
    const commit = (event?: Event) => {
      if (event && event.target !== track) return;
      window.clearTimeout(settleTimer);
      if (track.clientWidth !== measuredWidth || track.clientHeight !== measuredHeight) return;
      if (!userScrollingRef.current) return;
      const centerPosition = scroll() + dimension() / 2;
      let nearest = 0;
      let distance = Infinity;
      for (const [index, card] of cards().entries()) {
        const next = Math.abs(midpoint(card) - centerPosition);
        if (next < distance) {
          nearest = index;
          distance = next;
        }
      }
      userScrollingRef.current = false;
      const count = cards().length;
      if (!count) return;
      if (!horizontal && scroll() <= 1) nearest = 0;
      else if (!horizontal && scroll() >= track.scrollHeight - track.clientHeight - 1)
        nearest = count - 1;
      settle(nearest);
    };
    const onScroll = () => {
      if ("onscrollend" in track) return;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(commit, 180);
    };
    const takeControl = () => {
      userScrollingRef.current = true;
    };
    const resize = new ResizeObserver(() => {
      measuredWidth = track.clientWidth;
      measuredHeight = track.clientHeight;
      userScrollingRef.current = false;
      center("instant");
    });
    resize.observe(track);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => {
      if (motion.matches) center("instant");
    };
    motion.addEventListener("change", onMotion);
    track.addEventListener("pointerdown", takeControl, { passive: true });
    track.addEventListener("wheel", takeControl, { passive: true });
    track.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("scrollend", commit);
    center("instant");
    return () => {
      resize.disconnect();
      window.clearTimeout(settleTimer);
      motion.removeEventListener("change", onMotion);
      track.removeEventListener("pointerdown", takeControl);
      track.removeEventListener("wheel", takeControl);
      track.removeEventListener("scroll", onScroll);
      track.removeEventListener("scrollend", commit);
    };
  }, [axis]);

  useLayoutEffect(() => {
    const previous = selectedIndexRef.current;
    selectedIndexRef.current = activeIndex;
    const track = trackRef.current;
    const card = track?.querySelector<HTMLElement>(`:scope > [data-picker-index="${activeIndex}"]`);
    if (!track || !card) return;
    const horizontal = axis === "x";
    const desiredOffset = horizontal
      ? card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2
      : card.offsetTop - (track.clientHeight - card.offsetHeight) / 2;
    const maximum = horizontal
      ? track.scrollWidth - track.clientWidth
      : track.scrollHeight - track.clientHeight;
    const offset = Math.max(0, Math.min(maximum, desiredOffset));
    const scroll = horizontal ? track.scrollLeft : track.scrollTop;
    if (Math.abs(scroll - offset) < 1) return;
    userScrollingRef.current = false;
    const distance = Math.abs(activeIndex - previous);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = reduced || distance > 1 ? "instant" : "smooth";
    track.scrollTo(horizontal ? { left: offset, behavior } : { top: offset, behavior });
  });

  return trackRef;
}
