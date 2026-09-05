import type { LogoEffectColorResolver } from "@/lib/effects/logo/color-bindings";
import {
  logoEffectPlaybackEqual,
  type LoadedLogoEffectDefinition,
  type LogoEffectGlyphPresentation,
  type LogoEffectGlyphSelection,
  type LogoEffectPlayback,
  type LogoEffectPresentation,
  type LogoEffectSourceReference,
  type PreparedLogoEffect,
} from "@/lib/effects/logo/definition";
import {
  LOGO_IDLE_GRADIENT_DIRECTIONS,
  LOGO_IDLE_MOTIONS,
  resolveLogoEffectIdle,
  type LogoEffectIdle,
  type LogoEffectIdleOverride,
} from "@/lib/effects/logo/idle";
import { parseLogoEffectId } from "@/lib/effects/logo/registry";
import { isLogoEffectBoolean, isLogoEffectSingleSymbol } from "@/lib/effects/logo/schema";
import type { LogoGlyphChannel } from "@/lib/effects/logo/types";
import {
  isJsonObject,
  jsonValuesEqual,
  type JsonObject as LogoEffectJsonObject,
  type JsonValue as LogoEffectJsonValue,
} from "@/lib/json";
import { isFiniteNumber } from "@/lib/validation";

const LOGO_GLYPH_CHANNELS = [
  "copiedText",
  "finalText",
  "helper",
  "line",
  "particle",
  "shell",
  "transition",
] as const satisfies readonly LogoGlyphChannel[];
const DEFAULT_AMBIENT_RATE = 1;
const DEFAULT_REPEAT_DELAY_MS = 700;

export type LogoEffectPlaybackOverride = {
  ambientRate?: number;
  mode?: LogoEffectPlayback["mode"];
  repeatDelayMotion?: "ambient" | "settled";
  repeatDelayMs?: number;
  revealRate?: number;
};

type LogoEffectRevealOverride = {
  enabled?: boolean;
};

type LogoEffectGlyphPresentationOverride = Partial<LogoEffectGlyphPresentation>;

export type LogoEffectPresentationOverride = Partial<Omit<LogoEffectPresentation, "glyphs">> & {
  glyphs?: LogoEffectGlyphPresentationOverride;
};

type LogoEffectDraft = {
  values: LogoEffectJsonObject;
};

type LogoEffectSavedState = {
  draft?: LogoEffectDraft;
  idle?: LogoEffectIdleOverride;
  playback?: LogoEffectPlaybackOverride;
  presentation?: LogoEffectPresentationOverride;
  reveal?: LogoEffectRevealOverride;
};

type LogoEffectSavedStates = Record<string, LogoEffectSavedState>;

export type LogoEffectState = {
  activeEffectId: string;
  effects?: Readonly<LogoEffectSavedStates>;
  preview: {
    seed: number;
  };
};

export type ResolvedLogoEffect<Id extends string = string> = {
  definition: LoadedLogoEffectDefinition<Id>;
  document: LogoEffectState;
  prepared: PreparedLogoEffect<Id>;
};

type LogoEffectExport = {
  behavior: LogoEffectJsonObject;
  effect: LogoEffectJsonObject;
  effectId: string;
  idle?: LogoEffectIdle;
  playback: LogoEffectPlayback;
  presentation: LogoEffectPresentation;
  preview?: {
    seed: number;
  };
  reveal?: { enabled: boolean };
  source: LogoEffectSourceReference | null;
};

function isJsonUint32(value: LogoEffectJsonValue | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function parseGlyphSelection(value: LogoEffectJsonValue | undefined) {
  if (!isJsonObject(value)) return null;
  if (value.kind === "source") return { kind: "source" } as const;
  if (value.kind === "symbol" && isLogoEffectSingleSymbol(value.value)) {
    return { kind: "symbol", value: value.value } as const;
  }
  return null;
}

function parseGlyphPresentationOverride(
  value: LogoEffectJsonValue | undefined
): LogoEffectGlyphPresentationOverride | null {
  if (!isJsonObject(value)) return null;
  const result: LogoEffectGlyphPresentationOverride = {};

  if (value.default !== undefined) {
    const selection = parseGlyphSelection(value.default);
    if (selection === null) return null;
    result.default = selection;
  }
  if (value.overrides !== undefined) {
    if (!isJsonObject(value.overrides)) return null;
    const overrides: Partial<Record<LogoGlyphChannel, LogoEffectGlyphSelection>> = {};
    for (const [channel, rawSelection] of Object.entries(value.overrides)) {
      const parsedChannel = LOGO_GLYPH_CHANNELS.find((candidate) => candidate === channel);
      if (parsedChannel === undefined) return null;
      const selection = parseGlyphSelection(rawSelection);
      if (selection === null) return null;
      overrides[parsedChannel] = selection;
    }
    if (Object.keys(overrides).length > 0) result.overrides = overrides;
  }
  return result;
}

function parsePlaybackOverride(
  value: LogoEffectJsonValue | undefined
): LogoEffectPlaybackOverride | null {
  if (!isJsonObject(value)) return null;
  const result: LogoEffectPlaybackOverride = {};
  if (value.mode !== undefined) {
    if (value.mode !== "once" && value.mode !== "ambient" && value.mode !== "repeat") {
      return null;
    }
    result.mode = value.mode;
  }
  if (value.revealRate !== undefined) {
    if (!isFiniteNumber(value.revealRate) || value.revealRate <= 0) return null;
    result.revealRate = value.revealRate;
  }
  if (value.ambientRate !== undefined) {
    if (!isFiniteNumber(value.ambientRate) || value.ambientRate <= 0) return null;
    result.ambientRate = value.ambientRate;
  }
  if (value.repeatDelayMs !== undefined) {
    if (!isFiniteNumber(value.repeatDelayMs) || value.repeatDelayMs < 0) return null;
    result.repeatDelayMs = value.repeatDelayMs;
  }
  if (value.repeatDelayMotion !== undefined) {
    if (value.repeatDelayMotion !== "ambient" && value.repeatDelayMotion !== "settled") {
      return null;
    }
    result.repeatDelayMotion = value.repeatDelayMotion;
  }
  return result;
}

function parseIdleOverride(value: LogoEffectJsonValue | undefined): LogoEffectIdleOverride | null {
  if (!isJsonObject(value)) return null;
  const result: LogoEffectIdleOverride = {};
  if (value.enabled !== undefined) {
    if (!isLogoEffectBoolean(value.enabled)) return null;
    result.enabled = value.enabled;
  }
  if (value.animateGradient !== undefined) {
    if (!isLogoEffectBoolean(value.animateGradient)) return null;
    result.animateGradient = value.animateGradient;
  }
  if (value.motion !== undefined) {
    const motion = LOGO_IDLE_MOTIONS.find((candidate) => candidate === value.motion);
    if (motion === undefined) return null;
    result.motion = motion;
  }
  if (value.gradientDirection !== undefined) {
    const direction = LOGO_IDLE_GRADIENT_DIRECTIONS.find(
      (candidate) => candidate === value.gradientDirection
    );
    if (direction === undefined) return null;
    result.gradientDirection = direction;
  }
  for (const [key, minimum, maximum] of [
    ["speed", 0.1, 3],
    ["intensity", 0, 1],
    ["gradientSpeed", -1, 1],
    ["gradientAngle", 0, 360],
  ] as const) {
    const field = value[key];
    if (field === undefined) continue;
    if (!isFiniteNumber(field) || field < minimum || field > maximum) return null;
    result[key] = field;
  }
  return result;
}

function parseRevealOverride(
  value: LogoEffectJsonValue | undefined
): LogoEffectRevealOverride | null {
  if (!isJsonObject(value)) return null;
  if (value.enabled !== undefined && !isLogoEffectBoolean(value.enabled)) return null;
  return value.enabled === undefined ? {} : { enabled: value.enabled };
}

function parsePresentationOverride(
  value: LogoEffectJsonValue | undefined
): LogoEffectPresentationOverride | null {
  if (!isJsonObject(value)) return null;
  const result: LogoEffectPresentationOverride = {};
  for (const [key, minimum, maximum] of [
    ["contrast", 0.5, 1.5],
    ["glow", 0, 1.5],
    ["grayscale", 0, 1],
    ["pixelSize", 0.45, 1.2],
    ["saturation", 0, 2],
    ["scanlines", 0, 1],
  ] as const) {
    const field = value[key];
    if (field === undefined) continue;
    if (!isFiniteNumber(field) || field < minimum || field > maximum) {
      return null;
    }
    result[key] = field;
  }
  if (value.glyphs !== undefined) {
    const glyphs = parseGlyphPresentationOverride(value.glyphs);
    if (glyphs === null) return null;
    result.glyphs = glyphs;
  }
  return result;
}

function parseDraft(value: LogoEffectJsonValue | undefined): LogoEffectDraft | null {
  if (!isJsonObject(value) || !isJsonObject(value.values)) {
    return null;
  }
  return { values: value.values };
}

function parseEffectSavedState(value: LogoEffectJsonValue): LogoEffectSavedState | null {
  if (!isJsonObject(value)) return null;
  const result: LogoEffectSavedState = {};
  const draft = parseDraft(value.draft);
  if (draft !== null) result.draft = draft;
  if (value.idle !== undefined) {
    const idle = parseIdleOverride(value.idle);
    if (idle !== null && Object.keys(idle).length > 0) result.idle = idle;
  }
  if (value.playback !== undefined) {
    const playback = parsePlaybackOverride(value.playback);
    if (playback !== null && Object.keys(playback).length > 0) result.playback = playback;
  }
  if (value.presentation !== undefined) {
    const presentation = parsePresentationOverride(value.presentation);
    if (presentation !== null && Object.keys(presentation).length > 0) {
      result.presentation = presentation;
    }
  }
  if (value.reveal !== undefined) {
    const reveal = parseRevealOverride(value.reveal);
    if (reveal !== null && Object.keys(reveal).length > 0) result.reveal = reveal;
  }
  return Object.keys(result).length === 0 ? null : result;
}

function hasLogoEffectStateHeader(value: LogoEffectJsonObject): value is LogoEffectJsonObject & {
  activeEffectId: string;
  preview: LogoEffectJsonObject & { seed: number };
} {
  return (
    typeof value.activeEffectId === "string" &&
    value.activeEffectId.length > 0 &&
    isJsonObject(value.preview) &&
    isJsonUint32(value.preview.seed)
  );
}

function parseCurrentState(value: LogoEffectJsonObject): LogoEffectState | null {
  if (!hasLogoEffectStateHeader(value)) return null;

  const result: LogoEffectState = {
    activeEffectId: value.activeEffectId,
    preview: { seed: value.preview.seed },
  };
  if (isJsonObject(value.effects)) {
    const effects: LogoEffectSavedStates = {};
    for (const [effectId, rawEffect] of Object.entries(value.effects)) {
      const effect = parseEffectSavedState(rawEffect);
      if (effect !== null) effects[effectId] = effect;
    }
    if (Object.keys(effects).length > 0) result.effects = effects;
  }
  return result;
}

export function parseStoredLogoEffectState(value: LogoEffectJsonObject | null) {
  return value === null ? null : parseCurrentState(value);
}

function requireUint32(seed: number) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
    throw new TypeError("Logo preview seed must be a uint32");
  }
  return seed;
}

export function createLogoEffectState(activeEffectId: string, seed: number): LogoEffectState {
  if (activeEffectId.length === 0) {
    throw new TypeError("Active logo effect ID must not be empty");
  }
  return {
    activeEffectId,
    preview: { seed: requireUint32(seed) },
  };
}

function getLogoEffectSavedState(
  state: LogoEffectState,
  effectId = state.activeEffectId
): LogoEffectSavedState | undefined {
  return state.effects?.[effectId];
}

function logoEffectSavedStateIsEmpty(saved: LogoEffectSavedState) {
  return (
    saved.draft === undefined &&
    saved.idle === undefined &&
    saved.playback === undefined &&
    saved.presentation === undefined &&
    saved.reveal === undefined
  );
}

function writeLogoEffectSavedState(
  state: LogoEffectState,
  effectId: string,
  saved: LogoEffectSavedState
): LogoEffectState {
  if (logoEffectSavedStateIsEmpty(saved)) return removeEffectState(state, effectId);
  return {
    ...state,
    effects: {
      ...state.effects,
      [effectId]: saved,
    },
  };
}

function getLogoEffectDraft(state: LogoEffectState, effectId = state.activeEffectId) {
  return getLogoEffectSavedState(state, effectId)?.draft;
}

export function getLogoPlaybackOverride(state: LogoEffectState, effectId = state.activeEffectId) {
  return getLogoEffectSavedState(state, effectId)?.playback;
}

export function getLogoIdleOverride(state: LogoEffectState, effectId = state.activeEffectId) {
  return getLogoEffectSavedState(state, effectId)?.idle;
}

export function getLogoRevealEnabled(state: LogoEffectState, effectId = state.activeEffectId) {
  return getLogoEffectSavedState(state, effectId)?.reveal?.enabled ?? true;
}

export function getLogoPresentationOverride(
  state: LogoEffectState,
  effectId = state.activeEffectId
) {
  return getLogoEffectSavedState(state, effectId)?.presentation;
}

export function selectLogoEffect(state: LogoEffectState, effectId: string): LogoEffectState {
  if (effectId.length === 0) throw new TypeError("Logo effect ID must not be empty");
  return effectId === state.activeEffectId ? state : { ...state, activeEffectId: effectId };
}

export function setLogoEffectDraft(
  state: LogoEffectState,
  draft: LogoEffectDraft
): LogoEffectState {
  if (Object.keys(draft.values).length === 0) return resetLogoEffectDraft(state);

  const effectId = state.activeEffectId;
  return writeLogoEffectSavedState(state, effectId, {
    ...getLogoEffectSavedState(state, effectId),
    draft,
  });
}

type LogoEffectOverrideKey = "idle" | "playback" | "presentation";

function setLogoEffectOverride<Key extends LogoEffectOverrideKey>(
  state: LogoEffectState,
  effectId: string,
  key: Key,
  override: LogoEffectSavedState[Key]
) {
  const saved: LogoEffectSavedState = { ...getLogoEffectSavedState(state, effectId) };
  if (override === undefined || Object.keys(override).length === 0) {
    const { [key]: removed, ...withoutOverride } = saved;
    void removed;
    return writeLogoEffectSavedState(state, effectId, withoutOverride);
  }
  return writeLogoEffectSavedState(state, effectId, { ...saved, [key]: override });
}

export function setLogoPlaybackOverride(
  state: LogoEffectState,
  playback: LogoEffectPlaybackOverride | undefined,
  effectId = state.activeEffectId
) {
  return setLogoEffectOverride(state, effectId, "playback", playback);
}

export function setLogoIdleOverride(
  state: LogoEffectState,
  idle: LogoEffectIdleOverride | undefined,
  effectId = state.activeEffectId
) {
  return setLogoEffectOverride(state, effectId, "idle", idle);
}

export function setLogoRevealEnabled(
  state: LogoEffectState,
  enabled: boolean,
  effectId = state.activeEffectId
) {
  const saved: LogoEffectSavedState = { ...getLogoEffectSavedState(state, effectId) };
  if (enabled) delete saved.reveal;
  else saved.reveal = { enabled: false };
  return writeLogoEffectSavedState(state, effectId, saved);
}

export function setLogoPresentationOverride(
  state: LogoEffectState,
  presentation: LogoEffectPresentationOverride | undefined,
  effectId = state.activeEffectId
) {
  return setLogoEffectOverride(state, effectId, "presentation", presentation);
}

function removeEffectState(state: LogoEffectState, effectId: string): LogoEffectState {
  if (state.effects?.[effectId] === undefined) return state;
  const effects = Object.fromEntries(
    Object.entries(state.effects).filter(([candidate]) => candidate !== effectId)
  );
  if (Object.keys(effects).length > 0) return { ...state, effects };
  const { effects: removed, ...next } = state;
  void removed;
  return next;
}

function resetLogoEffectDraft(state: LogoEffectState): LogoEffectState {
  const effectId = state.activeEffectId;
  const saved = getLogoEffectSavedState(state, effectId);
  if (saved?.draft === undefined) return state;
  const { draft: removed, ...remaining } = saved;
  void removed;
  return writeLogoEffectSavedState(state, effectId, remaining);
}

export function resetLogoEffect(state: LogoEffectState): LogoEffectState {
  return removeEffectState(state, state.activeEffectId);
}

export function resetLogo(
  _state: LogoEffectState,
  defaultEffectId: string,
  defaultSeed: number
): LogoEffectState {
  return createLogoEffectState(defaultEffectId, defaultSeed);
}

export function applyLogoEffectDocumentRepair(
  current: LogoEffectState,
  source: LogoEffectState,
  repaired: LogoEffectState
) {
  return current === source ? repaired : current;
}

export function setLogoEffectPreviewSeed(state: LogoEffectState, seed: number): LogoEffectState {
  return {
    ...state,
    preview: { seed: requireUint32(seed) },
  };
}

function mergeLogoEffectValues(
  base: LogoEffectJsonObject,
  overrides: LogoEffectJsonObject
): LogoEffectJsonObject {
  const result = { ...base };
  for (const [key, override] of Object.entries(overrides)) {
    const baseValue = base[key];
    result[key] =
      isJsonObject(baseValue) && isJsonObject(override)
        ? mergeLogoEffectValues(baseValue, override)
        : override;
  }
  return result;
}

export function createSparseLogoEffectValues(
  base: LogoEffectJsonObject,
  values: LogoEffectJsonObject
): LogoEffectJsonObject {
  const result: Record<string, LogoEffectJsonValue> = {};
  for (const [key, value] of Object.entries(values)) {
    const baseValue = base[key];
    if (baseValue === undefined) {
      result[key] = value;
      continue;
    }
    if (isJsonObject(baseValue) && isJsonObject(value)) {
      const nested = createSparseLogoEffectValues(baseValue, value);
      if (Object.keys(nested).length > 0) result[key] = nested;
      continue;
    }
    if (!jsonValuesEqual(baseValue, value)) result[key] = value;
  }
  return result;
}

function glyphSelectionsEqual(left: LogoEffectGlyphSelection, right: LogoEffectGlyphSelection) {
  if (left.kind !== right.kind) return false;
  if (left.kind === "source") return true;
  return right.kind === "symbol" && left.value === right.value;
}

export function createSparseLogoEffectPresentationOverride(
  base: LogoEffectPresentation,
  presentation: LogoEffectPresentation
): LogoEffectPresentationOverride | undefined {
  const result: LogoEffectPresentationOverride = {};
  for (const key of [
    "contrast",
    "glow",
    "grayscale",
    "pixelSize",
    "saturation",
    "scanlines",
  ] as const) {
    if (!Object.is(presentation[key], base[key])) result[key] = presentation[key];
  }

  const glyphs: LogoEffectGlyphPresentationOverride = {};
  if (!glyphSelectionsEqual(presentation.glyphs.default, base.glyphs.default)) {
    glyphs.default = presentation.glyphs.default;
  }
  const overrides: Partial<Record<LogoGlyphChannel, LogoEffectGlyphSelection>> = {};
  for (const channel of LOGO_GLYPH_CHANNELS) {
    const mergedSelection = base.glyphs.overrides[channel] ?? presentation.glyphs.default;
    const desiredSelection = presentation.glyphs.overrides[channel] ?? presentation.glyphs.default;
    if (!glyphSelectionsEqual(mergedSelection, desiredSelection)) {
      overrides[channel] = desiredSelection;
    }
  }
  if (Object.keys(overrides).length > 0) glyphs.overrides = overrides;
  if (Object.keys(glyphs).length > 0) result.glyphs = glyphs;

  return Object.keys(result).length === 0 ? undefined : result;
}

export function createSparseLogoEffectPlaybackOverride(
  base: LogoEffectPlayback,
  playback: LogoEffectPlayback
): LogoEffectPlaybackOverride | undefined {
  return logoEffectPlaybackEqual(base, playback) ? undefined : { ...playback };
}

function requirePositiveRate(value: number | undefined, label: string) {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive finite number`);
  }
  return value;
}

function mergePlayback(
  base: LogoEffectPlayback,
  overrides: LogoEffectPlaybackOverride | undefined,
  supportsAmbient: boolean
): LogoEffectPlayback {
  const requestedMode = overrides?.mode ?? base.mode;
  const mode = requestedMode === "ambient" && !supportsAmbient ? "once" : requestedMode;
  const revealRate = requirePositiveRate(overrides?.revealRate ?? base.revealRate, "Reveal rate");
  if (mode === "once") return { mode, revealRate };

  const baseAmbientRate = base.mode === "once" ? undefined : base.ambientRate;
  const ambientRate = requirePositiveRate(
    overrides?.ambientRate ?? baseAmbientRate ?? DEFAULT_AMBIENT_RATE,
    "Ambient rate"
  );
  if (mode === "ambient") return { ambientRate, mode, revealRate };

  return mergeRepeatPlayback(base, overrides, supportsAmbient, ambientRate, revealRate);
}

function mergeRepeatPlayback(
  base: LogoEffectPlayback,
  overrides: LogoEffectPlaybackOverride | undefined,
  supportsAmbient: boolean,
  ambientRate: number,
  revealRate: number
): LogoEffectPlayback {
  const repeatDelayMs =
    overrides?.repeatDelayMs ??
    (base.mode === "repeat" ? base.repeatDelayMs : DEFAULT_REPEAT_DELAY_MS);
  const repeatDelayMotion = !supportsAmbient
    ? "settled"
    : (overrides?.repeatDelayMotion ??
      (base.mode === "repeat" ? base.repeatDelayMotion : "ambient"));
  if (
    repeatDelayMs === undefined ||
    !Number.isFinite(repeatDelayMs) ||
    repeatDelayMs < 0 ||
    repeatDelayMotion === undefined
  ) {
    throw new TypeError("Repeat playback requires delay timing and motion");
  }
  return {
    ambientRate,
    mode: "repeat",
    repeatDelayMotion,
    repeatDelayMs,
    revealRate,
  };
}

function mergeGlyphPresentation(
  base: LogoEffectGlyphPresentation,
  overrides: LogoEffectGlyphPresentationOverride | undefined
): LogoEffectGlyphPresentation {
  if (overrides === undefined) return base;
  return {
    default: overrides.default ?? base.default,
    overrides: { ...base.overrides, ...overrides.overrides },
  };
}

function mergePresentation(
  base: LogoEffectPresentation,
  overrides: LogoEffectPresentationOverride | undefined
): LogoEffectPresentation {
  if (overrides === undefined) return base;
  return {
    contrast: overrides.contrast ?? base.contrast,
    glow: overrides.glow ?? base.glow,
    grayscale: overrides.grayscale ?? base.grayscale,
    glyphs: mergeGlyphPresentation(base.glyphs, overrides.glyphs),
    pixelSize: overrides.pixelSize ?? base.pixelSize,
    saturation: overrides.saturation ?? base.saturation,
    scanlines: overrides.scanlines ?? base.scanlines,
  };
}

type CanonicalLogoEffectDraft<Id extends string> = {
  prepared: PreparedLogoEffect<Id>;
  values: LogoEffectJsonObject;
};

function prepareCanonicalLogoEffectDraft<Id extends string>(
  draft: LogoEffectDraft,
  base: PreparedLogoEffect<Id>,
  playback: LogoEffectPlayback,
  presentation: LogoEffectPresentation,
  definition: LoadedLogoEffectDefinition<Id>,
  resolveColor: LogoEffectColorResolver
): CanonicalLogoEffectDraft<Id> | null {
  try {
    const prepared = definition.prepareJson(
      {
        playback,
        presentation,
        values: mergeLogoEffectValues(base.values, draft.values),
      },
      resolveColor
    );
    return {
      prepared,
      values: createSparseLogoEffectValues(base.values, prepared.values),
    };
  } catch {
    return null;
  }
}

function writeCanonicalDraft(document: LogoEffectState, values: LogoEffectJsonObject) {
  if (Object.keys(values).length === 0) return resetLogoEffectDraft(document);
  const current = getLogoEffectDraft(document);
  if (current !== undefined && jsonValuesEqual(current.values, values)) {
    return document;
  }
  return setLogoEffectDraft(document, { values });
}

export function resolveActiveLogoEffect<Id extends string>(
  state: LogoEffectState,
  definition: LoadedLogoEffectDefinition<Id>,
  resolveColor: LogoEffectColorResolver
): ResolvedLogoEffect<Id> {
  if (state.activeEffectId !== definition.id) {
    throw new TypeError(
      `Cannot resolve active effect ${state.activeEffectId} with ${definition.id}`
    );
  }
  let document = state;
  const base = definition.prepareDefaults(resolveColor);
  const playback = mergePlayback(
    base.playback,
    getLogoPlaybackOverride(document, definition.id),
    definition.capabilities.ambient
  );
  const presentation = mergePresentation(
    base.presentation,
    getLogoPresentationOverride(document, definition.id)
  );
  let prepared: PreparedLogoEffect<Id> | undefined;

  const draft = getLogoEffectDraft(document);
  if (draft !== undefined) {
    const canonical = prepareCanonicalLogoEffectDraft(
      draft,
      base,
      playback,
      presentation,
      definition,
      resolveColor
    );
    if (canonical === null || Object.keys(canonical.values).length === 0) {
      document = resetLogoEffectDraft(document);
    } else {
      document = writeCanonicalDraft(document, canonical.values);
      prepared = canonical.prepared;
    }
  }

  prepared ??= definition.prepareJson(
    { playback, presentation, values: base.values },
    resolveColor
  );
  return { definition, document, prepared };
}

function splitBehavior(values: LogoEffectJsonObject) {
  const behaviorValue = values.behavior;
  if (behaviorValue !== undefined && !isJsonObject(behaviorValue)) {
    throw new TypeError("Logo effect behavior must be a settings group");
  }
  const effect: Record<string, LogoEffectJsonValue> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key !== "behavior") effect[key] = value;
  }
  return { behavior: behaviorValue ?? {}, effect };
}

function exportSource(
  source: LogoEffectSourceReference | undefined
): LogoEffectSourceReference | null {
  if (source === undefined) return null;
  return {
    attribution: source.attribution,
    commit: source.commit,
    effect: source.effect,
    project: source.project,
    repository: source.repository,
    sourceUrl: source.sourceUrl,
    version: source.version,
  };
}

export function materializeLogoEffectExport<Id extends string>(
  resolved: ResolvedLogoEffect<Id>,
  includePreviewSeed = false
): LogoEffectExport {
  const { behavior, effect } = splitBehavior(resolved.prepared.values);
  const effectId = parseLogoEffectId(resolved.definition.id);
  const idle =
    effectId === null
      ? undefined
      : resolveLogoEffectIdle(effectId, getLogoIdleOverride(resolved.document, effectId));
  const base: Omit<LogoEffectExport, "preview"> = {
    behavior,
    effect,
    effectId: resolved.definition.id,
    playback: resolved.prepared.playback,
    presentation: resolved.prepared.presentation,
    source: exportSource(resolved.definition.source),
  };
  if (idle !== undefined) base.idle = idle;
  if (effectId !== null) {
    base.reveal = { enabled: getLogoRevealEnabled(resolved.document, effectId) };
  }
  return includePreviewSeed ? { ...base, preview: { seed: resolved.document.preview.seed } } : base;
}

function glyphSelectionJson(selection: LogoEffectGlyphSelection): LogoEffectJsonObject {
  return selection.kind === "source"
    ? { kind: "source" }
    : { kind: "symbol", value: selection.value };
}

function playbackJson(playback: LogoEffectPlayback): LogoEffectJsonObject {
  if (playback.mode === "once") {
    return { mode: playback.mode, revealRate: playback.revealRate };
  }
  if (playback.mode === "ambient") {
    return {
      ambientRate: playback.ambientRate,
      mode: playback.mode,
      revealRate: playback.revealRate,
    };
  }
  return {
    ambientRate: playback.ambientRate,
    mode: playback.mode,
    repeatDelayMotion: playback.repeatDelayMotion,
    repeatDelayMs: playback.repeatDelayMs,
    revealRate: playback.revealRate,
  };
}

function presentationJson(presentation: LogoEffectPresentation): LogoEffectJsonObject {
  const overrides: Record<string, LogoEffectJsonValue> = {};
  for (const channel of LOGO_GLYPH_CHANNELS) {
    const selection = presentation.glyphs.overrides[channel];
    if (selection !== undefined) overrides[channel] = glyphSelectionJson(selection);
  }
  return {
    contrast: presentation.contrast,
    glow: presentation.glow,
    grayscale: presentation.grayscale,
    glyphs: {
      default: glyphSelectionJson(presentation.glyphs.default),
      overrides,
    },
    pixelSize: presentation.pixelSize,
    saturation: presentation.saturation,
    scanlines: presentation.scanlines,
  };
}

function idleJson(idle: LogoEffectIdle): LogoEffectJsonObject {
  return {
    animateGradient: idle.animateGradient,
    enabled: idle.enabled,
    gradientAngle: idle.gradientAngle,
    gradientDirection: idle.gradientDirection,
    gradientSpeed: idle.gradientSpeed,
    intensity: idle.intensity,
    motion: idle.motion,
    speed: idle.speed,
  };
}

function sourceJson(source: LogoEffectSourceReference | null): LogoEffectJsonValue {
  if (source === null) return null;
  return {
    attribution: source.attribution,
    commit: source.commit,
    effect: source.effect,
    project: source.project,
    repository: source.repository,
    sourceUrl: source.sourceUrl,
    version: source.version,
  };
}

function exportJson(value: LogoEffectExport): LogoEffectJsonObject {
  const result: Record<string, LogoEffectJsonValue> = {};
  result.behavior = value.behavior;
  result.effect = value.effect;
  result.effectId = value.effectId;
  result.playback = playbackJson(value.playback);
  result.presentation = presentationJson(value.presentation);
  result.source = sourceJson(value.source);
  if (value.idle !== undefined) result.idle = idleJson(value.idle);
  if (value.preview !== undefined) result.preview = { seed: value.preview.seed };
  if (value.reveal !== undefined) result.reveal = { enabled: value.reveal.enabled };
  return result;
}

function canonicalJson(value: LogoEffectJsonValue): LogoEffectJsonValue {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!isJsonObject(value)) return value;
  const result: Record<string, LogoEffectJsonValue> = {};
  for (const key of Object.keys(value).toSorted()) {
    result[key] = canonicalJson(value[key]);
  }
  return result;
}

export function serializeLogoEffectExport(value: LogoEffectExport) {
  return JSON.stringify(canonicalJson(exportJson(value)), null, 2);
}

export function serializeLogoEffectState(state: LogoEffectState) {
  return JSON.stringify(state);
}
