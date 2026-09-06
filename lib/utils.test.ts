/* oxlint-disable omarchy/no-shadow-drift -- Regression fixtures deliberately exercise competing shadow classes. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { cn } from "./utils";

test("max-height limits and none override each other in both directions", () => {
  for (const limit of [
    "max-h-96",
    "max-h-full",
    "max-h-[300px]",
    "max-h-[min(82%,34rem)]",
    "max-h-[calc(100dvh-4rem)]",
  ]) {
    assert.equal(cn("max-h-none", limit), limit);
    assert.equal(cn(limit, "max-h-none"), "max-h-none");
  }
});

test("max-height merging respects variants and unrelated dimensions", () => {
  assert.equal(cn("md:max-h-none", "md:max-h-full"), "md:max-h-full");
  assert.equal(cn("md:max-h-full", "md:max-h-none"), "md:max-h-none");
  assert.equal(cn("max-h-none", "md:max-h-full"), "max-h-none md:max-h-full");
  assert.equal(
    cn("max-h-none min-h-0 max-w-none", "max-h-[min(82%,34rem)]"),
    "min-h-0 max-w-none max-h-[min(82%,34rem)]"
  );
});

test("search dialog owns the height limit while its list can fill the available space", () => {
  assert.equal(
    cn("max-h-none", cn("outline-none", "max-h-[min(82%,34rem)]")),
    "outline-none max-h-[min(82%,34rem)]"
  );
  assert.equal(
    cn("max-h-[300px] overflow-y-auto", "max-h-none min-h-0"),
    "overflow-y-auto max-h-none min-h-0"
  );
  assert.equal(cn("max-h-none", "outline-none"), "max-h-none outline-none");
});

test("named shadow geometry merges independently of shadow color", () => {
  assert.equal(cn("shadow-overlay", "shadow-none"), "shadow-none");
  assert.equal(cn("shadow-none", "shadow-overlay"), "shadow-overlay");
  assert.equal(cn("shadow-notification", "shadow-overlay"), "shadow-overlay");
  assert.equal(cn("shadow-overlay", "shadow-primary"), "shadow-overlay shadow-primary");
  assert.equal(cn("inset-shadow-keycap", "inset-shadow-none"), "inset-shadow-none");
  assert.equal(cn("text-shadow-readable", "text-shadow-none"), "text-shadow-none");
  assert.equal(cn("hover:shadow-overlay", "hover:shadow-none"), "hover:shadow-none");
});
