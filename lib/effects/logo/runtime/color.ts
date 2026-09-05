import type { Rgb } from "@/lib/color";
import { clamp } from "@/lib/effects/logo/runtime/math";
import type { LogoCell, LogoPalette } from "@/lib/effects/logo/types";

export function mixColor(from: Rgb, to: Rgb, amount: number): Rgb {
  const progress = clamp(amount);
  return [
    Math.round(from[0] + (to[0] - from[0]) * progress),
    Math.round(from[1] + (to[1] - from[1]) * progress),
    Math.round(from[2] + (to[2] - from[2]) * progress),
  ];
}

export function logoCellColor(
  cell: Pick<LogoCell, "row">,
  palette: LogoPalette,
  rowCount = 10
): Rgb {
  return mixColor(
    palette.final,
    palette.ciphertext[cell.row % palette.ciphertext.length],
    0.12 + (cell.row / Math.max(1, rowCount - 1)) * 0.24
  );
}

export function sampleColorStops(stops: readonly Rgb[], position: number, loop = false): Rgb {
  if (stops.length === 0) return [255, 255, 255];
  if (stops.length === 1) return stops[0];

  const progress = loop ? ((position % 1) + 1) % 1 : clamp(position);
  const scaled = progress * (stops.length - (loop ? 0 : 1));
  const left = Math.floor(scaled) % stops.length;
  const right = (left + 1) % stops.length;
  return mixColor(stops[left], stops[right], scaled - Math.floor(scaled));
}

export function createLivePaletteColorStops(
  palette: LogoPalette,
  update: (stops: Rgb[], currentPalette: LogoPalette) => void
) {
  const stops: Rgb[] = [];
  let bright: Rgb | undefined;
  let ciphertext: LogoPalette["ciphertext"] | undefined;
  let final: Rgb | undefined;
  let laser: LogoPalette["laser"] | undefined;
  let muted: Rgb | undefined;

  const current = () => {
    if (
      bright !== palette.bright ||
      ciphertext !== palette.ciphertext ||
      final !== palette.final ||
      laser !== palette.laser ||
      muted !== palette.muted
    ) {
      update(stops, palette);
      bright = palette.bright;
      ciphertext = palette.ciphertext;
      final = palette.final;
      laser = palette.laser;
      muted = palette.muted;
    }
    return stops;
  };

  current();
  return current;
}
