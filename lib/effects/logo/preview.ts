import { LOGO_EFFECT_STORAGE_KEYS } from "@/lib/effects/logo/lifecycle";
import { storageGet, storageSetJson } from "@/lib/settings/storage";

export const LOGO_PREVIEW_MAX_LENGTH = 384_000;
export const LOGO_PREVIEW_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/u;

let captureRevision = 0;

export function clearLogoPreview() {
  document.documentElement.style.removeProperty("--logo-preview");
  document.documentElement.style.removeProperty("--logo-preview-fill");
}

// Capture once per prepared effect, never on the animation's recurring frames.
// PNG preserves the actual shader output, including custom glyphs and filters.
export function saveLogoPreview(canvas: HTMLCanvasElement, state: string) {
  captureRevision += 1;
  const revision = captureRevision;
  const root = document.documentElement;
  const theme = root.dataset.theme;
  const isCurrent = () =>
    revision === captureRevision &&
    root.dataset.theme === theme &&
    storageGet(LOGO_EFFECT_STORAGE_KEYS.state) === state;

  try {
    canvas.toBlob((blob) => {
      if (!blob || blob.size > (LOGO_PREVIEW_MAX_LENGTH * 3) / 4 || !isCurrent()) return;
      const reader = new FileReader();
      reader.addEventListener(
        "load",
        () => {
          const image = reader.result?.toString() ?? "";
          if (
            !isCurrent() ||
            image.length > LOGO_PREVIEW_MAX_LENGTH ||
            !LOGO_PREVIEW_DATA_URL.test(image)
          )
            return;
          storageSetJson(LOGO_EFFECT_STORAGE_KEYS.preview, { image, state, theme, version: 1 });
          root.style.setProperty("--logo-preview", `url("${image}")`);
          root.style.setProperty("--logo-preview-fill", "transparent");
        },
        { once: true }
      );
      reader.readAsDataURL(blob);
    }, "image/png");
  } catch {
    // An optional preview must not affect rendering when capture is unavailable.
  }
}
