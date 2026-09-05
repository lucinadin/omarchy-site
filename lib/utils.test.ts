/* oxlint-disable omarchy/no-shadow-drift -- Regression fixtures deliberately exercise competing shadow classes. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { cn } from "./utils";

test("named shadow geometry merges independently of shadow color", () => {
  assert.equal(cn("shadow-overlay", "shadow-none"), "shadow-none");
  assert.equal(cn("shadow-none", "shadow-overlay"), "shadow-overlay");
  assert.equal(cn("shadow-notification", "shadow-overlay"), "shadow-overlay");
  assert.equal(cn("shadow-overlay", "shadow-primary"), "shadow-overlay shadow-primary");
  assert.equal(cn("inset-shadow-keycap", "inset-shadow-none"), "inset-shadow-none");
  assert.equal(cn("text-shadow-readable", "text-shadow-none"), "text-shadow-none");
  assert.equal(cn("hover:shadow-overlay", "hover:shadow-none"), "hover:shadow-none");
});
