import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  directionalWindow,
  insertWindow,
  removeWindow,
  resizeNearestSplit,
  toggleNearestSplit,
  type LayoutNode,
} from "@/lib/home-desktop-layout";

describe("home desktop window layout", () => {
  test("navigates by the windows' visual positions after nested splits", () => {
    const first = insertWindow(null, null, 1, "horizontal");
    const second = insertWindow(first, 1, 2, "horizontal");
    const layout = insertWindow(second, 2, 3, "vertical");

    assert.equal(directionalWindow(layout, 1, "right"), 2);
    assert.equal(directionalWindow(layout, 2, "down"), 3);
    assert.equal(directionalWindow(layout, 3, "left"), 1);
    assert.equal(directionalWindow(layout, 1, "left"), null);
  });

  test("changes only the nearest split and collapses the tree when a window closes", () => {
    const layout: LayoutNode = {
      axis: "horizontal",
      first: { kind: "window", windowId: 1 },
      kind: "split",
      ratio: 50,
      second: {
        axis: "vertical",
        first: { kind: "window", windowId: 2 },
        kind: "split",
        ratio: 50,
        second: { kind: "window", windowId: 3 },
      },
    };

    const toggled = toggleNearestSplit(layout, 3);
    assert.equal(toggled.toggled, true);
    assert.equal(toggled.node.kind === "split" && toggled.node.axis, "horizontal");
    assert.equal(
      toggled.node.kind === "split" &&
        toggled.node.second.kind === "split" &&
        toggled.node.second.axis,
      "horizontal"
    );

    const resized = resizeNearestSplit(layout, 3, "vertical", 40);
    assert.equal(resized.resized, true);
    assert.equal(
      resized.node.kind === "split" &&
        resized.node.second.kind === "split" &&
        resized.node.second.ratio,
      25
    );
    assert.deepEqual(removeWindow(layout, 2), {
      ...layout,
      second: { kind: "window", windowId: 3 },
    });
  });
});
