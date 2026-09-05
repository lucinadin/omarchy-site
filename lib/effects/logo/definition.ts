import type { LogoEffectColorResolver } from "@/lib/effects/logo/color-bindings";
import {
  getLogoEffectUpdateMode,
  parseLogoEffectSchemaValues,
  resolveLogoEffectSchemaValues,
  serializeLogoEffectSchemaValues,
  type LogoEffectAuthorValues,
  type LogoEffectChangeMode,
  type LogoEffectRuntimeValues,
  type LogoEffectSchema,
} from "@/lib/effects/logo/schema";
import type {
  LogoEffectContext,
  LogoGlyphChannel,
  LogoEffectRuntimeCore,
} from "@/lib/effects/logo/types";
import type { JsonObject as LogoEffectJsonObject } from "@/lib/json";
import type { ColorAdjustmentSettings } from "@/lib/rendering/types";

export type LogoEffectAuthorRuntime<Values> = LogoEffectRuntimeCore & {
  configure: (values: Values) => void;
};

export type LogoEffectPlayback =
  | {
      ambientRate: number;
      mode: "ambient";
      revealRate: number;
    }
  | {
      mode: "once";
      revealRate: number;
    }
  | {
      ambientRate: number;
      mode: "repeat";
      repeatDelayMotion: "ambient" | "settled";
      repeatDelayMs: number;
      revealRate: number;
    };

export function logoEffectPlaybackEqual(left: LogoEffectPlayback, right: LogoEffectPlayback) {
  if (left.mode !== right.mode || left.revealRate !== right.revealRate) return false;
  if (left.mode === "once" || right.mode === "once") return true;
  if (left.ambientRate !== right.ambientRate) return false;
  if (left.mode === "ambient" || right.mode === "ambient") return true;
  return (
    left.repeatDelayMotion === right.repeatDelayMotion && left.repeatDelayMs === right.repeatDelayMs
  );
}

export type LogoEffectGlyphSelection = { kind: "source" } | { kind: "symbol"; value: string };

export type LogoEffectGlyphPresentation = {
  default: LogoEffectGlyphSelection;
  overrides: Partial<Readonly<Record<LogoGlyphChannel, LogoEffectGlyphSelection>>>;
};

export type LogoEffectPresentation = ColorAdjustmentSettings & {
  glow: number;
  glyphs: LogoEffectGlyphPresentation;
  pixelSize: number;
  scanlines: number;
};

type LogoEffectConfiguration<Values> = {
  playback: LogoEffectPlayback;
  presentation: LogoEffectPresentation;
  values: Values;
};

type LogoEffectCapabilities = {
  ambient: boolean;
};

type LogoEffectDefaults<Values> = LogoEffectConfiguration<Values> & {
  capabilities?: LogoEffectCapabilities;
};

export type LogoEffectSourceReference = {
  attribution: string;
  commit: string;
  effect: string;
  project: string;
  repository: string;
  sourceUrl: string;
  version: string;
};

export type PreparedLogoEffect<Id extends string = string> = {
  applyTo: (runtime: LogoEffectRuntimeCore) => LogoEffectChangeMode | "different-effect";
  bundleMarker: string;
  createRuntime: (context: LogoEffectContext) => LogoEffectRuntimeCore;
  id: Id;
  playback: LogoEffectPlayback;
  presentation: LogoEffectPresentation;
  values: LogoEffectJsonObject;
};

export type LoadedLogoEffectDefinition<Id extends string = string> = {
  bundleMarker: string;
  capabilities: LogoEffectCapabilities;
  id: Id;
  label: string;
  prepareJson: (
    configuration: LogoEffectConfiguration<LogoEffectJsonObject>,
    resolveColor: LogoEffectColorResolver
  ) => PreparedLogoEffect<Id>;
  prepareDefaults: (resolveColor: LogoEffectColorResolver) => PreparedLogoEffect<Id>;
  schema: LogoEffectSchema;
  source?: LogoEffectSourceReference;
};

export type LogoEffectDefinitionModule<Id extends string = string> = {
  readonly logoEffect: LoadedLogoEffectDefinition<Id>;
};

type LogoEffectDefinition<Id extends string, Schema extends LogoEffectSchema> = Omit<
  LoadedLogoEffectDefinition<Id>,
  "schema"
> & {
  defaults: LogoEffectDefaults<LogoEffectAuthorValues<Schema>>;
  prepare: (
    configuration: LogoEffectConfiguration<LogoEffectAuthorValues<Schema>>,
    resolveColor: LogoEffectColorResolver
  ) => PreparedLogoEffect<Id>;
  schema: Schema;
};

type LogoEffectDefinitionInput<Id extends string, Schema extends LogoEffectSchema> = {
  createRuntime: (
    context: LogoEffectContext,
    values: LogoEffectRuntimeValues<Schema>
  ) => LogoEffectAuthorRuntime<LogoEffectRuntimeValues<Schema>>;
  defaults: LogoEffectDefaults<LogoEffectAuthorValues<Schema>>;
  id: Id;
  label: string;
  schema: Schema;
  source?: LogoEffectSourceReference;
};

type LogoEffectRuntimeEntry<Values> = {
  runtime: LogoEffectAuthorRuntime<Values>;
  values: Values;
};

function playbackUsesAmbient(playback: LogoEffectPlayback) {
  return (
    playback.mode === "ambient" ||
    (playback.mode === "repeat" && playback.repeatDelayMotion === "ambient")
  );
}

function resolveCapabilities<Values>(defaults: LogoEffectDefaults<Values>): LogoEffectCapabilities {
  const playbackHasAmbient = playbackUsesAmbient(defaults.playback);
  const ambient = defaults.capabilities?.ambient ?? true;
  if (!ambient && playbackHasAmbient) {
    throw new TypeError(
      "Logo effect defaults cannot use ambient playback without ambient capability"
    );
  }
  return { ambient };
}

export function defineLogoEffect<const Id extends string, const Schema extends LogoEffectSchema>(
  specification: LogoEffectDefinitionInput<Id, Schema>
): LogoEffectDefinition<Id, Schema> {
  const bundleMarker = `omarchy-logo-effect:${specification.id}`;
  const entries = new WeakMap<
    LogoEffectRuntimeCore,
    LogoEffectRuntimeEntry<LogoEffectRuntimeValues<Schema>>
  >();

  function prepare(
    configuration: LogoEffectConfiguration<LogoEffectAuthorValues<Schema>>,
    resolveColor: LogoEffectColorResolver
  ): PreparedLogoEffect<Id> {
    const serializedValues = serializeLogoEffectSchemaValues(
      specification.schema,
      configuration.values
    );
    const runtimeValues = resolveLogoEffectSchemaValues(
      specification.schema,
      configuration.values,
      resolveColor
    );

    return {
      applyTo(runtime) {
        const entry = entries.get(runtime);
        if (entry === undefined) return "different-effect";

        const update = getLogoEffectUpdateMode(specification.schema, entry.values, runtimeValues);
        if (update === "live") entry.runtime.configure(runtimeValues);
        if (update === "live" || update === "none") {
          entry.values = runtimeValues;
        }
        return update;
      },
      bundleMarker,
      createRuntime(context) {
        const runtime = specification.createRuntime(context, runtimeValues);
        entries.set(runtime, { runtime, values: runtimeValues });
        return runtime;
      },
      id: specification.id,
      playback: configuration.playback,
      presentation: configuration.presentation,
      values: serializedValues,
    };
  }

  function prepareJson(
    configuration: LogoEffectConfiguration<LogoEffectJsonObject>,
    resolveColor: LogoEffectColorResolver
  ) {
    const parsed = parseLogoEffectSchemaValues(specification.schema, configuration.values);
    return prepare({ ...configuration, values: parsed }, resolveColor);
  }

  return {
    bundleMarker,
    capabilities: resolveCapabilities(specification.defaults),
    defaults: specification.defaults,
    id: specification.id,
    label: specification.label,
    prepare,
    prepareDefaults: (resolveColor) => prepare(specification.defaults, resolveColor),
    prepareJson,
    schema: specification.schema,
    source: specification.source,
  };
}
