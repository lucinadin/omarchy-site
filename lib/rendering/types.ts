export type RendererStatus = "error" | "idle" | "live" | "loading" | "unsupported";

export type ColorAdjustmentSettings = {
  contrast: number;
  grayscale: number;
  saturation: number;
};

export type RendererLifecycleCallbacks = {
  onError: (cause: unknown) => void;
  onLive: () => void;
};

export type RendererController<State> = {
  configure: (state: State) => void;
  dispose: () => void;
};
