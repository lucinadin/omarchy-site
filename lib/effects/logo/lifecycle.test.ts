import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  claimInitialLogoEffectStartMode,
  consumeInitialLogoReveal,
  logoFrameCanGoLive,
  parseLogoBootMode,
  parseLogoRevealState,
  resolveLogoEffectPlaybackStartMode,
  resolveInitialLogoEffectStartMode,
  type LogoInitialPlaybackClaim,
} from "@/lib/effects/logo/lifecycle";

describe("logo boot lifecycle", () => {
  test("parses boot markers and defaults unknown values safely", () => {
    assert.equal(parseLogoBootMode("fresh"), "fresh");
    assert.equal(parseLogoBootMode("restore"), "restore");
    assert.equal(parseLogoBootMode("unknown"), "unknown");
    assert.equal(parseLogoBootMode(), "unknown");
    assert.equal(parseLogoBootMode("unexpected"), "unknown");
  });

  test("lets only the first primary surface reveal on a fresh pending boot", () => {
    const claim: LogoInitialPlaybackClaim = { primaryClaimed: false };
    assert.equal(
      claimInitialLogoEffectStartMode(claim, {
        bootMode: "fresh",
        playbackKey: "secondary",
        prefersReducedMotion: false,
        revealState: "pending",
      }),
      "settled"
    );
    assert.equal(claim.primaryClaimed, false);

    assert.equal(
      claimInitialLogoEffectStartMode(claim, {
        bootMode: "fresh",
        playbackKey: "primary",
        prefersReducedMotion: false,
        revealState: "pending",
      }),
      "reveal"
    );
    assert.equal(
      claimInitialLogoEffectStartMode(claim, {
        bootMode: "fresh",
        playbackKey: "primary",
        prefersReducedMotion: false,
        revealState: "pending",
      }),
      "settled"
    );
  });

  test("settles restored, unknown, reduced-motion, and consumed primary surfaces", () => {
    for (const input of [
      {
        bootMode: "restore" as const,
        prefersReducedMotion: false,
        revealState: "pending" as const,
      },
      {
        bootMode: "unknown" as const,
        prefersReducedMotion: false,
        revealState: "pending" as const,
      },
      {
        bootMode: "fresh" as const,
        prefersReducedMotion: true,
        revealState: "pending" as const,
      },
      {
        bootMode: "fresh" as const,
        prefersReducedMotion: false,
        revealState: "consumed" as const,
      },
    ]) {
      assert.equal(
        claimInitialLogoEffectStartMode(
          { primaryClaimed: false },
          { ...input, playbackKey: "primary" }
        ),
        "settled"
      );
    }
  });

  test("consumes fresh state only for the primary surface", () => {
    const dataset = { logoReveal: "pending" };
    consumeInitialLogoReveal(dataset, "secondary");
    assert.equal(dataset.logoReveal, "pending");
    consumeInitialLogoReveal(dataset, "primary");
    assert.equal(dataset.logoReveal, "consumed");
    assert.equal(parseLogoRevealState("pending"), "pending");
    assert.equal(parseLogoRevealState(), "consumed");
  });

  test("distinguishes the one-time reveal from deliberate preset and seed changes", () => {
    assert.equal(resolveInitialLogoEffectStartMode("reveal", false), "reveal");
    assert.equal(resolveInitialLogoEffectStartMode("reveal", true), "settled");
    assert.equal(
      resolveLogoEffectPlaybackStartMode({
        fallbackWasExposed: false,
        initialStartMode: "reveal",
        nextEffectId: "laseretch",
        nextSeed: 1,
        prefersReducedMotion: false,
        previousPlayback: null,
      }),
      "reveal"
    );
    assert.equal(
      resolveLogoEffectPlaybackStartMode({
        fallbackWasExposed: true,
        initialStartMode: "reveal",
        nextEffectId: "laseretch",
        nextSeed: 1,
        prefersReducedMotion: false,
        previousPlayback: null,
      }),
      "settled"
    );

    const previousPlayback = { effectId: "laseretch", seed: 1 };
    assert.equal(
      resolveLogoEffectPlaybackStartMode({
        fallbackWasExposed: false,
        initialStartMode: "settled",
        nextEffectId: "rain",
        nextSeed: 1,
        prefersReducedMotion: false,
        previousPlayback,
        revealEnabled: false,
      }),
      "settled"
    );
    assert.equal(
      resolveLogoEffectPlaybackStartMode({
        fallbackWasExposed: false,
        initialStartMode: "settled",
        nextEffectId: "laseretch",
        nextSeed: 1,
        prefersReducedMotion: false,
        previousPlayback,
      }),
      "settled"
    );
    assert.equal(
      resolveLogoEffectPlaybackStartMode({
        fallbackWasExposed: true,
        initialStartMode: "settled",
        nextEffectId: "rain",
        nextSeed: 1,
        prefersReducedMotion: false,
        previousPlayback,
      }),
      "reveal"
    );
    assert.equal(
      resolveLogoEffectPlaybackStartMode({
        fallbackWasExposed: false,
        initialStartMode: "settled",
        nextEffectId: "laseretch",
        nextSeed: 2,
        prefersReducedMotion: false,
        previousPlayback,
      }),
      "reveal"
    );
    assert.equal(
      resolveLogoEffectPlaybackStartMode({
        fallbackWasExposed: false,
        initialStartMode: "settled",
        nextEffectId: "rain",
        nextSeed: 1,
        prefersReducedMotion: true,
        previousPlayback,
      }),
      "settled"
    );
  });

  test("requires visible instances before replacing the static fallback", () => {
    assert.equal(logoFrameCanGoLive(0), false);
    assert.equal(logoFrameCanGoLive(1), true);
  });
});
