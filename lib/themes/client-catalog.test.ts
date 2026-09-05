import assert from "node:assert/strict";
import { test } from "node:test";

import { createThemeSelection } from "@/lib/themes/client-catalog";
import { omarchyThemes } from "@/lib/themes/official";
import type { OmarchyThemeOption } from "@/lib/themes/themes";

test("the latest selection wins across independently loaded theme collections", async () => {
  const slow = Promise.withResolvers<OmarchyThemeOption>();
  const selection = createThemeSelection((id) =>
    id === "slow" ? slow.promise : Promise.resolve(omarchyThemes[0])
  );
  const applied: string[] = [];
  const first = selection.select("slow", (theme) => applied.push(theme.id));
  await selection.select("fast", (theme) => applied.push(theme.id));
  slow.resolve(omarchyThemes[1]);
  await first;
  assert.deepEqual(applied, [omarchyThemes[0].id]);
});

test("opening a preview or applying another theme cancels the pending selection", async () => {
  const pending = Promise.withResolvers<OmarchyThemeOption>();
  const selection = createThemeSelection(() => pending.promise);
  const applied: string[] = [];
  const request = selection.select("pending", (theme) => applied.push(theme.id));
  selection.cancel();
  pending.resolve(omarchyThemes[0]);
  await request;
  assert.deepEqual(applied, []);
});

test("an unmounted selection owner cannot apply a theme after its request resolves", async () => {
  const pending = Promise.withResolvers<OmarchyThemeOption>();
  const selection = createThemeSelection(() => pending.promise);
  const controller = new AbortController();
  const applied: string[] = [];
  const request = selection.select("pending", (theme) => applied.push(theme.id), controller.signal);
  controller.abort();
  pending.resolve(omarchyThemes[0]);
  await request;
  assert.deepEqual(applied, []);
});

test("stale loading errors are ignored while current loading errors reach the caller", async () => {
  const pending = Promise.withResolvers<OmarchyThemeOption>();
  const selection = createThemeSelection(() => pending.promise);
  const request = selection.select("pending", () => assert.fail("No theme should apply"));
  selection.cancel();
  pending.reject(new Error("catalog unavailable"));
  await assert.doesNotReject(request);
  await assert.rejects(
    selection.select("current", () => {}),
    /catalog unavailable/u
  );
});
