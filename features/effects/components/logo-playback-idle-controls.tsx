"use client";

import {
  ChoiceControl,
  EffectSection,
  formatDegrees,
  formatPercentage,
  formatScale,
  RangeControl,
  ToggleControl,
} from "@/features/effects/components/effect-control";
import { resolveLogoEffectFallbackColor } from "@/lib/effects/logo/color-bindings";
import type { LogoEffectPlayback } from "@/lib/effects/logo/definition";
import {
  createSparseLogoEffectPlaybackOverride,
  resolveActiveLogoEffect,
  setLogoPlaybackOverride,
  type ResolvedLogoEffect,
} from "@/lib/effects/logo/effect-state";
import { useLogoEffects } from "@/providers";

const IDLE_MOTION_OPTIONS = [
  { label: "Pulse", value: "pulse" },
  { label: "Drift", value: "drift" },
  { label: "Scan", value: "scan" },
  { label: "Sparkle", value: "sparkle" },
  { label: "Jitter", value: "jitter" },
] as const;

const GRADIENT_DIRECTION_OPTIONS = [
  { label: "Horizontal", value: "horizontal" },
  { label: "Vertical", value: "vertical" },
  { label: "Diagonal", value: "diagonal" },
  { label: "Custom", value: "custom" },
] as const;

function withRevealRate(current: LogoEffectPlayback, revealRate: number): LogoEffectPlayback {
  if (current.mode === "once") return { mode: current.mode, revealRate };
  if (current.mode === "ambient") {
    return { ambientRate: current.ambientRate, mode: current.mode, revealRate };
  }
  return { ...current, revealRate };
}

export function LogoPlaybackIdleControls({ resolved }: { resolved: ResolvedLogoEffect }) {
  const { idle, revealEnabled, updateEffectDocument, updateIdle, updateRevealEnabled } =
    useLogoEffects();
  const playback = resolved.prepared.playback;

  const updatePlayback = (update: (current: LogoEffectPlayback) => LogoEffectPlayback) => {
    updateEffectDocument((document) => {
      if (document.activeEffectId !== resolved.definition.id) return document;
      const current = resolveActiveLogoEffect(
        document,
        resolved.definition,
        resolveLogoEffectFallbackColor
      );
      const base = resolved.definition.prepareDefaults(resolveLogoEffectFallbackColor);
      const next = update(current.prepared.playback);
      return setLogoPlaybackOverride(
        current.document,
        createSparseLogoEffectPlaybackOverride(base.playback, next),
        resolved.definition.id
      );
    });
  };

  const setRepeat = (repeat: boolean) => {
    updatePlayback((current) => {
      if (repeat) {
        return {
          ambientRate: current.mode === "once" ? idle.speed : current.ambientRate,
          mode: "repeat",
          repeatDelayMotion: idle.enabled ? "ambient" : "settled",
          repeatDelayMs: current.mode === "repeat" ? current.repeatDelayMs : 700,
          revealRate: current.revealRate,
        };
      }
      const base = resolved.definition.prepareDefaults(resolveLogoEffectFallbackColor).playback;
      if (base.mode === "ambient") {
        return {
          ambientRate: current.mode === "once" ? idle.speed : current.ambientRate,
          mode: "ambient",
          revealRate: current.revealRate,
        };
      }
      return { mode: "once", revealRate: current.revealRate };
    });
  };

  return (
    <>
      <EffectSection label="Reveal">
        <ToggleControl
          checked={revealEnabled}
          label="Reveal animation"
          onChange={(enabled) => {
            updateRevealEnabled(enabled);
            if (!enabled && playback.mode === "repeat") setRepeat(false);
          }}
        />
        {revealEnabled ? (
          <>
            <RangeControl
              format={formatScale}
              label="Reveal speed"
              maximum={3}
              minimum={0.25}
              onChange={(revealRate) =>
                updatePlayback((current) => withRevealRate(current, revealRate))
              }
              step={0.05}
              value={playback.revealRate}
            />
            <ToggleControl
              checked={playback.mode === "repeat"}
              label="Repeat reveal"
              onChange={setRepeat}
            />
            {playback.mode === "repeat" ? (
              <RangeControl
                format={(value) => `${Math.round(value)}ms`}
                label="Repeat delay"
                maximum={10_000}
                minimum={0}
                onChange={(repeatDelayMs) =>
                  updatePlayback((current) =>
                    current.mode === "repeat" ? { ...current, repeatDelayMs } : current
                  )
                }
                step={50}
                value={playback.repeatDelayMs}
              />
            ) : null}
          </>
        ) : null}
      </EffectSection>

      <EffectSection label="Idle">
        <ToggleControl
          checked={idle.enabled}
          label="Idle animation"
          onChange={(enabled) => updateIdle({ enabled })}
        />
        {idle.enabled ? (
          <>
            <ChoiceControl
              label="Motion"
              onChange={(motion) => updateIdle({ motion })}
              options={IDLE_MOTION_OPTIONS}
              value={idle.motion}
            />
            <RangeControl
              format={formatScale}
              label="Idle speed"
              maximum={3}
              minimum={0.1}
              onChange={(speed) => updateIdle({ speed })}
              step={0.05}
              value={idle.speed}
            />
            <RangeControl
              format={formatPercentage}
              label="Motion intensity"
              maximum={1}
              minimum={0}
              onChange={(intensity) => updateIdle({ intensity })}
              step={0.05}
              value={idle.intensity}
            />
            <ToggleControl
              checked={idle.animateGradient}
              label="Animate gradient"
              onChange={(animateGradient) => updateIdle({ animateGradient })}
            />
            {idle.animateGradient ? (
              <>
                <ChoiceControl
                  label="Gradient direction"
                  onChange={(gradientDirection) => updateIdle({ gradientDirection })}
                  options={GRADIENT_DIRECTION_OPTIONS}
                  value={idle.gradientDirection}
                />
                {idle.gradientDirection === "custom" ? (
                  <RangeControl
                    format={formatDegrees}
                    label="Gradient angle"
                    maximum={360}
                    minimum={0}
                    onChange={(gradientAngle) => updateIdle({ gradientAngle })}
                    step={1}
                    value={idle.gradientAngle}
                  />
                ) : null}
                <RangeControl
                  format={formatScale}
                  label="Gradient speed"
                  maximum={1}
                  minimum={0.02}
                  onChange={(gradientSpeed) => updateIdle({ gradientSpeed })}
                  step={0.01}
                  value={idle.gradientSpeed}
                />
              </>
            ) : null}
          </>
        ) : null}
      </EffectSection>
    </>
  );
}
