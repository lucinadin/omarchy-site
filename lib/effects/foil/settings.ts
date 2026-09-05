import { unreachable } from "@/lib/validation";

export type FoilDebugView = "coverage" | "edges" | "final" | "normals" | "reflection";

export type FoilMaskMode = "edges" | "texture" | "texture-and-edges";

export function foilDebugViewToUniform(view: FoilDebugView) {
  switch (view) {
    case "final":
      return 0;
    case "coverage":
      return 1;
    case "edges":
      return 2;
    case "normals":
      return 3;
    case "reflection":
      return 4;
    default:
      return unreachable(view);
  }
}

export function foilMaskModeToUniform(mode: FoilMaskMode) {
  switch (mode) {
    case "texture":
      return 0;
    case "texture-and-edges":
      return 1;
    case "edges":
      return 2;
    default:
      return unreachable(mode);
  }
}
