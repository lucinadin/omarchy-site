"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { ScreenEffectsPlayer } from "@/features/effects/components/screen-effects-player";
import {
  CAPTURE_EFFECTS,
  OVERLAY_EFFECTS,
  parseCaptureEffectId,
  parseOverlayEffectId,
  parseScreenOverlayTargetId,
  type CaptureEffectId,
  type OverlayEffectId,
  type ScreenOverlayTargetId,
} from "@/lib/effects/screen/registry";
import {
  DEFAULT_CAPTURE_EFFECT_SETTINGS,
  DEFAULT_OVERLAY_EFFECT_SETTINGS,
  normalizeCaptureEffectSettings,
  normalizeOverlayEffectSettings,
  type CaptureEffectSettings,
  type OverlayEffectSettings,
} from "@/lib/effects/screen/settings";
import { supportsCanvasPaint } from "@/lib/effects/screen/support";
import type {
  CaptureEffectState,
  OverlayEffectState,
  ScreenEffectsState,
} from "@/lib/effects/screen/types";
import { isJsonObject, parseJsonObject } from "@/lib/json";
import type { RendererStatus } from "@/lib/rendering/types";
import { storageGet, storageSetJson } from "@/lib/settings/storage";

const SCREEN_EFFECTS_STORAGE_KEY = "omarchy.screen-effects:v1";

type HtmlInCanvasSupport = "checking" | "supported" | "unsupported";

type ScreenEffectsContextValue = ScreenEffectsState & {
  captureStatus: RendererStatus;
  htmlInCanvasSupport: HtmlInCanvasSupport;
  overlayStatus: RendererStatus;
  reportOverlayStatus: (status: RendererStatus) => void;
  resetScreen: () => void;
  setCaptureEffect: (effect: CaptureEffectId) => void;
  setOverlayEffect: (effect: OverlayEffectId) => void;
  setOverlayTarget: (target: ScreenOverlayTargetId) => void;
  updateCaptureSettings: (settings: Partial<CaptureEffectSettings>) => void;
  updateOverlaySettings: (settings: Partial<OverlayEffectSettings>) => void;
};

const ScreenEffectsContext = createContext<ScreenEffectsContextValue | null>(null);

function createDefaultState(): ScreenEffectsState {
  return {
    capture: {
      effect: "off",
      settings: { ...DEFAULT_CAPTURE_EFFECT_SETTINGS },
    },
    overlay: {
      effect: "off",
      settings: { ...DEFAULT_OVERLAY_EFFECT_SETTINGS },
      target: "hero",
    },
  };
}

function parseSavedState(value: string | null): ScreenEffectsState | null {
  if (!value) return null;
  try {
    const parsed = parseJsonObject(JSON.parse(value));
    if (!parsed || !isJsonObject(parsed.capture) || !isJsonObject(parsed.overlay)) return null;

    const captureEffect = parseCaptureEffectId(parsed.capture.effect);
    const overlayEffect = parseOverlayEffectId(parsed.overlay.effect);
    const overlayTarget = parseScreenOverlayTargetId(parsed.overlay.target);
    if (captureEffect === null || overlayEffect === null || overlayTarget === null) return null;

    return {
      capture: {
        effect: captureEffect,
        settings: normalizeCaptureEffectSettings(
          isJsonObject(parsed.capture.settings) ? parsed.capture.settings : {}
        ),
      },
      overlay: {
        effect: overlayEffect,
        settings: normalizeOverlayEffectSettings(
          isJsonObject(parsed.overlay.settings) ? parsed.overlay.settings : {}
        ),
        target: overlayTarget,
      },
    };
  } catch {
    return null;
  }
}

function settingsForCapture(effect: CaptureEffectId): CaptureEffectSettings {
  if (effect === "off") return { ...DEFAULT_CAPTURE_EFFECT_SETTINGS };
  const settings = CAPTURE_EFFECTS.find((candidate) => candidate.id === effect)?.settings;
  return { ...(settings ?? DEFAULT_CAPTURE_EFFECT_SETTINGS) };
}

function settingsForOverlay(effect: OverlayEffectId): OverlayEffectSettings {
  if (effect === "off") return { ...DEFAULT_OVERLAY_EFFECT_SETTINGS };
  const settings = OVERLAY_EFFECTS.find((candidate) => candidate.id === effect)?.settings;
  return { ...(settings ?? DEFAULT_OVERLAY_EFFECT_SETTINGS) };
}

function supportsHtmlInCanvas() {
  if (!("gpu" in navigator)) return false;
  const probe = document.createElement("canvas");
  probe.setAttribute("layoutsubtree", "");
  return supportsCanvasPaint(probe);
}

function disableCapture(capture: CaptureEffectState): CaptureEffectState {
  return capture.effect === "off" ? capture : { ...capture, effect: "off" };
}

function disableOverlay(overlay: OverlayEffectState): OverlayEffectState {
  return overlay.effect === "off" ? overlay : { ...overlay, effect: "off" };
}

export function ScreenEffectsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScreenEffectsState>(createDefaultState);
  const [captureStatus, setCaptureStatus] = useState<RendererStatus>("idle");
  const [overlayStatus, setOverlayStatus] = useState<RendererStatus>("idle");
  const [htmlInCanvasSupport, setHtmlInCanvasSupport] = useState<HtmlInCanvasSupport>("checking");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const isHtmlInCanvasSupported = supportsHtmlInCanvas();
      setHtmlInCanvasSupport(isHtmlInCanvasSupported ? "supported" : "unsupported");

      const saved = parseSavedState(storageGet(SCREEN_EFFECTS_STORAGE_KEY));
      if (!saved) return;

      const capture = isHtmlInCanvasSupported ? saved.capture : disableCapture(saved.capture);
      const overlay = capture.effect === "off" ? saved.overlay : disableOverlay(saved.overlay);
      const nextState = { capture, overlay };
      setState(nextState);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (htmlInCanvasSupport === "checking") return;
    // Coalesce slider input, and never persist the pre-restoration defaults.
    const timeout = window.setTimeout(() => storageSetJson(SCREEN_EFFECTS_STORAGE_KEY, state), 150);
    const flush = () => storageSetJson(SCREEN_EFFECTS_STORAGE_KEY, state);
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("pagehide", flush);
    };
  }, [htmlInCanvasSupport, state]);

  const setCaptureEffect = (effect: CaptureEffectId) => {
    if (effect !== "off" && htmlInCanvasSupport !== "supported") return;
    if (effect !== "off") setOverlayStatus("idle");
    setState((current) => {
      if (current.capture.effect === effect) return current;
      return {
        capture: { effect, settings: settingsForCapture(effect) },
        overlay: effect === "off" ? current.overlay : disableOverlay(current.overlay),
      };
    });
  };

  const reportCaptureStatus = (nextStatus: RendererStatus) => {
    setCaptureStatus(nextStatus);
    if (nextStatus !== "unsupported") return;

    setHtmlInCanvasSupport("unsupported");
    setState((current) => {
      const capture = disableCapture(current.capture);
      return capture === current.capture ? current : { ...current, capture };
    });
  };

  const updateCaptureSettings = (partialSettings: Partial<CaptureEffectSettings>) => {
    setState((current) => ({
      ...current,
      capture: {
        ...current.capture,
        settings: normalizeCaptureEffectSettings({
          ...current.capture.settings,
          ...partialSettings,
        }),
      },
    }));
  };

  const setOverlayEffect = (effect: OverlayEffectId) => {
    if (effect !== "off") setCaptureStatus("idle");
    setState((current) => {
      if (current.overlay.effect === effect) return current;
      return {
        capture: effect === "off" ? current.capture : disableCapture(current.capture),
        overlay: { ...current.overlay, effect, settings: settingsForOverlay(effect) },
      };
    });
  };

  const setOverlayTarget = (target: ScreenOverlayTargetId) => {
    setState((current) => {
      if (current.overlay.target === target) return current;
      return { ...current, overlay: { ...current.overlay, target } };
    });
  };

  const updateOverlaySettings = (partialSettings: Partial<OverlayEffectSettings>) => {
    setState((current) => ({
      ...current,
      overlay: {
        ...current.overlay,
        settings: normalizeOverlayEffectSettings({
          ...current.overlay.settings,
          ...partialSettings,
        }),
      },
    }));
  };

  const resetScreen = () => {
    const nextState = createDefaultState();
    setState(nextState);
    setCaptureStatus("idle");
    setOverlayStatus("idle");
  };

  const contextValue = {
    ...state,
    captureStatus,
    htmlInCanvasSupport,
    overlayStatus,
    reportOverlayStatus: setOverlayStatus,
    resetScreen,
    setCaptureEffect,
    setOverlayEffect,
    setOverlayTarget,
    updateCaptureSettings,
    updateOverlaySettings,
  } satisfies ScreenEffectsContextValue;

  return (
    <ScreenEffectsContext value={contextValue}>
      {children}
      <ScreenEffectsPlayer onStatusChange={reportCaptureStatus} state={state.capture} />
    </ScreenEffectsContext>
  );
}

export function useScreenEffects() {
  const context = useContext(ScreenEffectsContext);
  if (!context) throw new Error("useScreenEffects must be used inside ScreenEffectsProvider");
  return context;
}
