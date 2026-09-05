"use client";

import { useSyncExternalStore } from "react";

import {
  ChoiceControl,
  EffectSection,
  formatDegrees,
  formatPercentage,
  RangeControl,
  type ChoiceOption,
} from "@/features/effects/components/effect-control";
import type { FoilDebugView, FoilMaskMode } from "@/lib/effects/foil/settings";
import {
  getPatronBadgeGlareSnapshot,
  getServerPatronBadgeGlareSnapshot,
  patronBadgeGlareLimits,
  setPatronBadgeGlareSettings,
  subscribePatronBadgeGlare,
} from "@/lib/effects/patron-badges/glare-settings";

const MASK_OPTIONS: readonly ChoiceOption<FoilMaskMode>[] = [
  { label: "Texture", value: "texture" },
  { label: "Texture + edges", value: "texture-and-edges" },
  { label: "Edges", value: "edges" },
];

const DEBUG_OPTIONS: readonly ChoiceOption<FoilDebugView>[] = [
  { label: "Final", value: "final" },
  { label: "Coverage", value: "coverage" },
  { label: "Edges", value: "edges" },
  { label: "Normals", value: "normals" },
  { label: "Reflection", value: "reflection" },
];

export function PatronBadgeControls() {
  const settings = useSyncExternalStore(
    subscribePatronBadgeGlare,
    getPatronBadgeGlareSnapshot,
    getServerPatronBadgeGlareSnapshot
  );

  return (
    <>
      <EffectSection label="Mask">
        <ChoiceControl
          label="Preview"
          onChange={(debugView) => setPatronBadgeGlareSettings({ debugView })}
          options={DEBUG_OPTIONS}
          value={settings.debugView}
        />
        <ChoiceControl
          label="Foil coverage"
          onChange={(maskMode) => setPatronBadgeGlareSettings({ maskMode })}
          options={MASK_OPTIONS}
          value={settings.maskMode}
        />
        {settings.maskMode === "texture" || settings.maskMode === "texture-and-edges" ? (
          <>
            <RangeControl
              format={formatPercentage}
              label="Texture selectivity"
              maximum={patronBadgeGlareLimits.textureThreshold.maximum}
              minimum={patronBadgeGlareLimits.textureThreshold.minimum}
              onChange={(textureThreshold) => setPatronBadgeGlareSettings({ textureThreshold })}
              step={0.01}
              value={settings.textureThreshold}
            />
            <RangeControl
              format={formatPercentage}
              label="Mask softness"
              maximum={patronBadgeGlareLimits.textureSoftness.maximum}
              minimum={patronBadgeGlareLimits.textureSoftness.minimum}
              onChange={(textureSoftness) => setPatronBadgeGlareSettings({ textureSoftness })}
              step={0.01}
              value={settings.textureSoftness}
            />
            <RangeControl
              format={formatPercentage}
              label="Brightness floor"
              maximum={patronBadgeGlareLimits.textureBrightness.maximum}
              minimum={patronBadgeGlareLimits.textureBrightness.minimum}
              onChange={(textureBrightness) => setPatronBadgeGlareSettings({ textureBrightness })}
              step={0.01}
              value={settings.textureBrightness}
            />
          </>
        ) : null}
        {settings.maskMode === "edges" || settings.maskMode === "texture-and-edges" ? (
          <RangeControl
            format={formatPercentage}
            label="Edge boost"
            maximum={patronBadgeGlareLimits.edgeStrength.maximum}
            minimum={patronBadgeGlareLimits.edgeStrength.minimum}
            onChange={(edgeStrength) => setPatronBadgeGlareSettings({ edgeStrength })}
            step={0.05}
            value={settings.edgeStrength}
          />
        ) : null}
        <RangeControl
          format={(value) => `${value.toFixed(1)} px`}
          label="Detail scale"
          maximum={patronBadgeGlareLimits.edgeWidth.maximum}
          minimum={patronBadgeGlareLimits.edgeWidth.minimum}
          onChange={(edgeWidth) => setPatronBadgeGlareSettings({ edgeWidth })}
          step={0.5}
          value={settings.edgeWidth}
        />
        <RangeControl
          format={formatPercentage}
          label="Coverage strength"
          maximum={patronBadgeGlareLimits.surfaceStrength.maximum}
          minimum={patronBadgeGlareLimits.surfaceStrength.minimum}
          onChange={(surfaceStrength) => setPatronBadgeGlareSettings({ surfaceStrength })}
          step={0.05}
          value={settings.surfaceStrength}
        />
      </EffectSection>

      <EffectSection label="Material">
        <RangeControl
          format={formatPercentage}
          label="Light reach"
          maximum={patronBadgeGlareLimits.lightRadius.maximum}
          minimum={patronBadgeGlareLimits.lightRadius.minimum}
          onChange={(lightRadius) => setPatronBadgeGlareSettings({ lightRadius })}
          step={0.02}
          value={settings.lightRadius}
        />
        <RangeControl
          format={formatPercentage}
          label="Light height"
          maximum={patronBadgeGlareLimits.lightHeight.maximum}
          minimum={patronBadgeGlareLimits.lightHeight.minimum}
          onChange={(lightHeight) => setPatronBadgeGlareSettings({ lightHeight })}
          step={0.02}
          value={settings.lightHeight}
        />
        <RangeControl
          format={formatPercentage}
          label="Glare width"
          maximum={patronBadgeGlareLimits.bandWidth.maximum}
          minimum={patronBadgeGlareLimits.bandWidth.minimum}
          onChange={(bandWidth) => setPatronBadgeGlareSettings({ bandWidth })}
          step={0.05}
          value={settings.bandWidth}
        />
        <RangeControl
          format={formatPercentage}
          label="Roughness"
          maximum={patronBadgeGlareLimits.roughness.maximum}
          minimum={patronBadgeGlareLimits.roughness.minimum}
          onChange={(roughness) => setPatronBadgeGlareSettings({ roughness })}
          step={0.01}
          value={settings.roughness}
        />
        <RangeControl
          format={formatPercentage}
          label="Relief"
          maximum={patronBadgeGlareLimits.relief.maximum}
          minimum={patronBadgeGlareLimits.relief.minimum}
          onChange={(relief) => setPatronBadgeGlareSettings({ relief })}
          step={0.05}
          value={settings.relief}
        />
        <RangeControl
          format={formatPercentage}
          label="Shine"
          maximum={patronBadgeGlareLimits.glareIntensity.maximum}
          minimum={patronBadgeGlareLimits.glareIntensity.minimum}
          onChange={(glareIntensity) => setPatronBadgeGlareSettings({ glareIntensity })}
          step={0.05}
          value={settings.glareIntensity}
        />
        <RangeControl
          format={formatPercentage}
          label="Rainbow"
          maximum={patronBadgeGlareLimits.color.maximum}
          minimum={patronBadgeGlareLimits.color.minimum}
          onChange={(color) => setPatronBadgeGlareSettings({ color })}
          step={0.05}
          value={settings.color}
        />
        <RangeControl
          format={(value) => `${Math.round(value)} bands`}
          label="Rainbow density"
          maximum={patronBadgeGlareLimits.rainbowDensity.maximum}
          minimum={patronBadgeGlareLimits.rainbowDensity.minimum}
          onChange={(rainbowDensity) => setPatronBadgeGlareSettings({ rainbowDensity })}
          step={1}
          value={settings.rainbowDensity}
        />
        <RangeControl
          format={formatDegrees}
          label="Groove angle"
          maximum={patronBadgeGlareLimits.grooveAngle.maximum}
          minimum={patronBadgeGlareLimits.grooveAngle.minimum}
          onChange={(grooveAngle) => setPatronBadgeGlareSettings({ grooveAngle })}
          step={1}
          value={settings.grooveAngle}
        />
        <RangeControl
          format={(value) => `${Math.round(value)} lines`}
          label="Groove density"
          maximum={patronBadgeGlareLimits.grooveDensity.maximum}
          minimum={patronBadgeGlareLimits.grooveDensity.minimum}
          onChange={(grooveDensity) => setPatronBadgeGlareSettings({ grooveDensity })}
          step={1}
          value={settings.grooveDensity}
        />
        <RangeControl
          format={formatPercentage}
          label="Foil texture"
          maximum={patronBadgeGlareLimits.foilTexture.maximum}
          minimum={patronBadgeGlareLimits.foilTexture.minimum}
          onChange={(foilTexture) => setPatronBadgeGlareSettings({ foilTexture })}
          step={0.05}
          value={settings.foilTexture}
        />
        <RangeControl
          format={formatPercentage}
          label="Sparkle"
          maximum={patronBadgeGlareLimits.sparkleStrength.maximum}
          minimum={patronBadgeGlareLimits.sparkleStrength.minimum}
          onChange={(sparkleStrength) => setPatronBadgeGlareSettings({ sparkleStrength })}
          step={0.05}
          value={settings.sparkleStrength}
        />
        <RangeControl
          format={(value) => `${Math.round(value)} cells`}
          label="Sparkle density"
          maximum={patronBadgeGlareLimits.sparkleDensity.maximum}
          minimum={patronBadgeGlareLimits.sparkleDensity.minimum}
          onChange={(sparkleDensity) => setPatronBadgeGlareSettings({ sparkleDensity })}
          step={4}
          value={settings.sparkleDensity}
        />
        <RangeControl
          format={(value) => `${value.toFixed(1)}°`}
          label="Tilt"
          maximum={patronBadgeGlareLimits.tiltDegrees.maximum}
          minimum={patronBadgeGlareLimits.tiltDegrees.minimum}
          onChange={(tiltDegrees) => setPatronBadgeGlareSettings({ tiltDegrees })}
          step={0.25}
          value={settings.tiltDegrees}
        />
      </EffectSection>
    </>
  );
}
