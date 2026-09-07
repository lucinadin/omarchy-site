import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { getLogoCapabilityBootstrapScript } from "@/lib/effects/logo/capability-bootstrap";
import { LOGO_BOOT_STORAGE_KEYS, LOGO_EFFECT_STORAGE_KEYS } from "@/lib/effects/logo/lifecycle";
import { LOGO_PREVIEW_MAX_LENGTH } from "@/lib/effects/logo/preview";

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
  theme?: string;
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
  theme = "tokyo-night",
}: BootstrapOptions = {}) {
  const styles = new Map<string, string>();
  const dataset: BootstrapMark["dataset"] = { theme };
  const root = {
    dataset,
    style: {
      getPropertyValue: (property: string) => styles.get(property) ?? "",
      removeProperty: (property: string) => styles.delete(property),
      setProperty: (property: string, value: string) => styles.set(property, value),
    },
  };
  let decodeError: (() => void) | undefined;
  let watchdog: (() => void) | undefined;
  let watchdogDelay: number | undefined;
  const previewImages: { src: string }[] = [];
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
      Image: class extends EventTarget {
        src = "";
        constructor() {
          super();
          previewImages.push(this);
          decodeError = () => this.dispatchEvent(new Event("error"));
        }
      },
      localStorage,
      matchMedia: (query: string) => {
        assert.equal(query, "(prefers-reduced-motion: reduce)");
        return { matches: prefersReducedMotion };
      },
      setTimeout(callback: () => void, delay: number) {
        watchdog = callback;
        watchdogDelay = delay;
      },
    }
  );
  return {
    root,
    styles,
    previewSources: previewImages.map((image) => image.src),
    watchdogDelay,
    failPreviewDecode: () => decodeError?.(),
    runWatchdog: () => watchdog?.(),
    watchdogSelector: () => watchdogSelector,
  };
}

describe("logo capability bootstrap", () => {
  test("restores a matching preview before the renderer starts", () => {
    const state = '{"activeEffectId":"wipe","preview":{"seed":1}}';
    const image = "data:image/png;base64,iVBORw0KGgo=";
    const local = createStorage({
      [LOGO_EFFECT_STORAGE_KEYS.state]: state,
      [LOGO_EFFECT_STORAGE_KEYS.preview]: JSON.stringify({
        image,
        state,
        theme: "tokyo-night",
        version: 1,
      }),
    });
    const { root, styles, previewSources } = runBootstrap({ gpu: {}, localStorage: local.storage });
    assert.deepEqual(previewSources, [image]);
    assert.equal(styles.get("--logo-preview"), `url("${image}")`);
    assert.equal(styles.get("--logo-preview-fill"), "transparent");
    assert.equal(root.dataset.logoReveal, "consumed");
  });

  test("ignores stale, oversized, and invalid preview data without hiding the fallback", () => {
    const state = '{"activeEffectId":"wipe","preview":{"seed":1}}';
    const preview = {
      image: "data:image/png;base64,iVBORw0KGgo=",
      state,
      theme: "tokyo-night",
      version: 1,
    };
    const invalidPreviews = [
      "{corrupt",
      "null",
      JSON.stringify({ ...preview, version: 2 }),
      JSON.stringify({ ...preview, theme: "osaka-jade" }),
      JSON.stringify({ ...preview, state: "{}" }),
      JSON.stringify({ ...preview, state: null }),
      JSON.stringify({ ...preview, image: "https://example.com/logo.png" }),
      JSON.stringify({ ...preview, image: 'data:image/png;base64,");url(https://example.com)' }),
      JSON.stringify({
        ...preview,
        image: `data:image/png;base64,${"A".repeat(LOGO_PREVIEW_MAX_LENGTH)}`,
      }),
    ];
    for (const invalid of invalidPreviews) {
      const local = createStorage({
        [LOGO_EFFECT_STORAGE_KEYS.state]: state,
        [LOGO_EFFECT_STORAGE_KEYS.preview]: invalid,
      });
      const { styles } = runBootstrap({ gpu: {}, localStorage: local.storage });
      assert.equal(styles.size, 0);
    }
  });

  test("restores the SVG fallback when a cached PNG cannot be decoded", () => {
    const state = "{}";
    const local = createStorage({
      [LOGO_EFFECT_STORAGE_KEYS.state]: state,
      [LOGO_EFFECT_STORAGE_KEYS.preview]: JSON.stringify({
        image: "data:image/png;base64,iVBORw0KGgo=",
        state,
        theme: "tokyo-night",
        version: 1,
      }),
    });
    const { styles, failPreviewDecode } = runBootstrap({ localStorage: local.storage });
    assert.equal(styles.get("--logo-preview-fill"), "transparent");
    failPreviewDecode();
    assert.equal(styles.size, 0);
  });

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

  test("the watchdog schedules recovery at three seconds and queries pending non-live marks", () => {
    const mark: BootstrapMark = {
      dataset: { effectStartMode: "reveal", logoInitialReveal: "pending" },
    };
    const { root, runWatchdog, watchdogSelector, watchdogDelay } = runBootstrap({
      gpu: {},
      marks: [mark],
    });
    assert.equal(root.dataset.logoReveal, "pending");
    assert.equal(mark.dataset.effectStartMode, "reveal");
    assert.equal(watchdogDelay, 3_000);

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
