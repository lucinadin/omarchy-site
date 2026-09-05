import { storageGet, storageSet } from "@/lib/settings/storage";

const RENDER_QUALITY_STORAGE_KEY = "omarchy.render-quality:v1";

export type RenderQualityPreference = "auto" | RenderQualityTier;
export type RenderQualityTier = "high" | "low";
export type EffectiveRenderQuality = RenderQualityTier | "mixed" | null;

export type RenderQualitySnapshot = {
  activeRendererCount: number;
  effective: EffectiveRenderQuality;
  preference: RenderQualityPreference;
};

type RegisteredRenderer = {
  applyPreference: (preference: RenderQualityPreference) => void;
  tier: RenderQualityTier;
};

const serverSnapshot: RenderQualitySnapshot = {
  activeRendererCount: 0,
  effective: null,
  preference: "auto",
};

let initialized = false;
let nextRendererId = 1;
let preference: RenderQualityPreference = "auto";
let snapshot = serverSnapshot;
const listeners = new Set<() => void>();
const renderers = new Map<number, RegisteredRenderer>();

export function parseRenderQualityPreference(value: string | null): RenderQualityPreference | null {
  if (value === "auto" || value === "high" || value === "low") return value;
  return null;
}

export function summarizeRenderQuality(tiers: Iterable<RenderQualityTier>): EffectiveRenderQuality {
  let first: RenderQualityTier | null = null;
  for (const tier of tiers) {
    if (first === null) first = tier;
    else if (first !== tier) return "mixed";
  }
  return first;
}

function updateSnapshot() {
  const effective = summarizeRenderQuality(Array.from(renderers.values(), ({ tier }) => tier));
  if (
    snapshot.activeRendererCount === renderers.size &&
    snapshot.effective === effective &&
    snapshot.preference === preference
  ) {
    return;
  }

  snapshot = {
    activeRendererCount: renderers.size,
    effective,
    preference,
  };
  for (const listener of listeners) listener();
}

function applyPreference(nextPreference: RenderQualityPreference, force = false) {
  if (preference === nextPreference && !force) return;
  preference = nextPreference;
  for (const renderer of renderers.values()) renderer.applyPreference(preference);
  updateSnapshot();
}

function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const savedPreference = storageGet(RENDER_QUALITY_STORAGE_KEY);
  preference = parseRenderQualityPreference(savedPreference) ?? "auto";
  updateSnapshot();

  window.addEventListener("storage", (event) => {
    if (event.key !== RENDER_QUALITY_STORAGE_KEY) return;
    applyPreference(parseRenderQualityPreference(event.newValue) ?? "auto");
  });
}

export function getRenderQualityPreference() {
  initialize();
  return preference;
}

export function setRenderQualityPreference(nextPreference: RenderQualityPreference) {
  if (typeof window === "undefined") return;
  initialize();
  applyPreference(nextPreference);
  storageSet(RENDER_QUALITY_STORAGE_KEY, nextPreference);
}

export function resetRenderQualityPreference() {
  if (typeof window === "undefined") return;
  initialize();
  applyPreference("auto", true);
  storageSet(RENDER_QUALITY_STORAGE_KEY, "auto");
}

export function getRenderQualitySnapshot() {
  initialize();
  return snapshot;
}

export function getServerRenderQualitySnapshot() {
  return serverSnapshot;
}

export function subscribeRenderQuality(listener: () => void) {
  initialize();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function registerRenderQualityController(
  initialTier: RenderQualityTier,
  applyControllerPreference: (preference: RenderQualityPreference) => void
) {
  initialize();
  const rendererId = nextRendererId;
  nextRendererId += 1;
  renderers.set(rendererId, {
    applyPreference: applyControllerPreference,
    tier: initialTier,
  });
  updateSnapshot();

  return {
    reportTier(nextTier: RenderQualityTier) {
      const renderer = renderers.get(rendererId);
      if (!renderer || renderer.tier === nextTier) return;
      renderer.tier = nextTier;
      updateSnapshot();
    },
    unregister() {
      if (!renderers.delete(rendererId)) return;
      updateSnapshot();
    },
  };
}
