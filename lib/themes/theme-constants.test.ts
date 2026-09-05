import assert from "node:assert/strict";
import { test } from "node:test";

import { getThemeBootstrapScript } from "@/lib/themes/theme-bootstrap";
import {
  defaultThemeSkewAngle,
  normalizeThemeSkewAngle,
  themeSkewAnglePreferenceKey,
} from "@/lib/themes/theme-constants";

test("missing and invalid skew settings use the authored default without losing explicit zero", () => {
  for (const value of [null, "", "  ", "invalid", Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(normalizeThemeSkewAngle(value), defaultThemeSkewAngle);
  }
  assert.equal(normalizeThemeSkewAngle(0), 0);
  assert.equal(normalizeThemeSkewAngle("0"), 0);
  assert.equal(normalizeThemeSkewAngle("3.5"), 3.5);
  assert.equal(normalizeThemeSkewAngle(-1), 0);
  assert.equal(normalizeThemeSkewAngle(8), 4.5);
});

test("bootstrap and runtime agree on skew even when the saved theme is malformed", () => {
  // Execute the exact inline script used before hydration, not a second implementation.
  // oxlint-disable-next-line no-new-func
  const bootstrap = new Function("window", "document", getThemeBootstrapScript());
  for (const value of [null, "", "  ", "0", "4", "4junk", "Infinity"]) {
    const properties = new Map<string, string>();
    bootstrap(
      {
        localStorage: {
          getItem: (key: string) => (key === themeSkewAnglePreferenceKey ? value : "invalid-json"),
        },
      },
      {
        documentElement: {
          dataset: {},
          style: { setProperty: (key: string, next: string) => properties.set(key, next) },
        },
        querySelector: () => null,
      }
    );
    assert.equal(properties.get("--theme-skew-angle"), `${normalizeThemeSkewAngle(value)}deg`);
  }
});
