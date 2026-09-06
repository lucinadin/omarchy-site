"use client";

import { useSyncExternalStore } from "react";

import {
  ChoiceControl,
  EffectButton,
  EffectSection,
  RangeControl,
} from "@/features/effects/components/effect-control";
import {
  experimentControls,
  experimentModes,
  getExperimentSnapshot,
  getServerExperimentSnapshot,
  setExperimentSettings,
  subscribeExperiment,
} from "@/lib/effects/experiment/settings";
import { persistBackground } from "@/lib/themes/background";

export function ExperimentControls() {
  const settings = useSyncExternalStore(
    subscribeExperiment,
    getExperimentSnapshot,
    getServerExperimentSnapshot
  );
  return (
    <>
      <EffectSection label="Experiment">
        <ChoiceControl
          label="Shape"
          options={experimentModes}
          value={settings.mode}
          onChange={(mode) => setExperimentSettings({ mode })}
        />
        <EffectButton onClick={() => persistBackground({ kind: "experiment" })}>
          Use Experiment background
        </EffectButton>
        <a
          className="text-micro/ui px-1 text-(color:--tuner-muted) underline"
          href="https://github.com/vercel-labs/vgpu/tree/2de6899b38e493213fed3508b0e2d6e527e2454f/apps/docs/examples/glass-fractal"
          target="_blank"
          rel="noreferrer"
        >
          vgpu glass reference
        </a>
      </EffectSection>
      {(["Shape", "Glass", "Motion"] as const).map((section) => (
        <EffectSection key={section} label={section}>
          {experimentControls
            .filter(
              (control) =>
                control.section === section && (control.key !== "wobble" || settings.mode === "orb")
            )
            .map(({ key, ...control }) => (
              <RangeControl
                key={key}
                label={control.label}
                minimum={control.minimum}
                maximum={control.maximum}
                step={control.step}
                value={settings[key]}
                format={(value) => (key === "fps" ? `${Math.round(value)} fps` : value.toFixed(2))}
                onChange={(value) => setExperimentSettings({ [key]: value })}
              />
            ))}
        </EffectSection>
      ))}
    </>
  );
}
