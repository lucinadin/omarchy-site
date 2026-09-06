import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { defaultThemeId, omarchyThemes } from "@/lib/themes/official";
import { getThemeBootstrapScript } from "@/lib/themes/theme-bootstrap";
import { themePreferenceKey } from "@/lib/themes/theme-constants";
import {
  getNextTheme,
  getSavedTheme,
  getThemePreferenceEventDetail,
  isThemeCycleShortcut,
  isThemePreferenceStorageEvent,
  persistThemePreference,
  runThemeViewTransition,
  themePreferenceEvent,
} from "@/lib/themes/theme-runtime";
import { getThemeStyle, type OmarchyTheme } from "@/lib/themes/themes";

function createStorageArea(): Storage {
  return {
    clear() {},
    getItem() {
      return null;
    },
    key() {
      return null;
    },
    length: 0,
    removeItem() {},
    setItem() {},
  };
}

describe("theme runtime controls", () => {
  test("cycles in catalog order and wraps at the end", () => {
    const defaultIndex = omarchyThemes.findIndex((theme) => theme.id === defaultThemeId);
    const lastTheme = omarchyThemes.at(-1);

    assert.ok(lastTheme);
    assert.equal(getNextTheme(defaultThemeId), omarchyThemes[defaultIndex + 1]);
    assert.equal(getNextTheme(lastTheme.id), omarchyThemes[0]);
  });

  test("recognizes only an unhandled, non-repeating Hyper+T chord", () => {
    const shortcut = {
      altKey: false,
      code: "KeyT",
      ctrlKey: true,
      defaultPrevented: false,
      metaKey: true,
      repeat: false,
      shiftKey: true,
    };

    assert.equal(isThemeCycleShortcut(shortcut), true);
    assert.equal(isThemeCycleShortcut({ ...shortcut, defaultPrevented: true }), false);
    assert.equal(isThemeCycleShortcut({ ...shortcut, repeat: true }), false);
    assert.equal(isThemeCycleShortcut({ ...shortcut, altKey: true }), false);
    assert.equal(isThemeCycleShortcut({ ...shortcut, ctrlKey: false }), false);
    assert.equal(isThemeCycleShortcut({ ...shortcut, metaKey: false }), false);
    assert.equal(isThemeCycleShortcut({ ...shortcut, shiftKey: false }), false);
    assert.equal(isThemeCycleShortcut({ ...shortcut, code: "KeyY" }), false);
  });

  test("accepts storage synchronization only for the theme key and local storage area", () => {
    const localStorageArea = createStorageArea();
    const otherStorageArea = createStorageArea();

    assert.equal(
      isThemePreferenceStorageEvent(
        { key: themePreferenceKey, storageArea: localStorageArea },
        localStorageArea
      ),
      true
    );
    assert.equal(
      isThemePreferenceStorageEvent({ key: null, storageArea: localStorageArea }, localStorageArea),
      false
    );
    assert.equal(
      isThemePreferenceStorageEvent(
        { key: "unrelated-setting", storageArea: localStorageArea },
        localStorageArea
      ),
      false
    );
    assert.equal(
      isThemePreferenceStorageEvent(
        { key: themePreferenceKey, storageArea: otherStorageArea },
        localStorageArea
      ),
      false
    );
  });

  test("validates semantic apply and revert event types", () => {
    const detail = getThemePreferenceEventDetail(
      new CustomEvent(themePreferenceEvent, {
        detail: {
          origin: { x: 24, y: 48 },
          themeId: defaultThemeId,
          transitionType: "theme-revert",
        },
      })
    );

    assert.deepEqual(detail, {
      origin: { x: 24, y: 48 },
      themeId: defaultThemeId,
      transitionType: "theme-revert",
    });
    assert.equal(
      getThemePreferenceEventDetail(
        new CustomEvent(themePreferenceEvent, {
          detail: { themeId: defaultThemeId, transitionType: "theme-change" },
        })
      ),
      null
    );
  });

  test("keeps theme updates live when local storage rejects writes", () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          setItem() {
            throw new Error("storage unavailable");
          },
        },
      },
    });

    try {
      assert.doesNotThrow(() => persistThemePreference(omarchyThemes[0]));
    } finally {
      if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
      else Reflect.deleteProperty(globalThis, "window");
    }
  });

  test("persists and restores one validated community theme snapshot", () => {
    const background = "#102030";
    const theme: OmarchyTheme = {
      colors: { ...omarchyThemes[0].colors, background },
      id: "community:runtime-test",
      kind: "community",
      mode: "dark",
      name: "Runtime Test",
      wallpaper: `linear-gradient(${background}, ${background})`,
    };
    const savedValues: string[] = [];
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem(key: string) {
            return key === themePreferenceKey ? (savedValues.at(-1) ?? null) : null;
          },
          setItem(key: string, value: string) {
            assert.equal(key, themePreferenceKey);
            savedValues.push(value);
          },
        },
      },
    });

    try {
      persistThemePreference(theme);
      assert.ok(savedValues[0]?.startsWith("{"));
      assert.deepEqual(getSavedTheme(), theme);
    } finally {
      if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
      else Reflect.deleteProperty(globalThis, "window");
    }
  });

  test("bootstraps a saved community theme before hydration", () => {
    const background = "#203040";
    const theme: OmarchyTheme = {
      colors: { ...omarchyThemes[0].colors, background },
      id: "community:bootstrap-test",
      kind: "community",
      mode: "dark",
      name: "Bootstrap Test",
      wallpaper: `linear-gradient(${background}, ${background})`,
    };
    const savedTheme = JSON.stringify({
      styleValues: Object.values(getThemeStyle(theme)),
      theme,
      version: 1,
    });
    const properties = new Map<string, string>();
    const root = {
      dataset: { theme: "" },
      style: {
        colorScheme: "",
        setProperty(property: string, value: string) {
          properties.set(property, value);
        },
      },
    };
    const themeColor = {
      content: "",
      setAttribute(_name: string, value: string) {
        this.content = value;
      },
    };
    // The production value is an inline bootstrap string; executing that string is the behavior under test.
    // oxlint-disable-next-line no-new-func
    const bootstrap = new Function("window", "document", getThemeBootstrapScript());
    bootstrap(
      {
        localStorage: {
          getItem(key: string) {
            return key === themePreferenceKey ? savedTheme : null;
          },
        },
      },
      {
        documentElement: root,
        querySelector() {
          return themeColor;
        },
      }
    );

    assert.equal(root.dataset.theme, theme.id);
    assert.equal(root.style.colorScheme, theme.mode);
    assert.equal(properties.get("--desktop-wallpaper"), theme.wallpaper);
    assert.equal(themeColor.content, background);
  });

  test("preloads only the selected wallpaper on the homepage, with its blur placeholder", () => {
    const wallpapers = {
      "tokyo-night": {
        src: "/_next/static/media/tokyo.webp",
        blurDataURL: "data:image/webp;base64,default",
      },
      nord: { src: "/_next/static/media/nord.webp", blurDataURL: "data:image/webp;base64,saved" },
    };
    for (const { savedTheme, pathname, expected } of [
      { savedTheme: null, pathname: "/", expected: wallpapers["tokyo-night"] },
      { savedTheme: "nord", pathname: "/", expected: wallpapers.nord },
      { savedTheme: "nord", pathname: "/themes/", expected: null },
    ]) {
      const links: {
        as?: string;
        href?: string;
        rel?: string;
        type?: string;
        attributes: Map<string, string>;
      }[] = [];
      const properties = new Map<string, string>();
      // The production value is an inline bootstrap string; executing it is the behavior under test.
      // oxlint-disable-next-line no-new-func
      const bootstrap = new Function("window", "document", getThemeBootstrapScript(wallpapers));
      bootstrap(
        {
          localStorage: {
            getItem: (key: string) => (key === themePreferenceKey ? savedTheme : null),
          },
          location: { pathname },
        },
        {
          createElement(tagName: string) {
            assert.equal(tagName, "link");
            const link = {
              attributes: new Map<string, string>(),
              setAttribute(name: string, value: string) {
                this.attributes.set(name, value);
              },
            };
            links.push(link);
            return link;
          },
          documentElement: {
            dataset: { theme: "" },
            style: {
              colorScheme: "",
              setProperty: (name: string, value: string) => properties.set(name, value),
            },
          },
          head: { append() {} },
          querySelector() {
            return null;
          },
        }
      );
      assert.equal(links.length, expected ? 1 : 0);
      if (expected) {
        assert.equal(links[0].rel, "preload");
        assert.equal(links[0].as, "image");
        assert.equal(links[0].type, "image/webp");
        assert.equal(links[0].href, expected.src);
        assert.equal(links[0].attributes.get("fetchpriority"), "high");
        assert.equal(properties.get("--wallpaper-blur"), `url("${expected.blurDataURL}")`);
      }
    }
  });

  test("uses React transitions without consulting the manual document API", () => {
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      get() {
        throw new Error("manual document transition API accessed");
      },
    });

    let updates = 0;
    try {
      runThemeViewTransition("theme-apply", () => {
        updates += 1;
      });
    } finally {
      if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
      else Reflect.deleteProperty(globalThis, "document");
    }

    assert.equal(updates, 1);
  });
});
