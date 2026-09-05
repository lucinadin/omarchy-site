import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseHexColor, relativeLuminance } from "@/lib/color";

describe("shared color utilities", () => {
  test("parses six-digit theme colors without changing their channels", () => {
    assert.deepEqual(parseHexColor("#00AAff"), [0, 170, 255]);
    assert.deepEqual(parseHexColor("#000000"), [0, 0, 0]);
    assert.deepEqual(parseHexColor("#ffffff"), [255, 255, 255]);
    assert.deepEqual(parseHexColor("#123456"), [18, 52, 86]);
  });

  test("leaves fallback selection to callers for unsupported formats", () => {
    for (const color of [
      "",
      "transparent",
      "#abc",
      "#11223344",
      "112233",
      "#gg1122",
      " #112233",
      "#112233 ",
    ]) {
      assert.equal(parseHexColor(color), null, color);
    }
  });

  test("computes luminance from the same RGB channels used by effects", () => {
    assert.equal(relativeLuminance(0, 0, 0), 0);
    assert.equal(relativeLuminance(255, 255, 255), 1);
    assert.equal(relativeLuminance(255, 0, 0), 0.2126);
    assert.equal(relativeLuminance(0, 255, 0), 0.7152);
    assert.equal(relativeLuminance(0, 0, 255), 0.0722);
  });
});
