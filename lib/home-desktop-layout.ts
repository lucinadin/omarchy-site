export const workspaceIds = [1, 2, 3, 4, 5] as const;
export const desktopWorkspaceIds = [2, 3, 4, 5] as const;

export type WorkspaceId = (typeof workspaceIds)[number];
export type DesktopWorkspaceId = (typeof desktopWorkspaceIds)[number];
export type BarPosition = "bottom" | "left" | "right" | "top";
export type SplitAxis = "horizontal" | "vertical";

export type LayoutNode =
  | { kind: "window"; windowId: number }
  | {
      axis: SplitAxis;
      first: LayoutNode;
      kind: "split";
      ratio: number;
      second: LayoutNode;
    };

type WindowDirection = "down" | "left" | "right" | "up";

type LayoutToggleResult = {
  node: LayoutNode;
  toggled: boolean;
};

type LayoutResizeResult = {
  node: LayoutNode;
  resized: boolean;
};

type LayoutRect = {
  height: number;
  width: number;
  windowId: number;
  x: number;
  y: number;
};

const FULL_LAYOUT_RECT: Omit<LayoutRect, "windowId"> = { height: 1, width: 1, x: 0, y: 0 };

export function parseWorkspaceId(value: number): WorkspaceId | null {
  return workspaceIds.find((workspaceId) => workspaceId === value) ?? null;
}

export function parseDesktopWorkspaceId(value: number): DesktopWorkspaceId | null {
  return desktopWorkspaceIds.find((workspaceId) => workspaceId === value) ?? null;
}

export function parseBarPosition(value: string | undefined): BarPosition | null {
  if (value === "bottom" || value === "left" || value === "right" || value === "top") return value;
  return null;
}

export function windowDirectionForCode(code: string): WindowDirection | null {
  switch (code) {
    case "ArrowDown":
      return "down";
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    case "ArrowUp":
      return "up";
    default:
      return null;
  }
}

function layoutContains(node: LayoutNode, windowId: number): boolean {
  if (node.kind === "window") return node.windowId === windowId;
  return layoutContains(node.first, windowId) || layoutContains(node.second, windowId);
}

export function insertWindow(
  node: LayoutNode | null,
  focusedWindowId: number | null,
  windowId: number,
  axis: SplitAxis
): LayoutNode {
  const windowNode: LayoutNode = { kind: "window", windowId };
  if (!node) return windowNode;

  if (node.kind === "window") {
    if (focusedWindowId !== null && node.windowId !== focusedWindowId) return node;
    return { axis, first: node, kind: "split", ratio: 50, second: windowNode };
  }

  if (focusedWindowId !== null && layoutContains(node.first, focusedWindowId)) {
    return { ...node, first: insertWindow(node.first, focusedWindowId, windowId, axis) };
  }
  if (focusedWindowId !== null && layoutContains(node.second, focusedWindowId)) {
    return { ...node, second: insertWindow(node.second, focusedWindowId, windowId, axis) };
  }
  return { axis, first: node, kind: "split", ratio: 50, second: windowNode };
}

export function removeWindow(node: LayoutNode | null, windowId: number): LayoutNode | null {
  if (!node) return null;
  if (node.kind === "window") return node.windowId === windowId ? null : node;

  const first = removeWindow(node.first, windowId);
  const second = removeWindow(node.second, windowId);
  if (!first) return second;
  if (!second) return first;
  return { ...node, first, second };
}

export function toggleNearestSplit(node: LayoutNode, windowId: number): LayoutToggleResult {
  if (node.kind === "window") return { node, toggled: false };

  if (layoutContains(node.first, windowId)) {
    const nested = toggleNearestSplit(node.first, windowId);
    if (nested.toggled) return { node: { ...node, first: nested.node }, toggled: true };
    return {
      node: { ...node, axis: node.axis === "horizontal" ? "vertical" : "horizontal" },
      toggled: true,
    };
  }
  if (layoutContains(node.second, windowId)) {
    const nested = toggleNearestSplit(node.second, windowId);
    if (nested.toggled) return { node: { ...node, second: nested.node }, toggled: true };
    return {
      node: { ...node, axis: node.axis === "horizontal" ? "vertical" : "horizontal" },
      toggled: true,
    };
  }
  return { node, toggled: false };
}

export function resizeNearestSplit(
  node: LayoutNode,
  windowId: number,
  axis: SplitAxis,
  amount: number
): LayoutResizeResult {
  if (node.kind === "window") return { node, resized: false };

  const focusedInFirst = layoutContains(node.first, windowId);
  const focusedInSecond = layoutContains(node.second, windowId);
  if (!focusedInFirst && !focusedInSecond) return { node, resized: false };

  const branch = focusedInFirst ? "first" : "second";
  const nested = resizeNearestSplit(node[branch], windowId, axis, amount);
  if (nested.resized) return { node: { ...node, [branch]: nested.node }, resized: true };
  if (node.axis !== axis) return { node, resized: false };

  const direction = focusedInFirst ? amount : -amount;
  return {
    node: { ...node, ratio: Math.min(75, Math.max(25, node.ratio + direction)) },
    resized: true,
  };
}

export function swapWindows(
  node: LayoutNode,
  firstWindowId: number,
  secondWindowId: number
): LayoutNode {
  if (node.kind === "window") {
    if (node.windowId === firstWindowId) return { ...node, windowId: secondWindowId };
    if (node.windowId === secondWindowId) return { ...node, windowId: firstWindowId };
    return node;
  }
  return {
    ...node,
    first: swapWindows(node.first, firstWindowId, secondWindowId),
    second: swapWindows(node.second, firstWindowId, secondWindowId),
  };
}

function collectLayoutRects(
  node: LayoutNode,
  rect: Omit<LayoutRect, "windowId"> = FULL_LAYOUT_RECT
): LayoutRect[] {
  if (node.kind === "window") return [{ ...rect, windowId: node.windowId }];

  const ratio = node.ratio / 100;
  if (node.axis === "horizontal") {
    const firstWidth = rect.width * ratio;
    return [
      ...collectLayoutRects(node.first, { ...rect, width: firstWidth }),
      ...collectLayoutRects(node.second, {
        ...rect,
        width: rect.width - firstWidth,
        x: rect.x + firstWidth,
      }),
    ];
  }

  const firstHeight = rect.height * ratio;
  return [
    ...collectLayoutRects(node.first, { ...rect, height: firstHeight }),
    ...collectLayoutRects(node.second, {
      ...rect,
      height: rect.height - firstHeight,
      y: rect.y + firstHeight,
    }),
  ];
}

export function directionalWindow(
  layout: LayoutNode,
  focusedWindowId: number,
  direction: WindowDirection
) {
  const rects = collectLayoutRects(layout);
  const current = rects.find((rect) => rect.windowId === focusedWindowId);
  if (!current) return null;

  const currentX = current.x + current.width / 2;
  const currentY = current.y + current.height / 2;
  const horizontal = direction === "left" || direction === "right";
  let bestCandidate: { score: number; windowId: number } | undefined;

  for (const rect of rects) {
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    const inDirection =
      direction === "left"
        ? x < currentX
        : direction === "right"
          ? x > currentX
          : direction === "up"
            ? y < currentY
            : y > currentY;
    if (!inDirection) continue;

    const primary = horizontal ? Math.abs(x - currentX) : Math.abs(y - currentY);
    const secondary = horizontal ? Math.abs(y - currentY) : Math.abs(x - currentX);
    const perpendicularOverlap = horizontal
      ? Math.min(rect.y + rect.height, current.y + current.height) - Math.max(rect.y, current.y)
      : Math.min(rect.x + rect.width, current.x + current.width) - Math.max(rect.x, current.x);
    const alignmentPenalty = perpendicularOverlap > 0.001 ? 0 : 10;
    const score = alignmentPenalty + primary * 4 + secondary;
    if (!bestCandidate || score < bestCandidate.score) {
      bestCandidate = { score, windowId: rect.windowId };
    }
  }
  return bestCandidate?.windowId ?? null;
}
