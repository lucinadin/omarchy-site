"use client";

import { useSyncExternalStore } from "react";

import {
  ChoiceControl,
  EffectButton,
  EffectSection,
  RangeControl,
  type ChoiceOption,
} from "@/features/effects/components/effect-control";
import { resetPatronBadgeGlareSettings } from "@/lib/effects/patron-badges/glare-settings";
import {
  getRenderQualitySnapshot,
  getServerRenderQualitySnapshot,
  resetRenderQualityPreference,
  setRenderQualityPreference,
  subscribeRenderQuality,
  type RenderQualityPreference,
} from "@/lib/rendering/quality-preference";
import { maximumThemeSkewAngle, minimumThemeSkewAngle } from "@/lib/themes/theme-constants";
import { useLogoEffects, useScreenEffects } from "@/providers";

const RENDER_QUALITY_OPTIONS: readonly ChoiceOption<RenderQualityPreference>[] = [
  { label: "Auto", value: "auto" },
  { label: "High", value: "high" },
  { label: "Low", value: "low" },
];

export function GeneralControls() {
  const {
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

  const resetGeneralSettings = () => {
    resetGeneral();
    resetRenderQualityPreference();
  };

  const resetEverything = () => {
    resetLogo();
    resetScreen();
    resetPatronBadgeGlareSettings();
    resetGeneralSettings();
  };

  return (
    <>
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
          <EffectButton onClick={resetGeneralSettings}>Reset general</EffectButton>
          <EffectButton className="col-span-2" onClick={resetEverything}>
            Reset everything
          </EffectButton>
        </div>
      </EffectSection>
    </>
  );
}
