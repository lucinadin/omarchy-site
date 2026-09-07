import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { fileExists, writeFileIfChanged, writeOrCheckFile } from "./write-file-if-changed";

test("generated files refresh changed contents without rewriting identical files", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "omarchy-generated-files-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const filename = join(directory, "nested", "image.png");
  const initial = Buffer.from("initial rendered image");
  const updated = Buffer.from("updated rendered image");

  assert.equal(await fileExists(filename), false);
  assert.equal(await fileExists(directory), false);
  assert.equal(await writeOrCheckFile(filename, initial, true), "missing");
  assert.equal(await fileExists(filename), false, "Check mode must not create files");
  assert.equal(await writeFileIfChanged(filename, initial), "written");
  assert.equal(await fileExists(filename), true);
  const before = await stat(filename, { bigint: true });
  assert.equal(await writeFileIfChanged(filename, initial), "unchanged");
  assert.equal((await stat(filename, { bigint: true })).mtimeNs, before.mtimeNs);
  assert.equal(await writeOrCheckFile(filename, initial, true), "unchanged");
  assert.equal(await writeOrCheckFile(filename, updated, true), "changed");
  assert.deepEqual(await readFile(filename), initial, "Check mode must not modify files");
  assert.equal(await writeOrCheckFile(filename, updated, false), "written");
  assert.deepEqual(await readFile(filename), updated);

  const emptyFile = join(directory, "empty");
  await writeFile(emptyFile, "");
  assert.equal(await fileExists(emptyFile), true);
  await assert.rejects(fileExists(join(emptyFile, "child")), { code: "ENOTDIR" });
});
