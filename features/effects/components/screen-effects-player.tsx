"use client";

import { useEffect, useRef } from "react";

import type { CaptureEffectState, CaptureRendererController } from "@/lib/effects/screen/types";
import type { RendererStatus } from "@/lib/rendering/types";

function loadScreenCaptureRenderer() {
  return import("@/lib/effects/screen/capture-renderer");
}

type ScreenEffectsPlayerProps = {
  onStatusChange: (status: RendererStatus) => void;
  state: CaptureEffectState;
};

export function ScreenEffectsPlayer({ onStatusChange, state }: ScreenEffectsPlayerProps) {
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const captureRootRef = useRef<HTMLDivElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CaptureRendererController | null>(null);
  const stateRef = useRef(state);
  const enabled = state.effect !== "off";

  useEffect(() => {
    if (!enabled) {
      onStatusChange("idle");
      return;
    }

    const captureCanvas = captureCanvasRef.current;
    const captureRoot = captureRootRef.current;
    const outputCanvas = outputCanvasRef.current;
    if (!captureCanvas || !captureRoot || !outputCanvas) return;

    let disposed = false;
    const abortController = new AbortController();
    onStatusChange("loading");

    void loadScreenCaptureRenderer()
      .then(({ createScreenCaptureRenderer }) =>
        createScreenCaptureRenderer(
          outputCanvas,
          captureCanvas,
          captureRoot,
          document.body,
          stateRef.current,
          {
            onError(error) {
              if (disposed) return;
              delete outputCanvas.dataset.live;
              const unsupported =
                error instanceof Error && error.name === "ScreenCaptureUnsupportedError";
              if (!unsupported) console.error("Omarchy screen capture renderer failed", error);
              onStatusChange(unsupported ? "unsupported" : "error");
            },
            onLive() {
              if (disposed) return;
              outputCanvas.dataset.live = "true";
              onStatusChange("live");
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
          error instanceof Error && error.name === "ScreenCaptureUnsupportedError";
        if (!unsupported)
          console.error("Unable to start the Omarchy screen capture renderer", error);
        onStatusChange(unsupported ? "unsupported" : "error");
      });

    return () => {
      disposed = true;
      abortController.abort();
      delete outputCanvas.dataset.live;
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [enabled, onStatusChange]);

  useEffect(() => {
    stateRef.current = state;
    rendererRef.current?.configure(state);
  }, [state]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="screen-effects-capture pointer-events-none fixed inset-0 z-[190]"
      data-screen-effects-capture-player=""
    >
      <canvas
        className="pointer-events-none fixed inset-0 block"
        layoutsubtree=""
        ref={captureCanvasRef}
      >
        <div
          aria-hidden="true"
          className="screen-effects-capture__root relative block"
          drawable=""
          inert
          ref={captureRootRef}
        />
      </canvas>
      <canvas
        className="absolute inset-0 block size-full opacity-0 data-[live=true]:opacity-100"
        ref={outputCanvasRef}
      />
    </div>
  );
}
