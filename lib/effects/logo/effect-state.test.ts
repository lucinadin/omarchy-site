import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { resolveLogoEffectFallbackColor } from "@/lib/effects/logo/color-bindings";
import { logoEffect as laserEtch } from "@/lib/effects/logo/definitions/laseretch";
import { logoEffect as wipe } from "@/lib/effects/logo/definitions/wipe";
import {
  createLogoEffectState,
  getLogoIdleOverride,
  getLogoPlaybackOverride,
  getLogoPresentationOverride,
  getLogoRevealEnabled,
  parseStoredLogoEffectState,
  resetLogo,
  resetLogoEffect,
  resolveActiveLogoEffect,
  selectLogoEffect,
  serializeLogoEffectState,
  setLogoEffectDraft,
  setLogoIdleOverride,
  setLogoPlaybackOverride,
  setLogoPresentationOverride,
  setLogoRevealEnabled,
  type LogoEffectPlaybackOverride,
  type LogoEffectPresentationOverride,
} from "@/lib/effects/logo/effect-state";

const REPEAT_PLAYBACK = {
  ambientRate: 1.25,
  mode: "repeat",
  repeatDelayMotion: "settled",
  repeatDelayMs: 1_250,
  revealRate: 1.75,
} as const satisfies LogoEffectPlaybackOverride;

const LASER_PRESENTATION = {
  contrast: 1.2,
  glow: 0.45,
  grayscale: 0.25,
  pixelSize: 0.82,
  saturation: 1.4,
  scanlines: 0.3,
} satisfies LogoEffectPresentationOverride;

describe("logo effect state", () => {
  test("isolates idle and reveal overrides by logo preset", () => {
    let document = createLogoEffectState("laseretch", 42);
    document = setLogoIdleOverride(document, {
      animateGradient: true,
      gradientAngle: 137,
      gradientDirection: "custom",
      motion: "jitter",
    });
    document = setLogoRevealEnabled(document, false);
    document = selectLogoEffect(document, "wipe");

    assert.equal(getLogoIdleOverride(document), undefined);
    assert.equal(getLogoRevealEnabled(document), true);
    document = setLogoIdleOverride(document, { enabled: false, speed: 1.4 });

    const restored = parseStoredLogoEffectState(JSON.parse(serializeLogoEffectState(document)));
    assert.ok(restored);
    assert.deepEqual(getLogoIdleOverride(restored, "laseretch"), {
      animateGradient: true,
      gradientAngle: 137,
      gradientDirection: "custom",
      motion: "jitter",
    });
    assert.equal(getLogoRevealEnabled(restored, "laseretch"), false);
    assert.deepEqual(getLogoIdleOverride(restored, "wipe"), { enabled: false, speed: 1.4 });
    assert.equal(getLogoRevealEnabled(restored, "wipe"), true);
  });

  test("isolates playback and presentation overrides by logo preset", () => {
    let document = createLogoEffectState("laseretch", 42);
    document = setLogoPlaybackOverride(document, REPEAT_PLAYBACK);
    document = setLogoPresentationOverride(document, LASER_PRESENTATION);

    const resolvedLaser = resolveActiveLogoEffect(
      document,
      laserEtch,
      resolveLogoEffectFallbackColor
    );
    assert.equal(resolvedLaser.prepared.playback.mode, "repeat");
    assert.equal(resolvedLaser.prepared.playback.revealRate, 1.75);
    assert.equal(resolvedLaser.prepared.presentation.contrast, 1.2);
    assert.equal(resolvedLaser.prepared.presentation.glow, 0.45);
    assert.equal(resolvedLaser.prepared.presentation.grayscale, 0.25);
    assert.equal(resolvedLaser.prepared.presentation.saturation, 1.4);

    document = selectLogoEffect(document, "wipe");
    const resolvedWipe = resolveActiveLogoEffect(document, wipe, resolveLogoEffectFallbackColor);
    assert.deepEqual(resolvedWipe.prepared.playback, wipe.defaults.playback);
    assert.deepEqual(resolvedWipe.prepared.presentation, wipe.defaults.presentation);

    document = setLogoPlaybackOverride(document, { mode: "once", revealRate: 0.7 });
    document = setLogoPresentationOverride(document, { glow: 0.8 });

    const restored = parseStoredLogoEffectState(JSON.parse(serializeLogoEffectState(document)));
    assert.ok(restored);
    assert.deepEqual(getLogoPlaybackOverride(restored, "wipe"), {
      mode: "once",
      revealRate: 0.7,
    });
    assert.deepEqual(getLogoPresentationOverride(restored, "wipe"), { glow: 0.8 });
    assert.deepEqual(getLogoPlaybackOverride(restored, "laseretch"), REPEAT_PLAYBACK);
    assert.deepEqual(getLogoPresentationOverride(restored, "laseretch"), LASER_PRESENTATION);

    document = selectLogoEffect(restored, "laseretch");
    assert.deepEqual(getLogoPlaybackOverride(document), REPEAT_PLAYBACK);
    assert.deepEqual(getLogoPresentationOverride(document), LASER_PRESENTATION);
  });

  test("resetting the current preset preserves other presets", () => {
    let document = createLogoEffectState("laseretch", 42);
    document = setLogoPlaybackOverride(document, REPEAT_PLAYBACK);
    document = setLogoPresentationOverride(document, LASER_PRESENTATION);
    document = setLogoEffectDraft(document, {
      values: { behavior: { simulationFrames: 4 } },
    });
    document = selectLogoEffect(document, "wipe");
    document = setLogoPlaybackOverride(document, { mode: "once", revealRate: 0.7 });
    document = setLogoPresentationOverride(document, { glow: 0.8 });

    document = selectLogoEffect(document, "laseretch");
    document = resetLogoEffect(document);

    assert.equal(getLogoPlaybackOverride(document, "laseretch"), undefined);
    assert.equal(getLogoPresentationOverride(document, "laseretch"), undefined);
    assert.deepEqual(getLogoPlaybackOverride(document, "wipe"), {
      mode: "once",
      revealRate: 0.7,
    });
    assert.deepEqual(getLogoPresentationOverride(document, "wipe"), { glow: 0.8 });

    const stored = JSON.parse(serializeLogoEffectState(document));
    assert.equal(stored.effects.laseretch, undefined);
  });

  test("resetting Logo clears every preset override", () => {
    let document = createLogoEffectState("laseretch", 42);
    document = setLogoPlaybackOverride(document, REPEAT_PLAYBACK);
    document = setLogoPresentationOverride(document, LASER_PRESENTATION);
    document = setLogoIdleOverride(document, { enabled: false, speed: 1.4 });
    document = setLogoRevealEnabled(document, false);
    document = selectLogoEffect(document, "wipe");
    document = setLogoPlaybackOverride(document, { mode: "once", revealRate: 0.7 });
    document = setLogoPresentationOverride(document, { grayscale: 0.8 });

    const reset = resetLogo(document, "laseretch", 0x0a4c_4f47);

    assert.equal(reset.activeEffectId, "laseretch");
    assert.equal(reset.preview.seed, 0x0a4c_4f47);
    assert.equal(reset.effects, undefined);
  });
});
