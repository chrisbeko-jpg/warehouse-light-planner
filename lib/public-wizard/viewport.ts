import type { Point2D } from "@/types/floor-plan";

export interface EditorViewState {
  scale: number;
  positionX: number;
  positionY: number;
}

export const EDITOR_VIEWPORT = {
  MIN_SCALE: 0.05,
  MAX_SCALE: 12,
  MARGIN: 32,
  ZOOM_FACTOR: 1.12,
} as const;

export function clampScale(scale: number): number {
  return Math.max(
    EDITOR_VIEWPORT.MIN_SCALE,
    Math.min(EDITOR_VIEWPORT.MAX_SCALE, scale),
  );
}

/** Fit background image inside viewport with contain behaviour and margin. */
export function computeFitView(
  viewportWidth: number,
  viewportHeight: number,
  contentWidth: number,
  contentHeight: number,
  margin = EDITOR_VIEWPORT.MARGIN,
): EditorViewState {
  if (contentWidth <= 0 || contentHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return { scale: 1, positionX: 0, positionY: 0 };
  }
  const fitScale = Math.min(
    (viewportWidth - margin * 2) / contentWidth,
    (viewportHeight - margin * 2) / contentHeight,
  );
  const scale = clampScale(fitScale);
  return {
    scale: Number(scale.toFixed(4)),
    positionX: (viewportWidth - contentWidth * scale) / 2,
    positionY: (viewportHeight - contentHeight * scale) / 2,
  };
}

export function zoomAtPoint(
  view: EditorViewState,
  pointer: Point2D,
  direction: 1 | -1,
): EditorViewState {
  const oldScale = view.scale;
  const newScale = clampScale(
    direction > 0 ? oldScale * EDITOR_VIEWPORT.ZOOM_FACTOR : oldScale / EDITOR_VIEWPORT.ZOOM_FACTOR,
  );
  const mousePointTo = {
    x: (pointer.x - view.positionX) / oldScale,
    y: (pointer.y - view.positionY) / oldScale,
  };
  return {
    scale: Number(newScale.toFixed(4)),
    positionX: pointer.x - mousePointTo.x * newScale,
    positionY: pointer.y - mousePointTo.y * newScale,
  };
}

export function parseDistanceMeters(input: string): number | null {
  const cleaned = input.trim().replace(/\s*m\s*$/i, "").replace(",", ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function distanceBetween(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function pointNear(a: Point2D, b: Point2D, thresholdPx: number): boolean {
  return distanceBetween(a, b) <= thresholdPx;
}
