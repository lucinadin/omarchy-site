"use client";

import { useEffect, useState } from "react";

import {
  EffectActionButton,
  EffectSelect,
  EffectSelectRow,
  EffectSelector,
} from "@/features/effects/components/effect-control";
import { LogoEffectSettings } from "@/features/effects/components/logo-effect-settings";
import { LogoPlaybackIdleControls } from "@/features/effects/components/logo-playback-idle-controls";
import { CopyIcon, DicesIcon, RefreshIcon, ShuffleIcon } from "@/icons";
import { writeClipboardText } from "@/lib/browser-sharing";
import { resolveLogoEffectFallbackColor } from "@/lib/effects/logo/color-bindings";
import type { LoadedLogoEffectDefinition } from "@/lib/effects/logo/definition";
import {
  materializeLogoEffectExport,
  resolveActiveLogoEffect,
  serializeLogoEffectExport,
} from "@/lib/effects/logo/effect-state";
import { loadLogoEffect, logoEffectUsesSeed, LOGO_EFFECTS } from "@/lib/effects/logo/registry";
import { notifySite } from "@/lib/site-notification-events";
import { useLogoEffects } from "@/providers";

const LOGO_EFFECT_OPTIONS = LOGO_EFFECTS.map((effect) => ({
  label: effect.label,
  value: effect.id,
}));

export function LogoEffectsControls() {
  const {
    activeEffect,
    adoptEffectDocument,
    effectDocument,
    randomize: onRandomize,
    reroll: onReroll,
    restart: onRestart,
    selectEffect: onSelectionChange,
  } = useLogoEffects();
  const [loadedDefinition, setLoadedDefinition] = useState<LoadedLogoEffectDefinition | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadLogoEffect(activeEffect)
      .then((effectModule) => {
        if (cancelled || effectModule.logoEffect.id !== activeEffect) {
          return;
        }
        setLoadedDefinition(effectModule.logoEffect);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadedDefinition(null);
        console.error(`Unable to load the ${activeEffect} logo controls`, error);
      });

    return () => {
      cancelled = true;
    };
  }, [activeEffect]);

  const activeDefinition = loadedDefinition?.id === activeEffect ? loadedDefinition : null;
  const resolved =
    activeDefinition === null
      ? null
      : resolveActiveLogoEffect(effectDocument, activeDefinition, resolveLogoEffectFallbackColor);

  useEffect(() => {
    if (activeDefinition === null) return;
    const current = resolveActiveLogoEffect(
      effectDocument,
      activeDefinition,
      resolveLogoEffectFallbackColor
    );
    if (current.document !== effectDocument) {
      adoptEffectDocument(effectDocument, current.document);
    }
  }, [activeDefinition, adoptEffectDocument, effectDocument]);

  const copyEffect = async () => {
    if (resolved === null) return;
    const result = await writeClipboardText(
      serializeLogoEffectExport(materializeLogoEffectExport(resolved))
    );
    notifySite(result === "copied" ? "Preset JSON copied" : "Could not copy preset JSON");
  };

  return (
    <>
      <EffectSelector>
        <EffectSelectRow>
          <EffectActionButton
            aria-label="Random logo preset"
            onClick={onRandomize}
            title="Random preset"
          >
            <ShuffleIcon aria-hidden="true" />
          </EffectActionButton>
          <EffectSelect
            aria-label="Logo preset"
            onChange={(event) => {
              const selectedEffect = LOGO_EFFECT_OPTIONS.find(
                (option) => option.value === event.currentTarget.value
              );
              if (selectedEffect !== undefined) onSelectionChange(selectedEffect.value);
            }}
            value={activeEffect}
          >
            {LOGO_EFFECT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </EffectSelect>
          <EffectActionButton
            aria-label="Restart logo preset"
            onClick={onRestart}
            title="Restart preset"
          >
            <RefreshIcon aria-hidden="true" />
          </EffectActionButton>
          {logoEffectUsesSeed(activeEffect) ? (
            <EffectActionButton
              aria-label="Reroll logo preset"
              onClick={onReroll}
              title="Reroll preset"
            >
              <DicesIcon aria-hidden="true" />
            </EffectActionButton>
          ) : null}
          <EffectActionButton
            aria-label="Copy preset JSON"
            disabled={resolved === null}
            onClick={copyEffect}
            title="Copy preset JSON"
          >
            <CopyIcon aria-hidden="true" />
          </EffectActionButton>
        </EffectSelectRow>
      </EffectSelector>

      {resolved ? (
        <>
          <LogoPlaybackIdleControls resolved={resolved} />
          <LogoEffectSettings activeEffect={activeEffect} resolved={resolved} />
        </>
      ) : null}
    </>
  );
}
