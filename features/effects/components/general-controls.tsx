"use client";

import { useSyncExternalStore } from "react";

import {
  ChoiceControl,
  EffectButton,
  EffectSection,
  RangeControl,
  ToggleControl,
  type ChoiceOption,
} from "@/features/effects/components/effect-control";
import { resetExperimentSettings } from "@/lib/effects/experiment/settings";
import { resetPatronBadgeGlareSettings } from "@/lib/effects/patron-badges/glare-settings";
import {
  getWallpaperParallaxSnapshot,
  getServerWallpaperParallaxSnapshot,
  subscribeWallpaperParallax,
  setWallpaperParallaxSettings,
  resetWallpaperParallaxSettings,
  wallpaperParallaxLimits,
} from "@/lib/effects/wallpaper/settings";
import {
  getRenderQualitySnapshot,
  getServerRenderQualitySnapshot,
  resetRenderQualityPreference,
  setRenderQualityPreference,
  subscribeRenderQuality,
  type RenderQualityPreference,
} from "@/lib/rendering/quality-preference";
import { automaticBackground, persistBackground } from "@/lib/themes/background";
import { omarchyThemes } from "@/lib/themes/official";
import { maximumThemeSkewAngle, minimumThemeSkewAngle } from "@/lib/themes/theme-constants";
import {
  getAppliedThemeId,
  getThemeTransitionOrigin,
  saveThemePreference,
} from "@/lib/themes/theme-runtime";
import { useLogoEffects, useScreenEffects } from "@/providers";

const RENDER_QUALITY_OPTIONS: readonly ChoiceOption<RenderQualityPreference>[] = [
  { label: "Auto", value: "auto" },
  { label: "High", value: "high" },
  { label: "Low", value: "low" },
];

export function GeneralControls() {
  const {
    randomize,
    resetGeneral,
    resetLogo,
    themeSkewAngle,
    updateThemeSkewAngle: onThemeSkewAngleChange,
  } = useLogoEffects();
  const { resetScreen } = useScreenEffects();
  const renderQuality = useSyncExternalStore(
    subscribeRenderQuality,
    getRenderQualitySnapshot,
    getServerRenderQualitySnapshot
  );

  const parallax = useSyncExternalStore(
    subscribeWallpaperParallax,
    getWallpaperParallaxSnapshot,
    getServerWallpaperParallaxSnapshot
  );

  const resetGeneralSettings = () => {
    resetWallpaperParallaxSettings();
    resetGeneral();
    resetRenderQualityPreference();
  };

  const resetEverything = () => {
    resetLogo();
    resetScreen();
    resetPatronBadgeGlareSettings();
    resetExperimentSettings();
    persistBackground(automaticBackground);
    resetGeneralSettings();
  };

  return (
    <>
      <EffectSection label="Shortcuts">
        <EffectButton onClick={randomize}>Random logo</EffectButton>
        <EffectButton
          onClick={(event) => {
            const candidates = omarchyThemes.filter((theme) => theme.id !== getAppliedThemeId());
            const theme = candidates[Math.floor(Math.random() * candidates.length)];
            if (theme) saveThemePreference(theme, getThemeTransitionOrigin(event));
          }}
          title="Choose another official theme"
        >
          Random theme
        </EffectButton>
      </EffectSection>

      <EffectSection label="Site motion">
        <RangeControl
          format={(value) => `${value.toFixed(1)}°`}
          label="Skew angle"
          maximum={maximumThemeSkewAngle}
          minimum={minimumThemeSkewAngle}
          onChange={onThemeSkewAngleChange}
          step={0.1}
          value={themeSkewAngle}
        />
      </EffectSection>

      <EffectSection label="Wallpaper parallax">
        <ToggleControl
          checked={parallax.enabled}
          label="Parallax"
          onChange={(enabled) => setWallpaperParallaxSettings({ enabled })}
        />
        <RangeControl
          format={(value) => `${value}px`}
          label="Pointer depth"
          maximum={wallpaperParallaxLimits.pointer.maximum}
          minimum={wallpaperParallaxLimits.pointer.minimum}
          onChange={(pointer) => setWallpaperParallaxSettings({ pointer })}
          step={1}
          value={parallax.pointer}
        />
        <RangeControl
          format={(value) => `${value}px`}
          label="Scroll depth"
          maximum={wallpaperParallaxLimits.scroll.maximum}
          minimum={wallpaperParallaxLimits.scroll.minimum}
          onChange={(scroll) => setWallpaperParallaxSettings({ scroll })}
          step={1}
          value={parallax.scroll}
        />
        <RangeControl
          format={(value) => `${value}ms`}
          label="Pointer smoothing"
          maximum={wallpaperParallaxLimits.smoothing.maximum}
          minimum={wallpaperParallaxLimits.smoothing.minimum}
          onChange={(smoothing) => setWallpaperParallaxSettings({ smoothing })}
          step={10}
          value={parallax.smoothing}
        />
      </EffectSection>

      <EffectSection label="Rendering">
        <ChoiceControl
          label="Render quality"
          onChange={setRenderQualityPreference}
          options={RENDER_QUALITY_OPTIONS}
          value={renderQuality.preference}
        />
        <div
          aria-live="polite"
          className="text-micro/ui block px-1 pt-0.5 text-(color:--tuner-muted) uppercase"
        >
          {renderQuality.effective === null
            ? "No active WebGPU renderer"
            : `Effective ${renderQuality.effective}`}
        </div>
      </EffectSection>

      <EffectSection label="Reset">
        <div className="grid grid-cols-2 gap-1">
          <EffectButton onClick={resetLogo}>Reset logo</EffectButton>
          <EffectButton onClick={resetScreen}>Reset screen</EffectButton>
          <EffectButton onClick={resetPatronBadgeGlareSettings}>Reset badges</EffectButton>
          <EffectButton onClick={resetExperimentSettings}>Reset Experiment</EffectButton>
          <EffectButton onClick={resetGeneralSettings}>Reset general</EffectButton>
          <EffectButton className="col-span-2" onClick={resetEverything}>
            Reset everything
          </EffectButton>
        </div>
      </EffectSection>
    </>
  );
}
