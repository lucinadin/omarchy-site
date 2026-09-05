import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("Tailwind Oxlint rules report and autofix through the real parser", () => {
  // Oxlint RuleTester requires Node's V8 raw-transfer API; Bun cannot run it directly.
  const result = spawnSync(
    "node",
    ["--test", fileURLToPath(new URL("tailwind.rule-tests.ts", import.meta.url))],
    { encoding: "utf-8" }
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
