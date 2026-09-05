import type { LogoEffectSourceReference } from "@/lib/effects/logo/definition";

const SOURCE_LOCK = {
  commit: "7203e354498462064b7c0a89375051f65cf2ce99",
  repository: "https://github.com/omacom/ttfx",
  version: "0.3.2",
} as const;

export function createTtfxSourceReference(effect: string, sourcePath: string) {
  return {
    ...SOURCE_LOCK,
    attribution: "TTFX",
    effect,
    project: "ttfx",
    sourceUrl: `${SOURCE_LOCK.repository}/blob/${SOURCE_LOCK.commit}/${sourcePath}`,
  } satisfies LogoEffectSourceReference;
}
