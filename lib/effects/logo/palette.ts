import { parseHexColor, type Rgb } from "@/lib/color";
import type { LogoPalette } from "@/lib/effects/logo/types";

export function readLogoPalette(source: Element = document.documentElement): LogoPalette {
  const style = getComputedStyle(source);
  const color = (property: string, fallback: Rgb) =>
    parseHexColor(style.getPropertyValue(property).trim()) ?? fallback;

  return {
    bright: color("--bright-foreground", [192, 202, 245]),
    ciphertext: [
      color("--ansi-green", [158, 206, 106]),
      color("--ansi-bright-green", [159, 224, 68]),
      color("--ansi-cyan", [68, 157, 171]),
    ],
    final: color("--primary", [122, 162, 247]),
    laser: [
      color("--ansi-yellow", [224, 175, 104]),
      color("--ansi-orange", [255, 158, 100]),
      color("--ansi-cyan", [68, 157, 171]),
    ],
    muted: color("--muted-foreground", [120, 130, 170]),
  };
}
