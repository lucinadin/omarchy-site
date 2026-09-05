"use client";

import {
  ChoiceControl,
  EffectSection,
  formatPercentage,
  formatScale,
  RangeControl,
} from "@/features/effects/components/effect-control";
import { LogoEffectSchemaControls } from "@/features/effects/components/logo-effect-schema-controls";
import { resolveLogoEffectFallbackColor } from "@/lib/effects/logo/color-bindings";
import type {
  LogoEffectGlyphSelection,
  LogoEffectPresentation,
  PreparedLogoEffect,
} from "@/lib/effects/logo/definition";
import {
  createSparseLogoEffectPresentationOverride,
  createSparseLogoEffectValues,
  resolveActiveLogoEffect,
  setLogoEffectDraft,
  setLogoPresentationOverride,
  type LogoEffectState,
  type ResolvedLogoEffect,
} from "@/lib/effects/logo/effect-state";
import { LOGO_GLYPHS } from "@/lib/effects/logo/glyphs";
import { logoEffectUsesParticleGlyph, type LogoEffectId } from "@/lib/effects/logo/registry";
import type { LogoGlyphChannel } from "@/lib/effects/logo/types";
import { useLogoEffects } from "@/providers";

const LOGO_GLYPH_OPTIONS = [
  { label: "Original", value: "original" },
  ...LOGO_GLYPHS.map((glyph) => ({ label: glyph, value: glyph })),
] as const;

const PARTICLE_GLYPH_OPTIONS = [
  { label: "Preset default", value: "effect" },
  ...LOGO_GLYPHS.map((glyph) => ({ label: glyph, value: glyph })),
] as const;

type LogoEffectSettingsProps = {
  activeEffect: LogoEffectId;
  resolved: ResolvedLogoEffect;
};

type PresentationUpdate = (current: LogoEffectPresentation) => LogoEffectPresentation;

type CurrentEffectUpdate = (
  document: LogoEffectState,
  current: ResolvedLogoEffect,
  base: PreparedLogoEffect
) => LogoEffectState;

function glyphForChannel(presentation: LogoEffectPresentation, channel: LogoGlyphChannel) {
  return presentation.glyphs.overrides[channel] ?? presentation.glyphs.default;
}

function glyphControlValue(selection: LogoEffectGlyphSelection, sourceValue: string) {
  return selection.kind === "source" ? sourceValue : selection.value;
}

function presentationWithGlyph(
  presentation: LogoEffectPresentation,
  channel: LogoGlyphChannel,
  selection: LogoEffectGlyphSelection
): LogoEffectPresentation {
  return {
    ...presentation,
    glyphs: {
      ...presentation.glyphs,
      overrides: { ...presentation.glyphs.overrides, [channel]: selection },
    },
  };
}

export function LogoEffectSettings({ activeEffect, resolved }: LogoEffectSettingsProps) {
  const { updateEffectDocument } = useLogoEffects();
  const { definition, prepared } = resolved;
  const presentation = prepared.presentation;

  const updateCurrentEffect = (update: CurrentEffectUpdate) => {
    updateEffectDocument((document) => {
      if (document.activeEffectId !== definition.id) return document;
      const current = resolveActiveLogoEffect(document, definition, resolveLogoEffectFallbackColor);
      const currentBase = definition.prepareDefaults(resolveLogoEffectFallbackColor);
      return update(current.document, current, currentBase);
    });
  };

  const updatePresentation = (update: PresentationUpdate) => {
    updateCurrentEffect((document, current, currentBase) => {
      const nextPresentation = update(current.prepared.presentation);
      return setLogoPresentationOverride(
        document,
        createSparseLogoEffectPresentationOverride(currentBase.presentation, nextPresentation),
        definition.id
      );
    });
  };

  const logoGlyph = glyphForChannel(presentation, "finalText");
  const particleGlyph = glyphForChannel(presentation, "particle");

  return (
    <>
      <EffectSection label="Glyphs & particles">
        <ChoiceControl
          label="Logo glyph"
          onChange={(value) => {
            updatePresentation((currentPresentation) =>
              presentationWithGlyph(
                currentPresentation,
                "finalText",
                value === "original" ? { kind: "source" } : { kind: "symbol", value }
              )
            );
          }}
          options={LOGO_GLYPH_OPTIONS}
          value={glyphControlValue(logoGlyph, "original")}
        />
        {logoEffectUsesParticleGlyph(activeEffect) ? (
          <ChoiceControl
            label="Particle glyph"
            onChange={(value) => {
              updatePresentation((currentPresentation) =>
                presentationWithGlyph(
                  currentPresentation,
                  "particle",
                  value === "effect" ? { kind: "source" } : { kind: "symbol", value }
                )
              );
            }}
            options={PARTICLE_GLYPH_OPTIONS}
            value={glyphControlValue(particleGlyph, "effect")}
          />
        ) : null}
      </EffectSection>

      <LogoEffectSchemaControls
        definition={definition}
        onValuesChange={(updateValues) => {
          updateCurrentEffect((document, current, currentBase) =>
            setLogoEffectDraft(document, {
              values: createSparseLogoEffectValues(
                currentBase.values,
                updateValues(current.prepared.values)
              ),
            })
          );
        }}
        values={prepared.values}
      />

      <EffectSection label="Rendering">
        <RangeControl
          format={formatPercentage}
          label="Saturation"
          maximum={2}
          minimum={0}
          onChange={(saturation) =>
            updatePresentation((currentPresentation) => ({
              ...currentPresentation,
              saturation,
            }))
          }
          step={0.05}
          value={presentation.saturation}
        />
        <RangeControl
          format={formatPercentage}
          label="Contrast"
          maximum={1.5}
          minimum={0.5}
          onChange={(contrast) =>
            updatePresentation((currentPresentation) => ({
              ...currentPresentation,
              contrast,
            }))
          }
          step={0.05}
          value={presentation.contrast}
        />
        <RangeControl
          format={formatPercentage}
          label="Grayscale"
          maximum={1}
          minimum={0}
          onChange={(grayscale) =>
            updatePresentation((currentPresentation) => ({
              ...currentPresentation,
              grayscale,
            }))
          }
          step={0.05}
          value={presentation.grayscale}
        />
        <RangeControl
          format={formatScale}
          label="Pixel size"
          maximum={1.2}
          minimum={0.45}
          onChange={(pixelSize) =>
            updatePresentation((currentPresentation) => ({
              ...currentPresentation,
              pixelSize,
            }))
          }
          step={0.01}
          value={presentation.pixelSize}
        />
        <RangeControl
          format={formatPercentage}
          label="Scanlines"
          maximum={1}
          minimum={0}
          onChange={(scanlines) =>
            updatePresentation((currentPresentation) => ({
              ...currentPresentation,
              scanlines,
            }))
          }
          step={0.05}
          value={presentation.scanlines}
        />
        <RangeControl
          format={formatScale}
          label="Glow"
          maximum={1.5}
          minimum={0}
          onChange={(glow) =>
            updatePresentation((currentPresentation) => ({ ...currentPresentation, glow }))
          }
          step={0.05}
          value={presentation.glow}
        />
      </EffectSection>
    </>
  );
}
