"use client";

import { useEffect, useRef } from "react";

function loadExperimentRenderer() {
  return import("@/lib/effects/experiment/renderer");
}

export function HomeExperimentBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!navigator.gpu) {
      canvas.dataset.renderer = "unsupported";
      return;
    }
    const controller = new AbortController();
    canvas.dataset.renderer = "loading";
    void loadExperimentRenderer()
      .then(({ createExperimentRenderer }) =>
        createExperimentRenderer(
          canvas,
          {
            onLive() {
              canvas.dataset.renderer = "live";
            },
            onError(cause) {
              canvas.dataset.renderer = "error";
              console.error("Experiment background failed.", cause);
            },
          },
          controller.signal
        )
      )
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        canvas.dataset.renderer = "error";
        console.error("Experiment background could not start.", cause);
      });
    return () => controller.abort();
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="home-desktop__wallpaper bg-background h-full w-full"
      data-experiment-background=""
      ref={canvasRef}
    />
  );
}
