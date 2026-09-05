import "react";

declare module "react" {
  interface CSSProperties {
    "--control-progress"?: string;
    "--term-font-size"?: string;
    "--term-row-height"?: string;
    "--tooltip-close-delay"?: string;
    "--tooltip-open-delay"?: string;
    "--tooltip-side-offset"?: string;
    "--window-count"?: number;
  }
}
