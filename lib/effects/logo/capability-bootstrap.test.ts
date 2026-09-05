import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { getLogoCapabilityBootstrapScript } from "@/lib/effects/logo/capability-bootstrap";
import { LOGO_BOOT_STORAGE_KEYS, LOGO_EFFECT_STORAGE_KEYS } from "@/lib/effects/logo/lifecycle";

type BootstrapMark = { dataset: Record<string, string> };

type BootstrapStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

type BootstrapOptions = {
  gpu?: unknown;
  localStorage?: BootstrapStorage;
  marks?: BootstrapMark[];
  prefersReducedMotion?: boolean;
};

function createStorage(entries: Record<string, string> = {}) {
  const values = new Map(Object.entries(entries));
  const storage: BootstrapStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  return { get: (key: string) => values.get(key) ?? null, storage };
}

function runBootstrap({
  gpu,
  localStorage = createStorage().storage,
  marks = [],
  prefersReducedMotion = false,
}: BootstrapOptions = {}) {
  const root: BootstrapMark = { dataset: {} };
  let watchdog: (() => void) | undefined;
  let watchdogSelector: string | undefined;
  // The production value is an inline bootstrap string; executing that string is the behavior under test.
  // oxlint-disable-next-line no-new-func
  const execute = new Function(
    "document",
    "navigator",
    "window",
    getLogoCapabilityBootstrapScript()
  );
  execute(
    {
      documentElement: root,
      querySelectorAll(selector: string) {
        watchdogSelector = selector;
        return marks;
      },
    },
    { gpu },
    {
      localStorage,
      matchMedia: () => ({ matches: prefersReducedMotion }),
      setTimeout(callback: () => void) {
        watchdog = callback;
      },
    }
  );
  return {
    root,
    runWatchdog: () => watchdog?.(),
    watchdogSelector: () => watchdogSelector,
  };
}

describe("logo capability bootstrap", () => {
  test("persists the seen marker synchronously and restores on the next document", () => {
    const local = createStorage();

    const first = runBootstrap({
      gpu: {},
      localStorage: local.storage,
    });
    assert.equal(first.root.dataset.logoBoot, "fresh");
    assert.equal(first.root.dataset.logoReveal, "pending");
    assert.equal(local.get(LOGO_EFFECT_STORAGE_KEYS.seen), "1");

    const second = runBootstrap({
      gpu: {},
      localStorage: local.storage,
    });
    assert.equal(second.root.dataset.logoBoot, "restore");
    assert.equal(second.root.dataset.logoReveal, "consumed");
  });

  test("treats every current raw logo key as restore, including corrupt state", () => {
    for (const storedKey of LOGO_BOOT_STORAGE_KEYS) {
      const local = createStorage({ [storedKey]: "{corrupt" });
      const { root } = runBootstrap({ localStorage: local.storage });
      assert.equal(root.dataset.logoBoot, "restore", storedKey);
      assert.equal(local.get(LOGO_EFFECT_STORAGE_KEYS.seen), "1", storedKey);
    }
  });

  test("fails visible when the first seen-marker write is unavailable", () => {
    const storage: BootstrapStorage = {
      getItem: () => null,
      setItem() {
        throw new DOMException("Storage is disabled", "SecurityError");
      },
    };
    const { root } = runBootstrap({ gpu: {}, localStorage: storage });
    assert.equal(root.dataset.logoBoot, "unknown");
    assert.equal(root.dataset.logoReveal, "consumed");
  });

  test("classifies a storage read exception as unknown", () => {
    const storage: BootstrapStorage = {
      getItem() {
        throw new DOMException("Storage is disabled", "SecurityError");
      },
      setItem() {},
    };
    const { root } = runBootstrap({ gpu: {}, localStorage: storage });
    assert.equal(root.dataset.logoBoot, "unknown");
    assert.equal(root.dataset.logoReveal, "consumed");
  });

  test("fails visible for reduced motion and browsers without WebGPU", () => {
    const reduced = runBootstrap({ gpu: {}, prefersReducedMotion: true }).root;
    assert.equal(reduced.dataset.logoBoot, "fresh");
    assert.equal(reduced.dataset.logoMotion, "reduce");
    assert.equal(reduced.dataset.logoReveal, "consumed");

    const unsupported = runBootstrap().root;
    assert.equal(unsupported.dataset.logoGpu, "unavailable");
    assert.equal(unsupported.dataset.logoReveal, "consumed");
  });

  test("the watchdog consumes fresh state and settles only the initial reveal host", () => {
    const mark: BootstrapMark = {
      dataset: { effectStartMode: "reveal", logoInitialReveal: "pending" },
    };
    const { root, runWatchdog, watchdogSelector } = runBootstrap({ gpu: {}, marks: [mark] });
    assert.equal(root.dataset.logoReveal, "pending");

    runWatchdog();

    assert.equal(root.dataset.logoReveal, "consumed");
    assert.equal(mark.dataset.effectStartMode, "settled");
    assert.equal(mark.dataset.renderer, "timeout");
    assert.equal(
      watchdogSelector(),
      '.omarchy-effects-mark[data-logo-initial-reveal="pending"]:not([data-live="true"])'
    );
  });

  test("the watchdog consumes fresh state even before a surface exists", () => {
    const { root, runWatchdog } = runBootstrap({ gpu: {} });
    runWatchdog();
    assert.equal(root.dataset.logoReveal, "consumed");
  });
});
