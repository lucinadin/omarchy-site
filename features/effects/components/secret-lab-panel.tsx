"use client";

import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { EffectButton } from "@/features/effects/components/effect-control";
import { GeneralControls } from "@/features/effects/components/general-controls";
import { LogoEffectsControls } from "@/features/effects/components/logo-effects-controls";
import { PatronBadgeControls } from "@/features/effects/components/patron-badge-controls";
import { ScreenEffectsControls } from "@/features/effects/components/screen-effects-controls";
import { CloseIcon, MinusIcon, SlidersHorizontalIcon } from "@/icons";
import { resetPatronBadgeGlareSettings } from "@/lib/effects/patron-badges/glare-settings";
import { cn } from "@/lib/utils";
import { unreachable } from "@/lib/validation";
import { useLogoEffects, useScreenEffects } from "@/providers";

type SurfacePosition = {
  left: number;
  top: number;
};

function SecretLabWindowButton({
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<"button">, "className" | "type">) {
  return (
    <button
      className="focus-visible:inset-ring-primary flex size-[22px] cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-(color:--tuner-label) focus-visible:inset-ring-1 focus-visible:outline-none [&_svg]:size-3 [&:hover]:bg-(--tuner-surface-active) [&:hover]:text-(color:--tuner-strong)"
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

type SurfaceSize = {
  height: number;
  width: number;
};

type DragSnapshot = SurfaceSize & {
  dragged: boolean;
  offsetX: number;
  offsetY: number;
  pointerId: number;
  startX: number;
  startY: number;
};

const DRAG_MARGIN = 8;
const DRAG_THRESHOLD = 4;
const SECRET_LAB_LAUNCHER_SIZE = 36;
const SECRET_LAB_TABS = ["logo", "screen", "badges", "general"] as const;

type SecretLabTab = (typeof SECRET_LAB_TABS)[number];

function clampSurfacePosition(position: SurfacePosition, size: SurfaceSize): SurfacePosition {
  const maximumLeft = Math.max(DRAG_MARGIN, window.innerWidth - size.width - DRAG_MARGIN);
  const maximumTop = Math.max(DRAG_MARGIN, window.innerHeight - size.height - DRAG_MARGIN);

  return {
    left: Math.min(Math.max(DRAG_MARGIN, position.left), maximumLeft),
    top: Math.min(Math.max(DRAG_MARGIN, position.top), maximumTop),
  };
}

function useDraggableSurface<T extends HTMLElement>() {
  const surfaceRef = useRef<T>(null);
  const dragRef = useRef<DragSnapshot | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<SurfacePosition | null>(null);

  const place = (nextPosition: SurfacePosition, fallbackSize?: SurfaceSize) => {
    const bounds = surfaceRef.current?.getBoundingClientRect();
    const size = bounds
      ? { height: bounds.height, width: bounds.width }
      : (fallbackSize ?? { height: 0, width: 0 });
    setPosition(clampSurfacePosition(nextPosition, size));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    const bounds = surfaceRef.current?.getBoundingClientRect();
    if (!bounds) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      dragged: false,
      height: bounds.height,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: bounds.width,
    };
    setIsDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= DRAG_THRESHOLD) {
      drag.dragged = true;
    }
    if (!drag.dragged) return;

    setPosition(
      clampSurfacePosition(
        { left: event.clientX - drag.offsetX, top: event.clientY - drag.offsetY },
        drag
      )
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    const keepInViewport = () => {
      const bounds = surfaceRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setPosition((currentPosition) =>
        currentPosition
          ? clampSurfacePosition(currentPosition, {
              height: bounds.height,
              width: bounds.width,
            })
          : null
      );
    };

    window.addEventListener("resize", keepInViewport);
    return () => window.removeEventListener("resize", keepInViewport);
  }, []);

  const style: CSSProperties | undefined = position
    ? { bottom: "auto", left: position.left, right: "auto", top: position.top }
    : undefined;

  return {
    isDragging,
    onPointerCancel: endDrag,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    place,
    style,
    surfaceRef,
  };
}

export type SecretLabView = "closed" | "launcher" | "open";

export function SecretLabPanel({
  onViewChange,
  view,
}: {
  onViewChange: (view: SecretLabView) => void;
  view: SecretLabView;
}) {
  const [activeTab, setActiveTab] = useState<SecretLabTab>("logo");
  const { resetEffect, resetLogo } = useLogoEffects();
  const { resetScreen } = useScreenEffects();
  const {
    place: placeLauncher,
    style: launcherStyle,
    surfaceRef: launcherRef,
  } = useDraggableSurface<HTMLButtonElement>();
  const {
    isDragging: isPanelDragging,
    onPointerCancel: cancelPanelDrag,
    onPointerDown: beginPanelDrag,
    onPointerMove: movePanel,
    onPointerUp: endPanelDrag,
    place: placePanel,
    style: panelStyle,
    surfaceRef: panelRef,
  } = useDraggableSurface<HTMLDialogElement>();

  useEffect(() => {
    if (view !== "open") return;
    const dialog = panelRef.current;
    if (!dialog || dialog.open) return;
    dialog.show();
    dialog.focus();
  }, [panelRef, view]);

  const closePanel = () => {
    if (panelRef.current?.open) panelRef.current.close();
    onViewChange("closed");
  };

  const minimizePanel = () => {
    const bounds = panelRef.current?.getBoundingClientRect();
    if (bounds) {
      placeLauncher(
        {
          left: bounds.right - SECRET_LAB_LAUNCHER_SIZE,
          top: bounds.top,
        },
        { height: SECRET_LAB_LAUNCHER_SIZE, width: SECRET_LAB_LAUNCHER_SIZE }
      );
    }

    if (panelRef.current?.open) panelRef.current.close();
    onViewChange("launcher");
    requestAnimationFrame(() => launcherRef.current?.focus());
  };

  const expandLauncher = () => {
    const launcherBounds = launcherRef.current?.getBoundingClientRect();
    onViewChange("open");

    if (!launcherBounds) return;
    requestAnimationFrame(() => {
      const panelBounds = panelRef.current?.getBoundingClientRect();
      if (!panelBounds) return;
      placePanel({
        left: launcherBounds.right - panelBounds.width,
        top: launcherBounds.bottom - panelBounds.height,
      });
      panelRef.current?.focus();
    });
  };

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = SECRET_LAB_TABS.indexOf(activeTab);
    let nextIndex: number | null = null;
    if (event.key === "ArrowLeft") nextIndex = currentIndex - 1;
    if (event.key === "ArrowRight") nextIndex = currentIndex + 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = SECRET_LAB_TABS.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = SECRET_LAB_TABS[(nextIndex + SECRET_LAB_TABS.length) % SECRET_LAB_TABS.length];
    setActiveTab(nextTab);
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>(`#secret-lab-tab-${nextTab}`)?.focus()
    );
  };

  const resetActiveTab = () => {
    switch (activeTab) {
      case "logo":
        resetLogo();
        break;
      case "screen":
        resetScreen();
        break;
      case "badges":
        resetPatronBadgeGlareSettings();
        break;
      case "general":
        break;
      default:
        unreachable(activeTab);
    }
  };

  return (
    <>
      {view === "launcher"
        ? createPortal(
            <button
              aria-label="Open Secret Lab"
              data-secret-lab="launcher"
              className="border-border text-popover-foreground [&:is(:hover,:focus-visible)]:border-primary [&:is(:hover,:focus-visible)]:text-bright-foreground shadow-overlay focus-visible:inset-ring-primary fixed right-2.5 bottom-2.5 z-[200] flex size-9 cursor-pointer touch-manipulation items-center justify-center rounded-lg border bg-[color-mix(in_srgb,var(--popover)_94%,transparent)] p-0 [backdrop-filter:blur(14px)] focus-visible:inset-ring-1 [&_svg]:size-[15px] [&:is(:hover,:focus-visible)]:bg-[color-mix(in_srgb,var(--primary)_18%,var(--popover))] [&:is(:hover,:focus-visible)]:outline-none"
              onClick={expandLauncher}
              ref={launcherRef}
              style={launcherStyle}
              title="Secret Lab"
              type="button"
            >
              <SlidersHorizontalIcon aria-hidden="true" />
            </button>,
            document.body
          )
        : null}

      {view === "open"
        ? createPortal(
            <dialog
              aria-labelledby="secret-lab-title"
              className="secret-lab text-micro/none shadow-overlay fixed top-auto right-2.5 bottom-2.5 left-auto z-[200] flex max-h-[calc(100svh-20px)] w-[min(240px,calc(100vw-20px))] max-w-none [translate:none] [transform:none] flex-col gap-0 overflow-hidden rounded-[10px] border border-(--tuner-border) bg-[color-mix(in_srgb,var(--popover)_94%,transparent)] px-2 py-[7px] [font-family:var(--font-jetbrains-mono),ui-monospace,monospace] text-(color:--tuner-label) [backdrop-filter:blur(16px)] outline-none [--tuner-border:var(--border)] [--tuner-label:var(--popover-foreground)] [--tuner-muted:var(--muted-foreground)] [--tuner-strong:var(--bright-foreground)] [--tuner-surface-active:color-mix(in_srgb,var(--primary)_18%,var(--surface))] [--tuner-surface-hover:color-mix(in_srgb,var(--surface-strong)_48%,var(--surface))] [--tuner-surface:color-mix(in_srgb,var(--surface)_72%,var(--popover))] [@media(width<48rem)]:max-h-[min(60svh,24rem)]"
              data-dragging={isPanelDragging || undefined}
              data-secret-lab="open"
              onCancel={(event) => {
                event.preventDefault();
                closePanel();
              }}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                event.stopPropagation();
                closePanel();
              }}
              ref={panelRef}
              style={panelStyle}
              tabIndex={-1}
            >
              <div
                className={cn(
                  "mb-[5px] flex cursor-grab touch-none items-center justify-between border-b border-(--tuner-border) px-0 pt-0 pb-1.5 select-none",
                  isPanelDragging && "cursor-grabbing"
                )}
                onPointerCancel={cancelPanelDrag}
                onPointerDown={beginPanelDrag}
                onPointerMove={movePanel}
                onPointerUp={endPanelDrag}
              >
                <h2
                  className="text-meta/none m-0 font-[inherit] font-semibold tracking-[-0.025em] text-(color:--tuner-strong)"
                  id="secret-lab-title"
                >
                  Secret Lab
                </h2>
                <div
                  className="flex items-center gap-0.5"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <SecretLabWindowButton aria-label="Minimize Secret Lab" onClick={minimizePanel}>
                    <MinusIcon aria-hidden="true" />
                  </SecretLabWindowButton>
                  <SecretLabWindowButton aria-label="Close Secret Lab" onClick={closePanel}>
                    <CloseIcon aria-hidden="true" />
                  </SecretLabWindowButton>
                </div>
              </div>

              <div
                aria-label="Secret Lab sections"
                className="mb-1 grid grid-cols-4 gap-[3px] border-b border-(--tuner-border) pb-[5px]"
                role="tablist"
              >
                {SECRET_LAB_TABS.map((tab) => (
                  <button
                    aria-controls="secret-lab-tabpanel"
                    aria-selected={activeTab === tab}
                    className="focus-visible:inset-ring-primary h-6 cursor-pointer rounded-[5px] border-0 bg-transparent font-[inherit] font-semibold text-(color:--tuner-muted) capitalize focus-visible:inset-ring-1 focus-visible:outline-none [&:is(:hover,[aria-selected=true])]:bg-(--tuner-surface-active) [&:is(:hover,[aria-selected=true])]:text-(color:--tuner-strong)"
                    id={`secret-lab-tab-${tab}`}
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    onKeyDown={onTabKeyDown}
                    role="tab"
                    tabIndex={activeTab === tab ? 0 : -1}
                    type="button"
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div
                aria-labelledby={`secret-lab-tab-${activeTab}`}
                className="flex min-h-0 flex-auto [scrollbar-width:none] flex-col gap-[3px] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
                id="secret-lab-tabpanel"
                role="tabpanel"
              >
                {activeTab === "logo" ? <LogoEffectsControls /> : null}
                {activeTab === "screen" ? <ScreenEffectsControls /> : null}
                {activeTab === "badges" ? <PatronBadgeControls /> : null}
                {activeTab === "general" ? <GeneralControls /> : null}
              </div>

              {activeTab !== "general" ? (
                <div
                  className={cn(
                    "mt-[5px] grid gap-1 border-t border-(--tuner-border) pt-1.5",
                    activeTab === "logo" ? "grid-cols-2" : "grid-cols-1"
                  )}
                >
                  {activeTab === "logo" ? (
                    <EffectButton onClick={resetEffect}>Reset preset</EffectButton>
                  ) : null}
                  <EffectButton onClick={resetActiveTab}>Reset tab</EffectButton>
                </div>
              ) : null}
            </dialog>,
            document.body
          )
        : null}
    </>
  );
}
