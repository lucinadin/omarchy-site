export const LOGO_GLYPHS = ["█", "▓", "#", "@", "*", "+", "0", "1"] as const;

const GLYPH_PATTERNS = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "<": ["00010", "00100", "01000", "10000", "01000", "00100", "00010"],
  ">": ["01000", "00100", "00010", "00001", "00010", "00100", "01000"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
  "{": ["00010", "00100", "00100", "01000", "00100", "00100", "00010"],
  "}": ["01000", "00100", "00100", "00010", "00100", "00100", "01000"],
  "#": ["01010", "11111", "01010", "01010", "11111", "01010", "01010"],
  "@": ["01110", "10001", "10111", "10101", "10111", "10000", "01110"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "%": ["11001", "11010", "00100", "01000", "10110", "00110", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "\\": ["10000", "01000", "01000", "00100", "00010", "00010", "00001"],
  "|": ["00100", "00100", "00100", "00100", "00100", "00100", "00100"],
  "^": ["00100", "01010", "10001", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "00110", "00100", "01000"],
} as const satisfies Readonly<Record<string, readonly string[]>>;

const GLYPH_STYLES = {
  bitmap: 0,
  full: 1,
  lower: 2,
  upper: 3,
  ditherLight: 4,
  ditherMedium: 5,
  ditherDense: 6,
  spark: 7,
  fontBitmap: 8,
} as const;

const GLYPH_FONT_BITMAP_COLUMNS = 12;
const GLYPH_FONT_BITMAP_ROWS = 16;

type GlyphBitmap = readonly [number, number, number, number, number, number];

type EncodedGlyph = {
  bitmap: GlyphBitmap;
  style: number;
};

export type GlyphEncoder = (glyph: string, isSpark?: boolean) => EncodedGlyph;

const EMPTY_BITMAP: GlyphBitmap = [0, 0, 0, 0, 0, 0];
const FONT_RASTER_SCALE = 2;
const FONT_RASTER_WIDTH = GLYPH_FONT_BITMAP_COLUMNS * FONT_RASTER_SCALE;
const FONT_RASTER_HEIGHT = GLYPH_FONT_BITMAP_ROWS * FONT_RASTER_SCALE;
const FONT_RASTER_SIZE_PX = 28;
const FONT_RASTER_INSET_PX = 2;
const FONT_RASTER_ALPHA_THRESHOLD = 48;
const FONT_LOAD_PROBE = "Mｱ▁";

function encodePattern(pattern: readonly string[]): EncodedGlyph {
  let low = 0;
  let high = 0;

  pattern.forEach((row, y) => {
    Array.from(row).forEach((pixel, x) => {
      if (pixel !== "1") return;
      const bit = y * 5 + x;
      if (bit < 32) low = (low | (1 << bit)) >>> 0;
      else high = (high | (1 << (bit - 32))) >>> 0;
    });
  });

  return { bitmap: [low, high, 0, 0, 0, 0], style: GLYPH_STYLES.bitmap };
}

const ENCODED_PATTERNS = new Map(
  Object.entries(GLYPH_PATTERNS).map(([glyph, pattern]) => [glyph, encodePattern(pattern)])
);
const TRUE_FAILURE_ENCODED_GLYPH = encodePattern(GLYPH_PATTERNS["*"]);

function encodedStyle(style: number): EncodedGlyph {
  return { bitmap: EMPTY_BITMAP, style };
}

function firstUnicodeScalar(glyph: string) {
  const scalar = Array.from(glyph)[0];
  if (!scalar) return null;
  const codePoint = scalar.codePointAt(0);
  if (codePoint === undefined || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return null;
  return scalar;
}

function rasterizeScalar(
  context: CanvasRenderingContext2D,
  scalar: string,
  font: string
): EncodedGlyph | null {
  try {
    context.clearRect(0, 0, FONT_RASTER_WIDTH, FONT_RASTER_HEIGHT);
    context.fillStyle = "#fff";
    context.font = font;
    context.textAlign = "left";
    context.textBaseline = "alphabetic";

    const metrics = context.measureText(scalar);
    const left = metrics.actualBoundingBoxLeft;
    const right = metrics.actualBoundingBoxRight;
    const ascent = metrics.actualBoundingBoxAscent;
    const descent = metrics.actualBoundingBoxDescent;
    const measuredWidth = Math.max(1, left + right, metrics.width);
    const measuredHeight = Math.max(1, ascent + descent);
    const scale = Math.min(
      1,
      (FONT_RASTER_WIDTH - FONT_RASTER_INSET_PX * 2) / measuredWidth,
      (FONT_RASTER_HEIGHT - FONT_RASTER_INSET_PX * 2) / measuredHeight
    );

    context.save();
    context.translate(FONT_RASTER_WIDTH / 2, FONT_RASTER_HEIGHT / 2);
    context.scale(scale, scale);
    context.fillText(scalar, (left - right) / 2, (ascent - descent) / 2);
    context.restore();

    const pixels = context.getImageData(0, 0, FONT_RASTER_WIDTH, FONT_RASTER_HEIGHT).data;
    const words = new Uint32Array(6);
    for (let row = 0; row < GLYPH_FONT_BITMAP_ROWS; row += 1) {
      for (let column = 0; column < GLYPH_FONT_BITMAP_COLUMNS; column += 1) {
        let maximumAlpha = 0;
        for (let sampleY = 0; sampleY < FONT_RASTER_SCALE; sampleY += 1) {
          for (let sampleX = 0; sampleX < FONT_RASTER_SCALE; sampleX += 1) {
            const sourceX = column * FONT_RASTER_SCALE + sampleX;
            const sourceY = row * FONT_RASTER_SCALE + sampleY;
            const alpha = pixels[(sourceY * FONT_RASTER_WIDTH + sourceX) * 4 + 3] ?? 0;
            maximumAlpha = Math.max(maximumAlpha, alpha);
          }
        }
        if (maximumAlpha < FONT_RASTER_ALPHA_THRESHOLD) continue;
        const bit = row * GLYPH_FONT_BITMAP_COLUMNS + column;
        const word = Math.floor(bit / 32);
        words[word] = ((words[word] ?? 0) | (1 << (bit % 32))) >>> 0;
      }
    }

    return {
      bitmap: [
        words[0] ?? 0,
        words[1] ?? 0,
        words[2] ?? 0,
        words[3] ?? 0,
        words[4] ?? 0,
        words[5] ?? 0,
      ],
      style: GLYPH_STYLES.fontBitmap,
    };
  } catch {
    return null;
  }
}

export async function createGlyphEncoder(reference: Element): Promise<GlyphEncoder> {
  const fontFamily = getComputedStyle(reference).fontFamily || "ui-monospace, monospace";
  const font = `400 ${FONT_RASTER_SIZE_PX}px ${fontFamily}`;
  let context: CanvasRenderingContext2D | null = null;

  try {
    await document.fonts.ready;
    await document.fonts.load(font, FONT_LOAD_PROBE);
    const rasterCanvas = document.createElement("canvas");
    rasterCanvas.width = FONT_RASTER_WIDTH;
    rasterCanvas.height = FONT_RASTER_HEIGHT;
    context = rasterCanvas.getContext("2d", { willReadFrequently: true });
  } catch {
    context = null;
  }

  const rasterized = new Map<string, EncodedGlyph>();

  return (glyph, isSpark = false) => {
    if (isSpark) return encodedStyle(GLYPH_STYLES.spark);
    const scalar = firstUnicodeScalar(glyph);
    if (!scalar) return TRUE_FAILURE_ENCODED_GLYPH;
    if (scalar === "█") return encodedStyle(GLYPH_STYLES.full);
    if (scalar === "▄") return encodedStyle(GLYPH_STYLES.lower);
    if (scalar === "▀") return encodedStyle(GLYPH_STYLES.upper);
    if (scalar === "░") return encodedStyle(GLYPH_STYLES.ditherLight);
    if (scalar === "▒") return encodedStyle(GLYPH_STYLES.ditherMedium);
    if (scalar === "▓") return encodedStyle(GLYPH_STYLES.ditherDense);

    const procedural = ENCODED_PATTERNS.get(scalar);
    if (procedural) return procedural;
    const cached = rasterized.get(scalar);
    if (cached) return cached;
    const encoded = context
      ? (rasterizeScalar(context, scalar, font) ?? TRUE_FAILURE_ENCODED_GLYPH)
      : TRUE_FAILURE_ENCODED_GLYPH;
    rasterized.set(scalar, encoded);
    return encoded;
  };
}
