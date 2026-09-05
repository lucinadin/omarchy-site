type PaintableCanvas = HTMLCanvasElement & {
  requestPaint: () => void;
};

export function supportsCanvasPaint(canvas: HTMLCanvasElement): canvas is PaintableCanvas {
  return typeof canvas.requestPaint === "function";
}
