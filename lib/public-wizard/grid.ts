import type { Point2D } from "@/types/floor-plan";

/** Standard suspended ceiling grid for public configurator. */
export const CEILING_GRID_M = 0.6;

export function snapMeters(valueM: number): number {
  return Math.round(valueM / CEILING_GRID_M) * CEILING_GRID_M;
}

export function snapPointToGridPx(point: Point2D, pixelsPerMeter: number): Point2D {
  if (!Number.isFinite(pixelsPerMeter) || pixelsPerMeter <= 0) return point;
  const gridPx = CEILING_GRID_M * pixelsPerMeter;
  return {
    x: Math.round(point.x / gridPx) * gridPx,
    y: Math.round(point.y / gridPx) * gridPx,
  };
}

export function isValidPoint(point: Point2D): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function clampPoint(point: Point2D, minX: number, minY: number, maxX: number, maxY: number): Point2D {
  return {
    x: Math.max(minX, Math.min(maxX, point.x)),
    y: Math.max(minY, Math.min(maxY, point.y)),
  };
}

export function uniqueGridPoints(points: Point2D[], tolerancePx = 1): Point2D[] {
  const result: Point2D[] = [];
  for (const point of points) {
    if (!isValidPoint(point)) continue;
    const exists = result.some(
      (p) => Math.abs(p.x - point.x) < tolerancePx && Math.abs(p.y - point.y) < tolerancePx,
    );
    if (!exists) result.push(point);
  }
  return result;
}
