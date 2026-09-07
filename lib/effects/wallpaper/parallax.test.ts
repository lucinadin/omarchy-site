import assert from "node:assert/strict";
import { test } from "node:test";

import { wallpaperParallaxFrame } from "./parallax";
import {
  defaultWallpaperParallaxSettings,
  parseWallpaperParallaxSettings,
  wallpaperParallaxLimits,
} from "./settings";

test("wallpaper defaults match the chosen Secret Lab values", () => {
  assert.deepEqual(defaultWallpaperParallaxSettings, {
    enabled: true,
    pointer: 10,
    scroll: 0,
    smoothing: 480,
  });
});

test("wallpaper parallax validates persisted settings and clamps controls", () => {
  for (const value of [null, "null", "[]", "{", '"bad"']) {
    assert.deepEqual(parseWallpaperParallaxSettings(value), defaultWallpaperParallaxSettings);
  }
  assert.deepEqual(
    parseWallpaperParallaxSettings(
      '{"enabled":false,"pointer":999,"scroll":-1,"smoothing":"fast"}'
    ),
    {
      enabled: false,
      pointer: wallpaperParallaxLimits.pointer.maximum,
      scroll: 0,
      smoothing: defaultWallpaperParallaxSettings.smoothing,
    }
  );
  assert.deepEqual(
    parseWallpaperParallaxSettings('{"enabled":"false","pointer":null}'),
    defaultWallpaperParallaxSettings
  );
});

test("enabled parallax moves opposite the pointer and follows scroll with bounded inputs", () => {
  const settings = { ...defaultWallpaperParallaxSettings, pointer: 10, scroll: 24 };
  assert.deepEqual(wallpaperParallaxFrame(640, 320, 0.5, 1, -0.5, settings), {
    x: -10,
    y: 17,
    scale: 1.2125,
  });
  assert.deepEqual(wallpaperParallaxFrame(640, 320, -1, -1, 1, settings), {
    x: 10,
    y: -34,
    scale: 1.2125,
  });
  assert.deepEqual(wallpaperParallaxFrame(640, 320, 2, 4, -3, settings), {
    x: -10,
    y: 34,
    scale: 1.2125,
  });
});

test("wallpaper overscan covers the viewport at every extreme of movement", () => {
  for (const [width, height] of [
    [360, 700],
    [1280, 420],
    [1920, 1080],
    [320, 180],
  ]) {
    for (const pointer of [0, 12, wallpaperParallaxLimits.pointer.maximum]) {
      for (const scroll of [0, 32, wallpaperParallaxLimits.scroll.maximum]) {
        const settings = { ...defaultWallpaperParallaxSettings, pointer, scroll };
        for (const progress of [-1, 0, 1]) {
          for (const x of [-1, 0, 1]) {
            for (const y of [-1, 0, 1]) {
              const frame = wallpaperParallaxFrame(width, height, progress, x, y, settings);
              assert.ok(((frame.scale - 1) * width) / 2 + 0.0001 >= Math.abs(frame.x));
              assert.ok(((frame.scale - 1) * height) / 2 + 0.0001 >= Math.abs(frame.y));
            }
          }
        }
      }
    }
  }
});

test("disabled or empty wallpaper surfaces stay still", () => {
  const still = { x: 0, y: 0, scale: 1 };
  assert.deepEqual(
    wallpaperParallaxFrame(320, 180, 1, 1, 1, {
      ...defaultWallpaperParallaxSettings,
      enabled: false,
    }),
    still
  );
  assert.deepEqual(
    wallpaperParallaxFrame(0, 180, 1, 1, 1, defaultWallpaperParallaxSettings),
    still
  );
  assert.deepEqual(
    wallpaperParallaxFrame(320, 180, 1, 1, 1, {
      ...defaultWallpaperParallaxSettings,
      pointer: 0,
      scroll: 0,
    }),
    still
  );
});
