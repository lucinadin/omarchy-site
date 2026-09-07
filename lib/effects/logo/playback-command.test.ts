import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  requestLogoEffectReplay,
  subscribeLogoEffectReplay,
} from "@/lib/effects/logo/playback-command";

describe("logo effect replay command", () => {
  test("replays only the currently subscribed placement", (context) => {
    let primaryReplays = 0;
    let secondaryReplays = 0;
    const unsubscribePrimary = subscribeLogoEffectReplay("primary", () => {
      primaryReplays += 1;
    });
    const unsubscribeSecondary = subscribeLogoEffectReplay("secondary", () => {
      secondaryReplays += 1;
    });
    context.after(unsubscribePrimary);
    context.after(unsubscribeSecondary);

    requestLogoEffectReplay("primary");

    assert.equal(primaryReplays, 1);
    assert.equal(secondaryReplays, 0);
  });

  test("does not deliver a replay after unsubscribe", () => {
    let replays = 0;
    const unsubscribe = subscribeLogoEffectReplay("primary", () => {
      replays += 1;
    });
    unsubscribe();

    requestLogoEffectReplay();

    assert.equal(replays, 0);
  });
});
