import assert from "node:assert/strict";
import { test } from "node:test";

import { storageGet, storageRemove, storageSet, storageSetJson } from "./storage";

function blocked() {
  throw new DOMException("Storage blocked", "SecurityError");
}

test("storage access and operation failures are contained", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    for (const replacement of [
      { get: blocked },
      { value: { getItem: blocked, setItem: blocked, removeItem: blocked } },
      { value: undefined },
    ]) {
      Object.defineProperty(globalThis, "localStorage", { configurable: true, ...replacement });
      assert.equal(storageGet("preference"), null);
      assert.doesNotThrow(() => storageSet("preference", "value"));
      assert.doesNotThrow(() => storageSetJson("preference", { enabled: true }));
      assert.doesNotThrow(() => storageRemove("preference"));
    }
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("storage reads, writes JSON and removes only the requested key", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const saved = new Map([
    ["existing", "saved value"],
    ["other", "keep"],
  ]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
      removeItem: (key: string) => saved.delete(key),
    },
  });
  try {
    assert.equal(storageGet("existing"), "saved value");
    assert.equal(storageGet("missing"), null);
    storageSet("existing", "replacement");
    assert.equal(saved.get("existing"), "replacement");
    storageSetJson("settings", { enabled: true, count: 3 });
    assert.equal(saved.get("settings"), '{"enabled":true,"count":3}');
    storageRemove("existing");
    assert.equal(saved.has("existing"), false);
    assert.equal(saved.get("other"), "keep");
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
