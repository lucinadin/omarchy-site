"use client";

type ClipboardWriteResult = "copied" | "failed" | "unavailable";
type ShareOrCopyResult = ClipboardWriteResult | "cancelled" | "shared";

export async function writeClipboardText(text: string): Promise<ClipboardWriteResult> {
  if (!navigator.clipboard) return "unavailable";

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

export async function shareOrCopy(
  title: string,
  text: string,
  url: string
): Promise<ShareOrCopyResult> {
  if (!navigator.share) return writeClipboardText(url);

  try {
    await navigator.share({ text, title, url });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";

    const fallback = await writeClipboardText(url);
    return fallback === "unavailable" ? "failed" : fallback;
  }
}
