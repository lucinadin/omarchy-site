/* oxlint-disable omarchy/no-shadow-drift -- Invalid utility fixtures verify the drift guard itself. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { prohibitedShadowUtilities } from "./shadows";

test("accepts the reviewed vocabulary with variants and important modifiers", () => {
  assert.deepEqual(
    prohibitedShadowUtilities(
      "shadow-overlay hover:!shadow-none text-shadow-readable! inset-shadow-keycap"
    ),
    []
  );
});

test("rejects arbitrary shadows, important bypasses and internal Tailwind variables", () => {
  for (const utility of [
    "shadow-lg",
    "!shadow-lg",
    "hover:shadow-lg!",
    "hover:!shadow-[0_0_2px_red]",
    "shadow-[color:red]",
    "[box-shadow:0_0_2px_red]",
    "[--tw-shadow:0_0_2px_red]",
    "[filter:drop-shadow(0_0_2px_red)]",
  ]) {
    assert.deepEqual(prohibitedShadowUtilities(utility), [utility]);
  }
});
