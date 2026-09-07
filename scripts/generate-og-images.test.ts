import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";

import sharp from "sharp";

import { defaultThemeId, getOfficialThemeWallpaper } from "../lib/themes/official";

test("home OG generation isolates previews, refreshes changed inputs and preserves unchanged files", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "omarchy-og-generator-"));
  const wallpaperPath = getOfficialThemeWallpaper(defaultThemeId);
  context.after(() => rm(directory, { recursive: true, force: true }));
  // Copy only renderer inputs. No writable symlink points at the project's output directories.
  for (const entry of [
    "public/assets/brand/omarchy-wordmark.png",
    "public/assets/brand/omarchy-wordmark.svg",
    "scripts/og/fonts/JetBrainsMono-Regular.ttf",
    "scripts/og/fonts/JetBrainsMono-Bold.ttf",
    wallpaperPath,
  ]) {
    const destination = join(directory, entry);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(resolve(entry), destination);
  }
  const run = (...args: string[]) =>
    spawnSync(
      process.execPath,
      ["--conditions=react-server", resolve("scripts/generate-og-images.ts"), ...args],
      { cwd: directory, encoding: "utf-8" }
    );
  for (const [args, expectedError] of [
    [["--unknown"], /Unknown option/u],
    [["unknown"], /Unknown OG group/u],
    [["home", "official/tokyo-night"], /Theme keys can only be supplied/u],
    [["themes", "not-a-theme"], /Unknown theme/u],
  ] as const) {
    const result = run(...args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, expectedError);
  }
  const firstRun = run("--preview", "home");
  assert.equal(firstRun.status, 0, firstRun.stderr);
  const filename = join(directory, "tmp/og-previews/public/assets/og/home.png");
  const productionFilename = join(directory, "public/assets/og/home.png");
  const initial = await readFile(filename);
  const metadata = await sharp(initial).metadata();
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 630);
  await assert.rejects(stat(productionFilename), { code: "ENOENT" });
  await assert.rejects(stat(join(directory, "out")), { code: "ENOENT" });

  await writeFile(filename, "stale image");
  const repair = run("--preview", "home");
  assert.equal(repair.status, 0, repair.stderr);
  assert.deepEqual(await readFile(filename), initial);
  const before = await stat(filename, { bigint: true });
  const unchanged = run("--preview", "home");
  assert.equal(unchanged.status, 0, unchanged.stderr);
  assert.equal((await stat(filename, { bigint: true })).mtimeNs, before.mtimeNs);

  const redWallpaper = await sharp({
    create: { width: 1200, height: 630, channels: 3, background: "#ff0000" },
  })
    .webp()
    .toBuffer();
  await writeFile(join(directory, wallpaperPath), redWallpaper);
  const changed = run("--preview", "home");
  assert.equal(changed.status, 0, changed.stderr);
  const updated = await readFile(filename);
  assert.notDeepEqual(updated, initial);
  const { data } = await sharp(updated).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.ok(
    data[0] > 120 && data[1] < 10 && data[2] < 10,
    "Changed wallpaper reaches the rendered pixels"
  );
  await assert.rejects(stat(productionFilename), { code: "ENOENT" });

  const production = run("home");
  assert.equal(production.status, 0, production.stderr);
  assert.deepEqual(await readFile(productionFilename), updated);
});
