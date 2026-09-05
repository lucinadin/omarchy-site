"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import {
  applyLogoEffectDocumentRepair,
  createLogoEffectState,
  getLogoIdleOverride,
  getLogoRevealEnabled,
  parseStoredLogoEffectState,
  resetLogo,
  resetLogoEffect,
  selectLogoEffect,
  serializeLogoEffectState,
  setLogoEffectPreviewSeed,
  setLogoIdleOverride,
  setLogoRevealEnabled,
  type LogoEffectState,
} from "@/lib/effects/logo/effect-state";
import {
  createSparseLogoEffectIdleOverride,
  resolveLogoEffectIdle,
  type LogoEffectIdle,
} from "@/lib/effects/logo/idle";
import {
  claimInitialLogoEffectStartMode,
  LOGO_EFFECT_STORAGE_KEYS,
  parseLogoBootMode,
  parseLogoRevealState,
  type LogoInitialPlaybackClaim,
} from "@/lib/effects/logo/lifecycle";
import { requestLogoEffectReplay } from "@/lib/effects/logo/playback-command";
import { LOGO_EFFECTS, parseLogoEffectId, type LogoEffectId } from "@/lib/effects/logo/registry";
import type { LogoEffectStartMode } from "@/lib/effects/logo/types";
import { parseJsonObject } from "@/lib/json";
import { storageGet, storageRemove, storageSet } from "@/lib/settings/storage";
import { defaultThemeSkewAngle } from "@/lib/themes/theme-constants";
import {
  getSavedThemeSkewAngle,
  resetThemeSkewAngle,
  saveThemeSkewAngle,
} from "@/lib/themes/theme-runtime";

const EFFECT_STATE_KEY = LOGO_EFFECT_STORAGE_KEYS.state;
const DEFAULT_EFFECT_SEED = 0x0a4c_4f47;

type LogoEffectDocumentUpdate = (document: LogoEffectState) => LogoEffectState;

type LogoEffectsContextValue = {
  activeEffect: LogoEffectId;
  activeSeed: number;
  adoptEffectDocument: (source: LogoEffectState, repaired: LogoEffectState) => void;
  claimInitialStartMode: (playbackKey: string) => LogoEffectStartMode;
  effectDocument: LogoEffectState;
  idle: LogoEffectIdle;
  isSelectionReady: boolean;
  randomize: () => void;
  revealEnabled: boolean;
  reroll: () => void;
  resetEffect: () => void;
  resetLogo: () => void;
  resetGeneral: () => void;
  restart: () => void;
  selectEffect: (effect: LogoEffectId) => void;
  themeSkewAngle: number;
  updateEffectDocument: (update: LogoEffectDocumentUpdate) => void;
  updateIdle: (update: Partial<LogoEffectIdle>) => void;
  updateRevealEnabled: (enabled: boolean) => void;
  updateThemeSkewAngle: (angle: number) => void;
};

const LogoEffectsContext = createContext<LogoEffectsContextValue | null>(null);

function randomUint32() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0];
}

function randomUnit() {
  return randomUint32() / 4_294_967_296;
}

function chooseRandomEffect(currentEffect: LogoEffectId): LogoEffectId {
  const candidates = LOGO_EFFECTS.filter((effect) => effect.id !== currentEffect);
  return candidates[Math.floor(randomUnit() * candidates.length)]?.id ?? "laseretch";
}

function readStoredLogoEffectState(key: string) {
  const saved = storageGet(key);
  if (saved === null) return null;
  try {
    return parseJsonObject(JSON.parse(saved));
  } catch {
    storageRemove(key);
    return null;
  }
}

export function LogoEffectsProvider({ children }: { children: ReactNode }) {
  const [effectDocument, setEffectDocument] = useState(() =>
    createLogoEffectState("laseretch", DEFAULT_EFFECT_SEED)
  );
  const [isSelectionReady, setIsSelectionReady] = useState(false);
  const [themeSkewAngle, setThemeSkewAngle] = useState(defaultThemeSkewAngle);
  const initialPlaybackClaimRef = useRef<LogoInitialPlaybackClaim>({ primaryClaimed: false });

  const activeEffect = parseLogoEffectId(effectDocument.activeEffectId) ?? "laseretch";
  const idle = resolveLogoEffectIdle(
    activeEffect,
    getLogoIdleOverride(effectDocument, activeEffect)
  );
  const revealEnabled = getLogoRevealEnabled(effectDocument, activeEffect);
  const claimInitialStartMode = (playbackKey: string) =>
    claimInitialLogoEffectStartMode(initialPlaybackClaimRef.current, {
      bootMode: parseLogoBootMode(document.documentElement.dataset.logoBoot),
      playbackKey,
      prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      revealState: parseLogoRevealState(document.documentElement.dataset.logoReveal),
    });

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const savedState = parseStoredLogoEffectState(readStoredLogoEffectState(EFFECT_STATE_KEY));
      const savedEffect = savedState ? parseLogoEffectId(savedState.activeEffectId) : null;
      const nextDocument = savedState
        ? savedEffect
          ? savedState
          : selectLogoEffect(savedState, "laseretch")
        : createLogoEffectState("laseretch", DEFAULT_EFFECT_SEED);

      setEffectDocument(nextDocument);
      setThemeSkewAngle(getSavedThemeSkewAngle());
      setIsSelectionReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSelectionReady) return;
    storageSet(EFFECT_STATE_KEY, serializeLogoEffectState(effectDocument));
  }, [effectDocument, isSelectionReady]);

  const updateEffectDocument = (update: LogoEffectDocumentUpdate) => {
    setEffectDocument(update);
  };

  const adoptEffectDocument = (source: LogoEffectState, repaired: LogoEffectState) => {
    setEffectDocument((current) => applyLogoEffectDocumentRepair(current, source, repaired));
  };

  const selectEffectValue = (nextEffect: LogoEffectId) => {
    updateEffectDocument((current) => selectLogoEffect(current, nextEffect));
  };

  const updateIdle = (update: Partial<LogoEffectIdle>) => {
    setEffectDocument((current) => {
      const effectId = parseLogoEffectId(current.activeEffectId) ?? "laseretch";
      const nextIdle = {
        ...resolveLogoEffectIdle(effectId, getLogoIdleOverride(current, effectId)),
        ...update,
      };
      return setLogoIdleOverride(
        current,
        createSparseLogoEffectIdleOverride(effectId, nextIdle),
        effectId
      );
    });
  };

  const updateThemeSkewAngle = (value: number) => {
    setThemeSkewAngle(saveThemeSkewAngle(value));
  };

  const contextValue = {
    activeEffect,
    activeSeed: effectDocument.preview.seed,
    adoptEffectDocument,
    claimInitialStartMode,
    effectDocument,
    idle,
    isSelectionReady,
    randomize: () => selectEffectValue(chooseRandomEffect(activeEffect)),
    revealEnabled,
    reroll: () => setEffectDocument((current) => setLogoEffectPreviewSeed(current, randomUint32())),
    resetEffect: () => updateEffectDocument(resetLogoEffect),
    resetLogo: () =>
      setEffectDocument((current) => resetLogo(current, "laseretch", DEFAULT_EFFECT_SEED)),
    resetGeneral: () => {
      setThemeSkewAngle(resetThemeSkewAngle());
    },
    restart: () => requestLogoEffectReplay(),
    selectEffect: selectEffectValue,
    themeSkewAngle,
    updateEffectDocument,
    updateIdle,
    updateRevealEnabled: (enabled: boolean) =>
      updateEffectDocument((current) => setLogoRevealEnabled(current, enabled)),
    updateThemeSkewAngle,
  } satisfies LogoEffectsContextValue;

  return <LogoEffectsContext value={contextValue}>{children}</LogoEffectsContext>;
}

export function useLogoEffects() {
  const context = useContext(LogoEffectsContext);
  if (!context) throw new Error("useLogoEffects must be used inside LogoEffectsProvider");
  return context;
}
