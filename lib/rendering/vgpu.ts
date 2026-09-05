import { init, VGPUError, type Gpu, type InitOptions } from "vgpu";

const RENDERER_LIMITS = {
  maxStorageBuffersInVertexStage: 1,
} satisfies NonNullable<InitOptions["requiredLimits"]>;

type UnsupportedErrorFactory = (message: string, options?: ErrorOptions) => Error;

type RendererGpuOptions = {
  label: string;
  signal?: AbortSignal;
  unsupportedError: UnsupportedErrorFactory;
};

export function assertWebGpuAvailable(unsupportedError: UnsupportedErrorFactory) {
  if (navigator.gpu === undefined) {
    throw unsupportedError("WebGPU is unavailable in this browser.");
  }
}

export async function createRendererGpu({
  label,
  signal,
  unsupportedError,
}: RendererGpuOptions): Promise<Gpu> {
  assertWebGpuAvailable(unsupportedError);

  const gpu = await init({
    label,
    powerPreference: "low-power",
    requiredLimits: RENDERER_LIMITS,
  }).catch((cause: unknown) => {
    if (cause instanceof VGPUError && cause.code === "VGPU-RING1-UNSUPPORTED") {
      throw unsupportedError(cause.message, { cause });
    }
    throw cause;
  });

  if (signal?.aborted) {
    gpu.dispose();
    throw new DOMException(`${label} initialization was aborted.`, "AbortError");
  }
  return gpu;
}

export function observeRendererGpu(gpu: Gpu, label: string, onError: (error: Error) => void) {
  let active = true;
  const unsubscribeError = gpu.onError(onError);

  void gpu.gpu.lost.then((info) => {
    if (!active || gpu.disposed) return;
    const detail = info.message ? `: ${info.message}` : "";
    onError(new Error(`${label} GPU device was lost${detail}`));
  });

  return () => {
    active = false;
    unsubscribeError();
  };
}
