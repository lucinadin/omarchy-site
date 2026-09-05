import type { Rgb } from "@/lib/color";
import type { PreparedLogoEffect } from "@/lib/effects/logo/definition";
import type { LogoEffectIdle } from "@/lib/effects/logo/idle";

export type LogoPoint = {
  column: number;
  row: number;
};

export type LogoCell = {
  column: number;
  glyph: string;
  index: number;
  row: number;
};

export type LogoPalette = {
  bright: Rgb;
  ciphertext: readonly [Rgb, Rgb, Rgb];
  final: Rgb;
  laser: readonly [Rgb, Rgb, Rgb];
  muted: Rgb;
};

export type LogoGlyphChannel =
  | "copiedText"
  | "finalText"
  | "helper"
  | "line"
  | "particle"
  | "shell"
  | "transition";

export type GlyphVisual = {
  alpha?: number;
  channel?: LogoGlyphChannel;
  color: Rgb;
  glyph: string;
  glow?: number;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  style?: "glyph" | "spark";
};

export type GlyphParticle = GlyphVisual & LogoPoint;

export type LogoPointerTrailPoint = LogoPoint & {
  ageMs: number;
};

export type LogoInteraction = {
  current: LogoPoint | null;
  inside: boolean;
  pointerType: string;
  pressed: boolean;
  previous: LogoPoint | null;
  primaryDown: boolean;
  released: boolean;
  trail: readonly LogoPointerTrailPoint[];
  velocity: {
    columnPerSecond: number;
    rowPerSecond: number;
  };
};

export type LogoEffectFrame = {
  idleMs: number;
  interaction: LogoInteraction;
  interactionMs: number;
  pointer: LogoPoint | null;
  pointerTrail: readonly LogoPointerTrailPoint[];
  revealMs: number;
};

export type LogoEffectContext = {
  cells: readonly LogoCell[];
  palette: LogoPalette;
  seed: number;
};

export type LogoEffectStatus = "ambient" | "revealing" | "settled";

export type LogoEffectInstanceWriter = {
  readonly capacity: number;
  readonly count: number;
  push: (particle: GlyphParticle, channel: LogoGlyphChannel) => void;
};

export type LogoEffectRuntimeCore = {
  readonly instanceCapacity: number;
  pointerEnabled: () => boolean;
  reset: () => void;
  settle: () => void;
  readonly status: LogoEffectStatus;
  step: (input: { deltaTicks: number; interaction: LogoInteraction }) => void;
  readonly usesPointer: boolean;
  writeInstances: (writer: LogoEffectInstanceWriter) => void;
};

export type LogoEffectStartMode = "reveal" | "settled";

export type LogoRendererController = {
  configureIdle: (idle: LogoEffectIdle) => void;
  dispose: () => void;
  playPrepared: (effect: PreparedLogoEffect, seed: number, startMode?: LogoEffectStartMode) => void;
  refreshPalette: () => void;
  replay: (startMode?: LogoEffectStartMode) => void;
  setActive: (active: boolean) => void;
  stop: () => void;
};
