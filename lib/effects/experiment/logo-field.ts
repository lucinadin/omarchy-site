const experimentLogoSource = "/assets/brand/omarchy-logo.svg";

// A two-pass chamfer distance transform of the actual SVG alpha mask. Negative
// distances are inside the mark; positive distances are outside. The shader
// extrudes this field, so geometry stays tied to the brand asset.
export function createLogoDistanceField(mask: Uint8Array, size: number) {
  if (mask.length !== size * size || size < 2) throw new Error("Invalid logo mask dimensions.");
  const distance = (inside: boolean) => {
    const field = Float32Array.from(mask, (value) => (Boolean(value) === inside ? 0 : size * 2));
    for (const direction of [1, -1]) {
      const start = direction === 1 ? 0 : size - 1;
      const end = direction === 1 ? size : -1;
      for (let y = start; y !== end; y += direction) {
        for (let x = start; x !== end; x += direction) {
          const index = y * size + x;
          const previousX = x - direction;
          const previousY = y - direction;
          if (previousX >= 0 && previousX < size) {
            field[index] = Math.min(field[index], field[y * size + previousX] + 1);
          }
          if (previousY >= 0 && previousY < size) {
            field[index] = Math.min(field[index], field[previousY * size + x] + 1);
            for (const offset of [-1, 1]) {
              if (x + offset >= 0 && x + offset < size) {
                field[index] = Math.min(
                  field[index],
                  field[previousY * size + x + offset] + Math.SQRT2
                );
              }
            }
          }
        }
      }
    }
    return field;
  };
  const outside = distance(true);
  const inside = distance(false);
  return outside.map((value, index) => (value - inside[index]) * (2.4 / size));
}

export async function loadLogoDistanceField(signal: AbortSignal) {
  const image = new Image();
  image.src = experimentLogoSource;
  await image.decode();
  signal.throwIfAborted();
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Could not prepare the Experiment logo.");
  const padding = 24;
  context.drawImage(image, padding, padding, size - padding * 2, size - padding * 2);
  const pixels = context.getImageData(0, 0, size, size).data;
  const mask = Uint8Array.from({ length: size * size }, (_, index) =>
    pixels[index * 4 + 3] >= 128 ? 1 : 0
  );
  return { size, field: createLogoDistanceField(mask, size) };
}
