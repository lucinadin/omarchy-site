import type {
  CaptureEffectId,
  OverlayEffectId,
  ScreenOverlayTargetId,
} from "@/lib/effects/screen/registry";
import type { CaptureEffectSettings, OverlayEffectSettings } from "@/lib/effects/screen/settings";
import type { RendererController } from "@/lib/rendering/types";

export type CaptureEffectState = {
  effect: CaptureEffectId;
  settings: CaptureEffectSettings;
};

export type OverlayEffectState = {
  effect: OverlayEffectId;
  settings: OverlayEffectSettings;
  target: ScreenOverlayTargetId;
};

export type ScreenEffectsState = {
  capture: CaptureEffectState;
  overlay: OverlayEffectState;
};

export type CaptureRendererController = RendererController<CaptureEffectState> & {
  refresh: () => void;
};
