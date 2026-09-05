import "react";

type ElementImageSource = {
  source: Element;
  sourceHeight?: number;
  sourceWidth?: number;
  sourceX?: number;
  sourceY?: number;
};

type ElementImageDestination = {
  destination: GPUImageCopyTexture;
  height: number;
  width: number;
};

declare global {
  interface HTMLCanvasElement {
    requestPaint?: () => void;
  }

  interface GPUQueue {
    copyElementImageToTexture?: (
      source: ElementImageSource,
      destination: ElementImageDestination
    ) => void;
    drawElementImageToTexture?: (
      source: ElementImageSource,
      destination: ElementImageDestination
    ) => void;
  }
}

declare module "react" {
  interface CanvasHTMLAttributes<T> {
    layoutsubtree?: "" | boolean;
  }

  interface HTMLAttributes<T> {
    drawable?: "" | boolean;
  }
}
