"use client";

import { useLayoutEffect, type ReactNode, type RefObject } from "react";

import { usePickerScroll } from "@/features/themes/use-picker-scroll";

export function ThemePickerGallery<Item extends { id: string; name: string }>({
  active,
  activeIndex,
  activePreviewRef,
  index,
  items,
  label,
  onActivate,
  onSelect,
  renderPreview,
  status,
}: {
  active: boolean;
  activeIndex: number;
  activePreviewRef: RefObject<HTMLButtonElement | null>;
  index: number;
  items: readonly Item[];
  label: string;
  onActivate: () => void;
  onSelect: (id: string) => void;
  renderPreview: (item: Item, loading: "eager" | "lazy") => ReactNode;
  status?: string;
}) {
  const trackRef = usePickerScroll({
    activeIndex,
    axis: "x",
    onSelect: (selected) => {
      const item = items[selected];
      if (item) {
        onActivate();
        onSelect(item.id);
      }
    },
  });

  useLayoutEffect(() => {
    if (!active) return;
    const grid = trackRef.current?.closest(".home-theme-picker__grid");
    if (grid?.contains(document.activeElement)) {
      trackRef.current
        ?.querySelector<HTMLButtonElement>(`[data-picker-index="${activeIndex}"]`)
        ?.focus({ preventScroll: true });
    }
  }, [active, activeIndex, trackRef]);

  return (
    <section
      aria-label={label}
      className="home-theme-picker__gallery"
      data-active={active}
      data-picker-index={index}
      onFocusCapture={onActivate}
    >
      <button
        aria-pressed={active}
        className="text-small text-muted-foreground hover:text-bright-foreground flex w-full items-center justify-center gap-2 py-1 font-medium"
        onClick={onActivate}
        type="button"
      >
        <span>{label}</span>
        <span className="text-bright-foreground">
          {items[activeIndex]?.name ?? status ?? "No matches"}
        </span>
      </button>
      <div
        aria-label={`${label} previews`}
        aria-roledescription="carousel"
        className="home-theme-picker__carousel"
        ref={trackRef}
      >
        {items.map((item, itemIndex) => (
          <button
            aria-current={active && itemIndex === activeIndex ? "true" : undefined}
            aria-label={`Select ${item.name}`}
            className="home-theme-picker__preview"
            data-active={itemIndex === activeIndex}
            data-picker-index={itemIndex}
            key={item.id}
            onClick={() => {
              onActivate();
              onSelect(item.id);
            }}
            ref={active && itemIndex === activeIndex ? activePreviewRef : undefined}
            tabIndex={active && itemIndex === activeIndex ? 0 : -1}
            type="button"
          >
            {renderPreview(item, Math.abs(itemIndex - activeIndex) <= 1 ? "eager" : "lazy")}
          </button>
        ))}
      </div>
    </section>
  );
}
