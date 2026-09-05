export function uploadImageElementTexture(
  queue: GPUQueue,
  texture: GPUTexture,
  image: HTMLImageElement
) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("The image could not be prepared for WebGPU.");
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, image.naturalWidth, image.naturalHeight);
  const sourceBytesPerRow = image.naturalWidth * 4;
  const bytesPerRow = Math.ceil(sourceBytesPerRow / 256) * 256;
  let upload = new Uint8Array(
    imageData.data.buffer,
    imageData.data.byteOffset,
    imageData.data.byteLength
  );

  if (bytesPerRow !== sourceBytesPerRow) {
    const padded = new Uint8Array(bytesPerRow * image.naturalHeight);
    for (let row = 0; row < image.naturalHeight; row += 1) {
      const sourceOffset = row * sourceBytesPerRow;
      padded.set(
        upload.subarray(sourceOffset, sourceOffset + sourceBytesPerRow),
        row * bytesPerRow
      );
    }
    upload = padded;
  }

  queue.writeTexture(
    { texture },
    upload,
    { bytesPerRow, rowsPerImage: image.naturalHeight },
    { height: image.naturalHeight, width: image.naturalWidth }
  );
}
