"use client";

import { useEffect, useRef } from "react";

import type { ScreenOverlayTargetId } from "@/lib/effects/screen/registry";
import type { OverlayEffectState } from "@/lib/effects/screen/types";
import type { RendererController } from "@/lib/rendering/types";
import { cn } from "@/lib/utils";
import { useScreenEffects } from "@/providers";

function loadScreenOverlayRenderer() {
  return import("@/lib/effects/screen/overlay-renderer");
}

export function ScreenOverlayTarget({ target }: { target: ScreenOverlayTargetId }) {
  const { overlay, reportOverlayStatus } = useScreenEffects();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RendererController<OverlayEffectState> | null>(null);
  const stateRef = useRef(overlay);
  const enabled = overlay.effect !== "off" && overlay.target === target;

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    const abortController = new AbortController();
    reportOverlayStatus("loading");

    void loadScreenOverlayRenderer()
      .then(({ createScreenOverlayRenderer }) =>
        createScreenOverlayRenderer(
          canvas,
          stateRef.current,
          {
            onError(error) {
              if (disposed) return;
              delete canvas.dataset.live;
              const unsupported =
                error instanceof Error && error.name === "ScreenOverlayUnsupportedError";
              if (!unsupported) console.error("Omarchy screen overlay renderer failed", error);
              reportOverlayStatus(unsupported ? "unsupported" : "error");
            },
            onLive() {
              if (disposed) return;
              canvas.dataset.live = "true";
              reportOverlayStatus("live");
            },
          },
          abortController.signal
        )
      )
      .then((renderer) => {
        if (disposed) {
          renderer.dispose();
          return;
        }
        rendererRef.current = renderer;
        renderer.configure(stateRef.current);
      })
      .catch((error) => {
        if (disposed) return;
        const unsupported =
          error instanceof Error && error.name === "ScreenOverlayUnsupportedError";
        if (!unsupported)
          console.error("Unable to start the Omarchy screen overlay renderer", error);
        reportOverlayStatus(unsupported ? "unsupported" : "error");
      });

    return () => {
      disposed = true;
      abortController.abort();
      delete canvas.dataset.live;
      rendererRef.current?.dispose();
      rendererRef.current = null;
      reportOverlayStatus("idle");
    };
  }, [enabled, reportOverlayStatus]);

  useEffect(() => {
    stateRef.current = overlay;
    rendererRef.current?.configure(overlay);
  }, [overlay]);

  if (!enabled) return null;

  return (
    <canvas
      aria-hidden="true"
      className={cn(
        "pointer-events-none block size-full opacity-0 transition-opacity duration-[120ms] ease-out data-[live=true]:opacity-100",
        target === "hero" ? "absolute inset-0 z-[8]" : "fixed inset-0 z-[195]"
      )}
      data-screen-overlay-player=""
      data-screen-overlay-target={target}
      ref={canvasRef}
    />
  );
}
