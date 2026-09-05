import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseRenderQualityPreference, summarizeRenderQuality } from "./quality-preference";

describe("render quality preference", () => {
  test("accepts only supported saved preferences", () => {
    assert.equal(parseRenderQualityPreference("auto"), "auto");
    assert.equal(parseRenderQualityPreference("high"), "high");
    assert.equal(parseRenderQualityPreference("low"), "low");
    assert.equal(parseRenderQualityPreference("maximum"), null);
    assert.equal(parseRenderQualityPreference(null), null);
  });

  test("summarizes the tiers used by active renderers", () => {
    assert.equal(summarizeRenderQuality([]), null);
    assert.equal(summarizeRenderQuality(["high", "high"]), "high");
    assert.equal(summarizeRenderQuality(["low", "low"]), "low");
    assert.equal(summarizeRenderQuality(["high", "low"]), "mixed");
  });
});
