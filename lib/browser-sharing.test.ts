import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { shareOrCopy, writeClipboardText } from "@/lib/browser-sharing";

type NavigatorStub = {
  clipboard?: {
    writeText: (text: string) => Promise<void>;
  };
  share?: (data: ShareData) => Promise<void>;
};

async function withNavigator(navigatorStub: NavigatorStub, run: () => Promise<void>) {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: navigatorStub,
  });

  try {
    await run();
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
}

describe("browser sharing", () => {
  test("reports clipboard availability and write failures separately", async () => {
    await withNavigator({}, async () => {
      assert.equal(await writeClipboardText("value"), "unavailable");
    });

    await withNavigator(
      {
        clipboard: {
          writeText: () => Promise.reject(new Error("permission denied")),
        },
      },
      async () => {
        assert.equal(await writeClipboardText("value"), "failed");
      }
    );
  });

  test("uses native sharing when it succeeds", async () => {
    let sharedData: ShareData | undefined;
    let copied = false;

    await withNavigator(
      {
        clipboard: {
          writeText() {
            copied = true;
            return Promise.resolve();
          },
        },
        share(data) {
          sharedData = data;
          return Promise.resolve();
        },
      },
      async () => {
        assert.equal(await shareOrCopy("Title", "Text", "https://example.com"), "shared");
      }
    );

    assert.deepEqual(sharedData, {
      text: "Text",
      title: "Title",
      url: "https://example.com",
    });
    assert.equal(copied, false);
  });

  test("falls back to the clipboard after a native share failure", async () => {
    let copiedValue = "";

    await withNavigator(
      {
        clipboard: {
          writeText(value) {
            copiedValue = value;
            return Promise.resolve();
          },
        },
        share: () => Promise.reject(new Error("share failed")),
      },
      async () => {
        assert.equal(await shareOrCopy("Title", "Text", "https://example.com"), "copied");
      }
    );

    assert.equal(copiedValue, "https://example.com");
  });

  test("does not copy when the user cancels native sharing", async () => {
    let copied = false;

    await withNavigator(
      {
        clipboard: {
          writeText() {
            copied = true;
            return Promise.resolve();
          },
        },
        share: () => Promise.reject(new DOMException("Share cancelled", "AbortError")),
      },
      async () => {
        assert.equal(await shareOrCopy("Title", "Text", "https://example.com"), "cancelled");
      }
    );

    assert.equal(copied, false);
  });
});
