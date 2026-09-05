import assert from "node:assert/strict";
import { test } from "node:test";

import { storageGet, storageRemove, storageSet, storageSetJson } from "./storage";

function blocked() {
  throw new DOMException("Storage blocked", "SecurityError");
}

test("storage access and operation failures leave in-memory features usable", () => {
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
