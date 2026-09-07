import assert from "node:assert/strict";
import { test } from "node:test";

import { createLogoDistanceField } from "@/lib/effects/experiment/logo-field";
import {
  defaultExperimentSettings,
  experimentControls,
  parseExperimentSettings,
} from "@/lib/effects/experiment/settings";

test("Experiment settings retain defaults and constrain every control", () => {
  for (const input of [null, "", "bad json", "null", "[]"]) {
    assert.deepEqual(parseExperimentSettings(input), defaultExperimentSettings);
  }
  for (const control of experimentControls) {
    assert.ok(defaultExperimentSettings[control.key] >= control.minimum);
    assert.ok(defaultExperimentSettings[control.key] <= control.maximum);
    assert.equal(
      parseExperimentSettings(JSON.stringify({ [control.key]: -999 }))[control.key],
      control.minimum
    );
    assert.equal(
      parseExperimentSettings(JSON.stringify({ [control.key]: 999 }))[control.key],
      control.maximum
    );
    assert.equal(
      parseExperimentSettings(JSON.stringify({ [control.key]: "invalid" }))[control.key],
      defaultExperimentSettings[control.key]
    );
  }
  assert.equal(parseExperimentSettings('{"speed":0}').speed, 0);
  assert.equal(parseExperimentSettings('{"opacity":0}').opacity, 0);
});

test("Experiment shape selection survives storage and older settings default to Logo", () => {
  assert.equal(parseExperimentSettings('{"mode":"orb"}').mode, "orb");
  assert.equal(parseExperimentSettings('{"mode":"logo"}').mode, "logo");
  for (const mode of ["unknown", null, 1, {}, []]) {
    assert.equal(parseExperimentSettings(JSON.stringify({ mode })).mode, "logo");
  }
  const previous = parseExperimentSettings('{"speed":0.5,"scale":1.2}');
  assert.equal(previous.mode, "logo");
  assert.equal(previous.wobble, defaultExperimentSettings.wobble);
  assert.equal(previous.speed, 0.5);
  assert.equal(previous.scale, 1.2);
  const orb = { ...defaultExperimentSettings, mode: "orb", wobble: 0.8 };
  assert.deepEqual(parseExperimentSettings(JSON.stringify(orb)), orb);
});

test("Removed logo geometry settings are discarded from saved Experiment preferences", () => {
  assert.deepEqual(
    parseExperimentSettings('{"thickness":0.5,"bevel":0.06,"twist":2}'),
    defaultExperimentSettings
  );
});

test("SVG distance field preserves solid areas, holes and exterior", () => {
  const size = 9;
  const mask = new Uint8Array(size * size);
  for (let y = 2; y <= 6; y += 1) {
    for (let x = 2; x <= 6; x += 1) mask[y * size + x] = 1;
  }
  mask[4 * size + 4] = 0;
  const field = createLogoDistanceField(mask, size);
  assert.ok(field[0] > 0);
  assert.ok(field[2 * size + 2] < 0);
  assert.ok(field[4 * size + 4] > 0);
  assert.equal(field[2 * size + 3], field[6 * size + 3]);
  assert.ok(field.every(Number.isFinite));
  assert.throws(() => createLogoDistanceField(new Uint8Array(2), 9));
  assert.ok(createLogoDistanceField(new Uint8Array(81), 9).every((value) => value > 0));
});

test("distance field encodes distance magnitude, not just inside/outside signs", () => {
  // A vertical half-plane on a five-cell-wide, 2.4-unit surface: each cell is 0.48 units.
  const mask = Uint8Array.from([
    0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1,
  ]);
  const field = createLogoDistanceField(mask, 5);
  const expectedRow = [0.96, 0.48, -0.48, -0.96, -1.44];
  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 5; x += 1) {
      assert.ok(Math.abs(field[y * 5 + x] - expectedRow[x]) < 1e-6, `distance at ${x},${y}`);
    }
  }
});
