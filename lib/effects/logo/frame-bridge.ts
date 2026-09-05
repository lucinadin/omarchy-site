export const LOGO_EFFECT_INSTANCE_WORDS = 20;
export const LOGO_EFFECT_INSTANCE_BYTES =
  LOGO_EFFECT_INSTANCE_WORDS * Uint32Array.BYTES_PER_ELEMENT;

type LogoFrameSnapshot = {
  bytes: Uint8Array<ArrayBuffer>;
  colorAdjustment: readonly [contrast: number, saturation: number, grayscale: number, padding: 0];
  instanceCount: number;
};

type LogoFrameListener = (snapshot: LogoFrameSnapshot | null) => void;

let currentFrame: LogoFrameSnapshot | null = null;
let currentOwner: symbol | null = null;
const listeners = new Set<LogoFrameListener>();

function notifyLogoFrameListeners() {
  for (const listener of listeners) listener(currentFrame);
}

export function publishLogoFrame(owner: symbol, snapshot: LogoFrameSnapshot) {
  const expectedByteLength = snapshot.instanceCount * LOGO_EFFECT_INSTANCE_BYTES;
  if (snapshot.bytes.byteLength !== expectedByteLength) {
    throw new RangeError(
      `Logo frame contains ${snapshot.bytes.byteLength} bytes; expected ${expectedByteLength}`
    );
  }
  currentOwner = owner;
  currentFrame = snapshot;
  notifyLogoFrameListeners();
}

export function clearLogoFrame(owner: symbol) {
  if (currentOwner !== owner) return;
  currentOwner = null;
  currentFrame = null;
  notifyLogoFrameListeners();
}

export function subscribeToLogoFrame(listener: LogoFrameListener) {
  listeners.add(listener);
  try {
    listener(currentFrame);
  } catch (error) {
    listeners.delete(listener);
    throw error;
  }
  return () => listeners.delete(listener);
}
