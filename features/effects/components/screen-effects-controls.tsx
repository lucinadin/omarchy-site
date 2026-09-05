"use client";

import {
  ChoiceControl,
  EffectSection,
  formatDegrees,
  formatPercentage,
  formatScale,
  RangeControl,
  type ChoiceOption,
} from "@/features/effects/components/effect-control";
import {
  CAPTURE_EFFECTS,
  OVERLAY_EFFECTS,
  SCREEN_OVERLAY_TARGETS,
  type CaptureEffectId,
  type OverlayEffectId,
  type ScreenOverlayTargetId,
} from "@/lib/effects/screen/registry";
import { useScreenEffects } from "@/providers";

const DITHER_PATTERN_OPTIONS = [
  { label: "Bayer", value: "bayer" },
  { label: "Halftone", value: "halftone" },
] as const;

const BAYER_MATRIX_OPTIONS = [
  { label: "2×2", value: 2 },
  { label: "4×4", value: 4 },
  { label: "8×8", value: 8 },
] as const;

const CAPTURE_EFFECT_OPTIONS: readonly ChoiceOption<CaptureEffectId>[] = [
  { label: "Off", value: "off" },
  ...CAPTURE_EFFECTS.map((effect) => ({ label: effect.label, value: effect.id })),
];

const OVERLAY_EFFECT_OPTIONS: readonly ChoiceOption<OverlayEffectId>[] = [
  { label: "Off", value: "off" },
  ...OVERLAY_EFFECTS.map((overlay) => ({ label: overlay.label, value: overlay.id })),
];

const OVERLAY_TARGET_OPTIONS: readonly ChoiceOption<ScreenOverlayTargetId>[] =
  SCREEN_OVERLAY_TARGETS.map((target) => ({
    label: target.label,
    value: target.id,
  }));

function CaptureControls() {
  const {
    capture: { effect, settings },
    captureStatus,
    htmlInCanvasSupport,
    setCaptureEffect,
    updateCaptureSettings,
  } = useScreenEffects();

  return (
    <EffectSection label="HTML-in-Canvas">
      <ChoiceControl
        label="Capture"
        disabled={htmlInCanvasSupport !== "supported"}
        onChange={setCaptureEffect}
        options={CAPTURE_EFFECT_OPTIONS}
        value={effect}
      />
      {htmlInCanvasSupport !== "supported" ? (
        <div
          aria-live="polite"
          className="text-micro/ui block px-1 pt-0.5 text-(color:--tuner-muted) uppercase [&_a]:text-(color:--tuner-strong) [&_a]:underline [&_a]:underline-offset-2"
        >
          {htmlInCanvasSupport === "checking" ? "Checking browser support…" : null}
          {htmlInCanvasSupport === "unsupported" ? (
            <>
              HTML-in-Canvas unavailable ·{" "}
              <a href="https://github.com/WICG/html-in-canvas" rel="noreferrer" target="_blank">
                Setup and documentation ↗
              </a>
            </>
          ) : null}
        </div>
      ) : effect !== "off" ? (
        <>
          <div
            aria-live="polite"
            className="text-micro/ui block px-1 pt-0.5 text-(color:--tuner-muted) uppercase"
          >
            {captureStatus === "live" ? "WebGPU live" : captureStatus}
          </div>
          <RangeControl
            format={formatPercentage}
            label="Intensity"
            maximum={1}
            minimum={0}
            onChange={(intensity) => updateCaptureSettings({ intensity })}
            step={0.05}
            value={settings.intensity}
          />
          {effect === "crt" || effect === "grain" ? (
            <RangeControl
              format={formatPercentage}
              label="Grain"
              maximum={1}
              minimum={0}
              onChange={(grain) => updateCaptureSettings({ grain })}
              step={0.05}
              value={settings.grain}
            />
          ) : null}
        </>
      ) : null}
    </EffectSection>
  );
}

function CaptureColorControls() {
  const {
    capture: { effect, settings },
    updateCaptureSettings,
  } = useScreenEffects();
  if (effect === "off") return null;

  return (
    <EffectSection label="Color">
      <RangeControl
        format={formatPercentage}
        label="Saturation"
        maximum={2}
        minimum={0}
        onChange={(saturation) => updateCaptureSettings({ saturation })}
        step={0.05}
        value={settings.saturation}
      />
      <RangeControl
        format={formatPercentage}
        label="Contrast"
        maximum={1.5}
        minimum={0.5}
        onChange={(contrast) => updateCaptureSettings({ contrast })}
        step={0.05}
        value={settings.contrast}
      />
      <RangeControl
        format={formatPercentage}
        label="Grayscale"
        maximum={1}
        minimum={0}
        onChange={(grayscale) => updateCaptureSettings({ grayscale })}
        step={0.05}
        value={settings.grayscale}
      />
    </EffectSection>
  );
}

function DitherControls() {
  const {
    capture: { effect, settings },
    updateCaptureSettings,
  } = useScreenEffects();
  if (effect !== "crt" && effect !== "dither") return null;

  return (
    <EffectSection label="Dither / halftone">
      <ChoiceControl
        label="Pattern"
        onChange={(ditherPattern) => updateCaptureSettings({ ditherPattern })}
        options={DITHER_PATTERN_OPTIONS}
        value={settings.ditherPattern}
      />
      <RangeControl
        format={formatPercentage}
        label="Amount"
        maximum={1}
        minimum={0}
        onChange={(dither) => updateCaptureSettings({ dither })}
        step={0.05}
        value={settings.dither}
      />
      <RangeControl
        format={(value) => `${Math.round(value)}px`}
        label="Pattern scale"
        maximum={8}
        minimum={1}
        onChange={(patternScale) => updateCaptureSettings({ patternScale })}
        step={1}
        value={settings.patternScale}
      />
      {settings.ditherPattern === "bayer" ? (
        <>
          <ChoiceControl
            label="Bayer matrix"
            onChange={(bayerMatrixSize) => updateCaptureSettings({ bayerMatrixSize })}
            options={BAYER_MATRIX_OPTIONS}
            value={settings.bayerMatrixSize}
          />
          <RangeControl
            format={(value) => `${Math.round(value)}`}
            label="Palette levels"
            maximum={16}
            minimum={2}
            onChange={(paletteLevels) => updateCaptureSettings({ paletteLevels })}
            step={1}
            value={settings.paletteLevels}
          />
        </>
      ) : (
        <>
          <RangeControl
            format={formatScale}
            label="Dot size"
            maximum={1.5}
            minimum={0.25}
            onChange={(halftoneDotSize) => updateCaptureSettings({ halftoneDotSize })}
            step={0.05}
            value={settings.halftoneDotSize}
          />
          <RangeControl
            format={formatDegrees}
            label="Angle"
            maximum={180}
            minimum={0}
            onChange={(halftoneAngle) => updateCaptureSettings({ halftoneAngle })}
            step={1}
            value={settings.halftoneAngle}
          />
        </>
      )}
    </EffectSection>
  );
}

function CrtControls() {
  const {
    capture: { effect, settings },
    updateCaptureSettings,
  } = useScreenEffects();
  if (effect !== "crt") return null;

  return (
    <EffectSection label="CRT">
      <p
        className="text-micro/ui leading-ui [margin:2px_4px_4px] border-l-2 border-(--ansi-yellow) bg-[color-mix(in_srgb,var(--ansi-yellow)_9%,transparent)] px-[7px] py-[5px] text-(color:--tuner-label)"
        role="note"
      >
        Curvature bends the picture, not browser hit targets. Links and controls near the edges may
        click slightly off.
      </p>
      <RangeControl
        format={formatPercentage}
        label="Curvature"
        maximum={1}
        minimum={0}
        onChange={(curvature) => updateCaptureSettings({ curvature })}
        step={0.05}
        value={settings.curvature}
      />
      <RangeControl
        format={formatPercentage}
        label="Scanline strength"
        maximum={1}
        minimum={0}
        onChange={(scanlines) => updateCaptureSettings({ scanlines })}
        step={0.05}
        value={settings.scanlines}
      />
      <RangeControl
        format={(value) => `${value.toFixed(1)}px`}
        label="Scanline spacing"
        maximum={8}
        minimum={1}
        onChange={(scanlineSpacing) => updateCaptureSettings({ scanlineSpacing })}
        step={0.5}
        value={settings.scanlineSpacing}
      />
      <RangeControl
        format={formatPercentage}
        label="Scanline thickness"
        maximum={0.9}
        minimum={0.1}
        onChange={(scanlineThickness) => updateCaptureSettings({ scanlineThickness })}
        step={0.05}
        value={settings.scanlineThickness}
      />
      <RangeControl
        format={formatPercentage}
        label="Vignette"
        maximum={1}
        minimum={0}
        onChange={(vignette) => updateCaptureSettings({ vignette })}
        step={0.05}
        value={settings.vignette}
      />
      <RangeControl
        format={formatPercentage}
        label="RGB split"
        maximum={1}
        minimum={0}
        onChange={(chromaticAberration) => updateCaptureSettings({ chromaticAberration })}
        step={0.05}
        value={settings.chromaticAberration}
      />
    </EffectSection>
  );
}

function ScreenOverlayControls() {
  const { overlay, overlayStatus, setOverlayEffect, setOverlayTarget, updateOverlaySettings } =
    useScreenEffects();

  return (
    <EffectSection label="GPU overlay">
      <ChoiceControl
        label="Overlay"
        onChange={setOverlayEffect}
        options={OVERLAY_EFFECT_OPTIONS}
        value={overlay.effect}
      />
      <ChoiceControl
        label="Target"
        onChange={setOverlayTarget}
        options={OVERLAY_TARGET_OPTIONS}
        value={overlay.target}
      />
      {overlay.effect !== "off" ? (
        <>
          <output className="text-micro/ui block px-1 pt-0.5 text-(color:--tuner-muted) uppercase">
            {overlayStatus === "live" ? "WebGPU live" : overlayStatus}
          </output>
          <RangeControl
            format={formatPercentage}
            label="Overlay intensity"
            maximum={1}
            minimum={0}
            onChange={(intensity) => updateOverlaySettings({ intensity })}
            step={0.05}
            value={overlay.settings.intensity}
          />
          {overlay.effect === "crt-mask" || overlay.effect === "grain" ? (
            <RangeControl
              format={formatPercentage}
              label="Overlay grain"
              maximum={1}
              minimum={0}
              onChange={(grain) => updateOverlaySettings({ grain })}
              step={0.05}
              value={overlay.settings.grain}
            />
          ) : null}
          {overlay.effect === "crt-mask" || overlay.effect === "dither" ? (
            <RangeControl
              format={formatPercentage}
              label="Overlay dither"
              maximum={1}
              minimum={0}
              onChange={(dither) => updateOverlaySettings({ dither })}
              step={0.05}
              value={overlay.settings.dither}
            />
          ) : null}
          {overlay.effect === "crt-mask" || overlay.effect === "scanlines" ? (
            <RangeControl
              format={formatPercentage}
              label="Overlay scanlines"
              maximum={1}
              minimum={0}
              onChange={(scanlines) => updateOverlaySettings({ scanlines })}
              step={0.05}
              value={overlay.settings.scanlines}
            />
          ) : null}
          {overlay.effect === "crt-mask" ? (
            <RangeControl
              format={formatPercentage}
              label="Overlay vignette"
              maximum={1}
              minimum={0}
              onChange={(vignette) => updateOverlaySettings({ vignette })}
              step={0.05}
              value={overlay.settings.vignette}
            />
          ) : null}
        </>
      ) : null}
    </EffectSection>
  );
}

export function ScreenEffectsControls() {
  return (
    <>
      <CaptureControls />
      <CaptureColorControls />
      <DitherControls />
      <CrtControls />
      <ScreenOverlayControls />
    </>
  );
}
