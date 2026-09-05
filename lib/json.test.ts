import assert from "node:assert/strict";
import { test } from "node:test";

import { parseJsonObject } from "@/lib/json";

test("accepts nested JSON objects without copying them", () => {
  const value = { theme: "tokyo-night", values: [1, true, null, { enabled: false }] };
  assert.equal(parseJsonObject(value), value);
});

test("rejects non-JSON objects and values at every depth", () => {
  for (const value of [new Date(), new Map(), new Set(), /theme/u]) {
    assert.equal(parseJsonObject(value), null);
    assert.equal(parseJsonObject({ nested: [value] }), null);
  }
  for (const value of [undefined, Number.NaN, Infinity, 1n, Symbol("theme"), () => true]) {
    assert.equal(parseJsonObject({ value }), null);
  }
  for (const value of [null, false, 1, "theme", []]) {
    assert.equal(parseJsonObject(value), null);
  }
});

test("rejects object and array cycles without overflowing the stack", () => {
  const objectCycle = {};
  Object.assign(objectCycle, { self: objectCycle });
  assert.equal(parseJsonObject(objectCycle), null);

  const arrayCycle: unknown[] = [];
  arrayCycle.push(arrayCycle);
  assert.equal(parseJsonObject({ arrayCycle }), null);
});

test("allows a shared child when it does not form a cycle", () => {
  const child = { enabled: true };
  const value = { first: child, second: child };
  assert.equal(parseJsonObject(value), value);
});

test("accepts dictionaries without a prototype", () => {
  const value = { __proto__: null, enabled: true };
  assert.equal(parseJsonObject(value), value);
});
