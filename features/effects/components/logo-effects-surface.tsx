"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type Ref,
} from "react";

import { createLogoEffectColorResolver } from "@/lib/effects/logo/color-bindings";
import { resolveActiveLogoEffect, serializeLogoEffectState } from "@/lib/effects/logo/effect-state";
import {
  consumeInitialLogoReveal,
  resolveLogoEffectPlaybackStartMode,
  type LogoEffectPlaybackIdentity,
} from "@/lib/effects/logo/lifecycle";
import { OMARCHY_MARK_PATH, OMARCHY_MARK_VIEW_BOX } from "@/lib/effects/logo/mark";
import { subscribeLogoEffectReplay } from "@/lib/effects/logo/playback-command";
import { saveLogoPreview } from "@/lib/effects/logo/preview";
import { loadLogoEffect } from "@/lib/effects/logo/registry";
import type { LogoEffectStartMode, LogoRendererController } from "@/lib/effects/logo/types";
import { observeRenderActivity } from "@/lib/rendering/activity";
import { openSecretLab, unlockSecretLab } from "@/lib/secret-lab-access";
import { themeAppliedEvent } from "@/lib/themes/theme-runtime";
import { cn } from "@/lib/utils";
import { useLogoEffects } from "@/providers";

const SECRET_LAB_UNLOCK_TAPS = 7;
const SECRET_LAB_TAP_RESET_MS = 2_000;

function loadLogoRenderer() {
  return import("@/lib/effects/logo/renderer");
}

function markLogoRendererInactive(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  status: "error" | "unsupported"
) {
  delete host.dataset.live;
  delete canvas.dataset.live;
  host.dataset.renderer = status;
}

type LogoEffectsSurfaceProps = Omit<
  ComponentPropsWithoutRef<"span">,
  "children" | "onClick" | "onPointerDown"
> & {
  playbackKey?: string;
};

type LogoEffectsFrameProps = LogoEffectsSurfaceProps & {
  canvasRef?: Ref<HTMLCanvasElement>;
  hostRef?: Ref<HTMLSpanElement>;
  onUnlockTap?: () => void;
  stageRef?: Ref<HTMLSpanElement>;
};

function LogoEffectsFrame({
  canvasRef,
  className,
  hostRef,
  onUnlockTap,
  playbackKey,
  stageRef,
  ...props
}: LogoEffectsFrameProps) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={cn(
        "omarchy-mark-effect omarchy-effects-mark block min-w-0 touch-manipulation appearance-none border-0 bg-transparent p-0 [text-align:inherit] text-inherit select-none [font:inherit]",
        className
      )}
      data-secret-lab-unlock-target=""
      data-logo-playback={playbackKey}
      onClick={onUnlockTap}
      onPointerDown={(event) => event.preventDefault()}
      ref={hostRef}
    >
      <span aria-hidden="true" className="block no-underline">
        <span
          className="omarchy-effects-mark__stage [container-type:inline-size] relative block aspect-[81/20] w-full max-w-full overflow-hidden [&>canvas]:absolute [&>canvas]:inset-0 [&>canvas]:block [&>canvas]:size-full [&>canvas]:opacity-0 [&>canvas]:mix-blend-normal"
          ref={stageRef}
        >
          <svg
            aria-hidden="true"
            className="omarchy-effects-mark__fallback text-primary absolute inset-0 size-full opacity-100 [shape-rendering:crispEdges]"
            focusable="false"
            preserveAspectRatio="none"
            viewBox={OMARCHY_MARK_VIEW_BOX}
          >
            <path d={OMARCHY_MARK_PATH} fill="currentColor" />
          </svg>
          {canvasRef ? (
            <canvas aria-hidden="true" data-screen-effects-skip-capture="" ref={canvasRef} />
          ) : null}
        </span>
      </span>
    </span>
  );
}

export function LogoEffectsSurface({
  className,
  playbackKey = "primary",
  ...props
}: LogoEffectsSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLSpanElement>(null);
  const secretLabTapCountRef = useRef(0);
  const lastSecretLabTapAtRef = useRef(0);
  const rendererRef = useRef<LogoRendererController | null>(null);
  const explicitReplayRef = useRef(false);
  const lastPlayedEffectRef = useRef<LogoEffectPlaybackIdentity | null>(null);
  const canReplayRef = useRef(false);
  const pendingReplayRef = useRef(false);
  const previewStateRef = useRef<string | null>(null);
  const [rendererReady, setRendererReady] = useState(false);
  const initialStartModeRef = useRef<LogoEffectStartMode | null>(null);
  const [themeRevision, setThemeRevision] = useState(0);
  const {
    activeEffect,
    activeSeed,
    adoptEffectDocument,
    claimInitialStartMode,
    isSelectionReady,
    effectDocument,
    idle,
    revealEnabled,
  } = useLogoEffects();
  const claimInitialStartModeFromEffect = useEffectEvent(claimInitialStartMode);

  useEffect(() => {
    if (!rendererReady) return;
    rendererRef.current?.configureIdle(idle);
  }, [idle, rendererReady]);

  useEffect(() => {
    const refreshEffectPalette = () => {
      rendererRef.current?.refreshPalette();
      setThemeRevision((revision) => revision + 1);
    };
    window.addEventListener(themeAppliedEvent, refreshEffectPalette);
    return () => window.removeEventListener(themeAppliedEvent, refreshEffectPalette);
  }, []);

  useEffect(
    () =>
      subscribeLogoEffectReplay(playbackKey, () => {
        explicitReplayRef.current = true;
        pendingReplayRef.current = true;
        const host = hostRef.current;
        const renderer = rendererRef.current;
        if (!host || !renderer || !canReplayRef.current) return;
        pendingReplayRef.current = false;
        delete host.dataset.logoInitialReveal;
        const startMode = revealEnabled ? "reveal" : "settled";
        host.dataset.effectStartMode = startMode;
        renderer.replay(startMode);
      }),
    [playbackKey, revealEnabled]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const startMode = initialStartModeRef.current ?? claimInitialStartModeFromEffect(playbackKey);
    initialStartModeRef.current = startMode;
    host.dataset.effectStartMode = startMode;
    if (startMode === "reveal") host.dataset.logoInitialReveal = "pending";
    else delete host.dataset.logoInitialReveal;
    consumeInitialLogoReveal(document.documentElement.dataset, playbackKey);
    setRendererReady(false);
    canReplayRef.current = false;
    canvas.dataset.placement = "inline";
    let disposed = false;
    let rendererFailed = false;
    const abortController = new AbortController();

    if (navigator.gpu === undefined) {
      initialStartModeRef.current = "settled";
      consumeInitialLogoReveal(document.documentElement.dataset, playbackKey);
      host.dataset.renderer = "unavailable";
      return () => {
        disposed = true;
        abortController.abort();
        delete host.dataset.effectStartMode;
        delete host.dataset.renderer;
        delete canvas.dataset.placement;
      };
    }

    const activity = observeRenderActivity(host, (isActive) => {
      rendererRef.current?.setActive(isActive);
      if (isActive && host.dataset.live === "true") canvas.dataset.live = "true";
      else delete canvas.dataset.live;
    });

    host.dataset.renderer = "loading";

    void loadLogoRenderer()
      .then(({ createLogoRenderer, logoRendererBundleMarker }) =>
        createLogoRenderer(
          canvas,
          stageRef.current,
          {
            onSettledFrame() {
              const state = previewStateRef.current;
              if (!disposed && playbackKey === "primary" && state !== null) {
                saveLogoPreview(canvas, state);
              }
            },
            onError(error) {
              if (disposed) return;
              initialStartModeRef.current = "settled";
              delete host.dataset.logoInitialReveal;
              consumeInitialLogoReveal(document.documentElement.dataset, playbackKey);
              rendererFailed = true;
              activity.dispose();
              rendererRef.current = null;
              canReplayRef.current = false;
              pendingReplayRef.current = false;
              setRendererReady(false);
              console.error("Omarchy vgpu logo renderer failed", error);
              markLogoRendererInactive(host, canvas, "error");
            },
            onLive() {
              if (disposed || rendererFailed) return;
              delete host.dataset.logoInitialReveal;
              host.dataset.live = "true";
              if (activity.isActive()) canvas.dataset.live = "true";
              else delete canvas.dataset.live;
              host.dataset.renderer = logoRendererBundleMarker;
            },
          },
          abortController.signal
        )
      )
      .then((renderer) => {
        if (disposed || rendererFailed) {
          renderer.dispose();
          return;
        }
        rendererRef.current = renderer;
        renderer.setActive(activity.isActive());
        setRendererReady(true);
      })
      .catch((error) => {
        if (disposed) return;
        initialStartModeRef.current = "settled";
        delete host.dataset.logoInitialReveal;
        consumeInitialLogoReveal(document.documentElement.dataset, playbackKey);
        rendererFailed = true;
        activity.dispose();
        canReplayRef.current = false;
        pendingReplayRef.current = false;
        setRendererReady(false);
        const unsupported = error instanceof Error && error.name === "LogoRendererUnsupportedError";
        if (!unsupported) console.error("Unable to start the Omarchy vgpu logo renderer", error);
        if (unsupported) markLogoRendererInactive(host, canvas, "unsupported");
        else markLogoRendererInactive(host, canvas, "error");
      });

    return () => {
      disposed = true;
      canReplayRef.current = false;
      pendingReplayRef.current = false;
      abortController.abort();
      activity.dispose();
      rendererRef.current?.dispose();
      rendererRef.current = null;
      delete host.dataset.live;
      delete host.dataset.effectStartMode;
      delete host.dataset.logoInitialReveal;
      delete host.dataset.renderer;
      delete canvas.dataset.live;
      delete canvas.dataset.placement;
    };
  }, [playbackKey]);

  useEffect(() => {
    if (!isSelectionReady || !rendererReady) return;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !host || !renderer) return;
    let cancelled = false;
    let settleTimedOutAttempt: (() => void) | null = null;

    const settleIfFallbackWasExposed = () => {
      if (cancelled || explicitReplayRef.current || host.dataset.renderer !== "timeout") {
        return;
      }
      initialStartModeRef.current = "settled";
      const settle = settleTimedOutAttempt;
      settleTimedOutAttempt = null;
      settle?.();
    };
    const timeoutObserver = new MutationObserver(settleIfFallbackWasExposed);
    timeoutObserver.observe(host, {
      attributeFilter: ["data-renderer"],
      attributes: true,
    });

    const startEffectAttempt = (play: (startMode: LogoEffectStartMode) => void) => {
      const previousPlayback = lastPlayedEffectRef.current;
      const changesPlayback =
        previousPlayback !== null &&
        (previousPlayback.effectId !== activeEffect || previousPlayback.seed !== activeSeed);
      if (changesPlayback) delete host.dataset.logoInitialReveal;
      const startMode = resolveLogoEffectPlaybackStartMode({
        fallbackWasExposed: host.dataset.renderer === "timeout",
        initialStartMode: initialStartModeRef.current ?? "settled",
        nextEffectId: activeEffect,
        nextSeed: activeSeed,
        prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        previousPlayback,
        revealEnabled,
      });
      initialStartModeRef.current = "settled";
      const commit = (mode: LogoEffectStartMode) => {
        host.dataset.effectStartMode = mode;
        play(mode);
      };
      commit(startMode);
      lastPlayedEffectRef.current = {
        effectId: activeEffect,
        seed: activeSeed,
      };
      if (host.dataset.logoInitialReveal !== "pending") return;
      settleTimedOutAttempt = () => {
        renderer.stop();
        delete host.dataset.logoInitialReveal;
        commit("settled");
      };
      settleIfFallbackWasExposed();
    };

    canReplayRef.current = false;
    host.dataset.effectPaletteRevision = String(themeRevision);

    const finishUpdate = () => {
      canReplayRef.current = true;
      if (!pendingReplayRef.current) return;
      pendingReplayRef.current = false;
      delete host.dataset.logoInitialReveal;
      const startMode = revealEnabled ? "reveal" : "settled";
      host.dataset.effectStartMode = startMode;
      renderer.replay(startMode);
    };

    void loadLogoEffect(activeEffect)
      .then((effectModule) => {
        if (cancelled) return;
        const definition = effectModule.logoEffect;
        if (definition.id !== activeEffect) {
          throw new TypeError(
            `Loaded ${definition.id} while preparing the ${activeEffect} logo effect`
          );
        }
        const resolved = resolveActiveLogoEffect(
          effectDocument,
          definition,
          createLogoEffectColorResolver(canvas)
        );
        if (resolved.document !== effectDocument) {
          adoptEffectDocument(effectDocument, resolved.document);
        }
        host.dataset.effectBundle = resolved.prepared.bundleMarker;
        previewStateRef.current = serializeLogoEffectState(resolved.document);
        startEffectAttempt((startMode) =>
          renderer.playPrepared(resolved.prepared, activeSeed, startMode)
        );
        finishUpdate();
      })
      .catch((error) => {
        if (cancelled) return;
        initialStartModeRef.current = "settled";
        delete host.dataset.logoInitialReveal;
        settleTimedOutAttempt = null;
        consumeInitialLogoReveal(document.documentElement.dataset, playbackKey);
        canReplayRef.current = false;
        pendingReplayRef.current = false;
        console.error(`Unable to load the ${activeEffect} logo effect`, error);
        renderer.stop();
        delete host.dataset.effectBundle;
        markLogoRendererInactive(host, canvas, "error");
      });

    return () => {
      cancelled = true;
      canReplayRef.current = false;
      settleTimedOutAttempt = null;
      timeoutObserver.disconnect();
      delete host.dataset.effectBundle;
      delete host.dataset.effectPaletteRevision;
    };
  }, [
    activeEffect,
    activeSeed,
    adoptEffectDocument,
    effectDocument,
    isSelectionReady,
    playbackKey,
    rendererReady,
    revealEnabled,
    themeRevision,
  ]);

  // Keep the logo's pointer easter egg decorative. SecretLabRuntime owns the
  // deliberate keyboard unlock sequence, so this surface stays out of tab order.
  const registerSecretLabTap = () => {
    const tappedAt = performance.now();
    if (tappedAt - lastSecretLabTapAtRef.current > SECRET_LAB_TAP_RESET_MS) {
      secretLabTapCountRef.current = 0;
    }

    lastSecretLabTapAtRef.current = tappedAt;
    secretLabTapCountRef.current += 1;

    if (secretLabTapCountRef.current < SECRET_LAB_UNLOCK_TAPS) return;

    secretLabTapCountRef.current = 0;
    lastSecretLabTapAtRef.current = 0;
    unlockSecretLab();
    openSecretLab();
  };

  return (
    <LogoEffectsFrame
      {...props}
      canvasRef={canvasRef}
      className={className}
      hostRef={hostRef}
      onUnlockTap={registerSecretLabTap}
      playbackKey={playbackKey}
      stageRef={stageRef}
    />
  );
}
