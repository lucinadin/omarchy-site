import type { LogoEffectDefinitionModule } from "@/lib/effects/logo/definition";
import { findCatalogId } from "@/lib/validation";

export const LOGO_EFFECTS = [
  {
    id: "laseretch",
    label: "LaserEtch",
    load: () => import("@/lib/effects/logo/definitions/laseretch"),
    usesParticleGlyph: true,
    usesSeed: true,
  },
  {
    id: "rain",
    label: "Rain",
    load: () => import("@/lib/effects/logo/definitions/rain"),
    usesParticleGlyph: true,
    usesSeed: true,
  },
  {
    id: "decrypt",
    label: "Decrypt",
    load: () => import("@/lib/effects/logo/definitions/decrypt"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "synthgrid",
    label: "Synthgrid",
    load: () => import("@/lib/effects/logo/definitions/synthgrid"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "beams",
    label: "Beams",
    load: () => import("@/lib/effects/logo/definitions/beams"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "wipe",
    label: "Wipe",
    load: () => import("@/lib/effects/logo/definitions/wipe"),
    usesParticleGlyph: false,
    usesSeed: false,
  },
  {
    id: "highlight",
    label: "Highlight",
    load: () => import("@/lib/effects/logo/definitions/highlight"),
    usesParticleGlyph: false,
    usesSeed: false,
  },
  {
    id: "randomsequence",
    label: "Random Sequence",
    load: () => import("@/lib/effects/logo/definitions/randomsequence"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "sweep",
    label: "Sweep",
    load: () => import("@/lib/effects/logo/definitions/sweep"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "waves",
    label: "Waves",
    load: () => import("@/lib/effects/logo/definitions/waves"),
    usesParticleGlyph: false,
    usesSeed: false,
  },
  {
    id: "colorshift",
    label: "Color Shift",
    load: () => import("@/lib/effects/logo/definitions/colorshift"),
    usesParticleGlyph: false,
    usesSeed: false,
  },
  {
    id: "binarypath",
    label: "Binary Path",
    load: () => import("@/lib/effects/logo/definitions/binarypath"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "errorcorrect",
    label: "Error Correct",
    load: () => import("@/lib/effects/logo/definitions/errorcorrect"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "expand",
    label: "Expand",
    load: () => import("@/lib/effects/logo/definitions/expand"),
    usesParticleGlyph: false,
    usesSeed: false,
  },
  {
    id: "middleout",
    label: "Middle Out",
    load: () => import("@/lib/effects/logo/definitions/middleout"),
    usesParticleGlyph: false,
    usesSeed: false,
  },
  {
    id: "pour",
    label: "Pour",
    load: () => import("@/lib/effects/logo/definitions/pour"),
    usesParticleGlyph: false,
    usesSeed: false,
  },
  {
    id: "scattered",
    label: "Scattered",
    load: () => import("@/lib/effects/logo/definitions/scattered"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "slice",
    label: "Slice",
    load: () => import("@/lib/effects/logo/definitions/slice"),
    usesParticleGlyph: false,
    usesSeed: false,
  },
  {
    id: "slide",
    label: "Slide",
    load: () => import("@/lib/effects/logo/definitions/slide"),
    usesParticleGlyph: false,
    usesSeed: false,
  },
  {
    id: "spray",
    label: "Spray",
    load: () => import("@/lib/effects/logo/definitions/spray"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "bouncyballs",
    label: "Bouncy Balls",
    load: () => import("@/lib/effects/logo/definitions/bouncyballs"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "bubbles",
    label: "Bubbles",
    load: () => import("@/lib/effects/logo/definitions/bubbles"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "fireworks",
    label: "Fireworks",
    load: () => import("@/lib/effects/logo/definitions/fireworks"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "orbittingvolley",
    label: "Orbiting Volley",
    load: () => import("@/lib/effects/logo/definitions/orbittingvolley"),
    usesParticleGlyph: false,
    usesSeed: false,
  },
  {
    id: "rings",
    label: "Rings",
    load: () => import("@/lib/effects/logo/definitions/rings"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "swarm",
    label: "Swarm",
    load: () => import("@/lib/effects/logo/definitions/swarm"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "blackhole",
    label: "Blackhole",
    load: () => import("@/lib/effects/logo/definitions/blackhole"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "burn",
    label: "Burn",
    load: () => import("@/lib/effects/logo/definitions/burn"),
    usesParticleGlyph: true,
    usesSeed: true,
  },
  {
    id: "crumble",
    label: "Crumble",
    load: () => import("@/lib/effects/logo/definitions/crumble"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "overflow",
    label: "Overflow",
    load: () => import("@/lib/effects/logo/definitions/overflow"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "print",
    label: "Print",
    load: () => import("@/lib/effects/logo/definitions/print"),
    usesParticleGlyph: false,
    usesSeed: false,
  },
  {
    id: "smoke",
    label: "Smoke",
    load: () => import("@/lib/effects/logo/definitions/smoke"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "spotlights",
    label: "Spotlights",
    load: () => import("@/lib/effects/logo/definitions/spotlights"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "unstable",
    label: "Unstable",
    load: () => import("@/lib/effects/logo/definitions/unstable"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "vhstape",
    label: "VHS Tape",
    load: () => import("@/lib/effects/logo/definitions/vhstape"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "matrix",
    label: "Matrix",
    load: () => import("@/lib/effects/logo/definitions/matrix"),
    usesParticleGlyph: false,
    usesSeed: true,
  },
  {
    id: "thunderstorm",
    label: "Thunderstorm",
    load: () => import("@/lib/effects/logo/definitions/thunderstorm"),
    usesParticleGlyph: true,
    usesSeed: true,
  },
] as const satisfies readonly {
  id: string;
  label: string;
  load: () => Promise<LogoEffectDefinitionModule>;
  usesParticleGlyph: boolean;
  usesSeed: boolean;
}[];

export type LogoEffectId = (typeof LOGO_EFFECTS)[number]["id"];

export const FIRST_VISIT_LOGO_EFFECTS = [
  "laseretch",
  "matrix",
  "rain",
  "decrypt",
  "beams",
  "synthgrid",
] as const satisfies readonly LogoEffectId[];

export function parseLogoEffectId(value: string | null): LogoEffectId | null {
  return findCatalogId(LOGO_EFFECTS, value);
}

function logoEffectById(id: LogoEffectId) {
  const effect = LOGO_EFFECTS.find((candidate) => candidate.id === id);
  if (!effect) throw new TypeError(`Unknown logo effect: ${id}`);
  return effect;
}

export function logoEffectUsesSeed(id: LogoEffectId) {
  return logoEffectById(id).usesSeed;
}

export function logoEffectUsesParticleGlyph(id: LogoEffectId) {
  return logoEffectById(id).usesParticleGlyph;
}

export function loadLogoEffect(id: LogoEffectId): Promise<LogoEffectDefinitionModule> {
  return logoEffectById(id).load();
}
