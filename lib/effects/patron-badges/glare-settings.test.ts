import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  defaultPatronBadgeGlareSettings,
  parsePatronBadgeGlareSettings,
} from "@/lib/effects/patron-badges/glare-settings";

describe("patron badge glare settings", () => {
  test("uses the authored defaults when storage is absent or malformed", () => {
    assert.deepEqual(parsePatronBadgeGlareSettings(null), defaultPatronBadgeGlareSettings);
    assert.deepEqual(parsePatronBadgeGlareSettings("not-json"), defaultPatronBadgeGlareSettings);
  });

  test("migrates existing saved controls while supplying the new texture defaults", () => {
    assert.deepEqual(
      parsePatronBadgeGlareSettings(
        JSON.stringify({
          bandWidth: 9,
          color: 0.35,
          foilTexture: -1,
          glareIntensity: 1.45,
          maskMode: "surface",
          accentBrightness: 0.24,
          accentSoftness: 0.31,
          accentThreshold: 0.27,
          tiltDegrees: 12,
        })
      ),
      {
        ...defaultPatronBadgeGlareSettings,
        bandWidth: 2,
        color: 0.35,
        foilTexture: 0,
        glareIntensity: 1.45,
        maskMode: "texture",
        textureBrightness: 0.24,
        textureSoftness: 0.31,
        textureThreshold: 0.27,
        tiltDegrees: 8,
      }
    );
  });

  test("preserves mask and debug choices while clamping the optical controls", () => {
    assert.deepEqual(
      parsePatronBadgeGlareSettings(
        JSON.stringify({
          debugView: "normals",
          edgeStrength: -1,
          edgeWidth: 18,
          grooveAngle: 270,
          grooveDensity: 2,
          lightHeight: 0,
          lightRadius: 2,
          maskMode: "texture",
          rainbowDensity: 40,
          relief: 9,
          roughness: 0,
          sparkleDensity: 300,
          sparkleStrength: 4,
          surfaceStrength: 3,
          textureBrightness: 2,
          textureSoftness: 0,
          textureThreshold: -1,
        })
      ),
      {
        ...defaultPatronBadgeGlareSettings,
        debugView: "normals",
        edgeStrength: 0,
        edgeWidth: 12,
        grooveAngle: 180,
        grooveDensity: 4,
        lightHeight: 0.08,
        lightRadius: 1,
        maskMode: "texture",
        rainbowDensity: 24,
        relief: 3,
        roughness: 0.05,
        sparkleDensity: 160,
        sparkleStrength: 2,
        surfaceStrength: 2,
        textureBrightness: 0.8,
        textureSoftness: 0.05,
        textureThreshold: 0,
      }
    );
  });

  test("migrates legacy edge modes and falls back safely for unknown values", () => {
    assert.equal(
      parsePatronBadgeGlareSettings(JSON.stringify({ maskMode: "edge" })).maskMode,
      "texture-and-edges"
    );
    assert.equal(
      parsePatronBadgeGlareSettings(JSON.stringify({ maskMode: "both" })).maskMode,
      "texture-and-edges"
    );
    assert.equal(
      parsePatronBadgeGlareSettings(JSON.stringify({ maskMode: "glitter" })).maskMode,
      "texture-and-edges"
    );
    assert.equal(
      parsePatronBadgeGlareSettings(JSON.stringify({ debugView: "heatmap" })).debugView,
      "final"
    );
  });
});
