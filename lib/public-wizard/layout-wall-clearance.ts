import { getFixtureFootprintCorners } from "@/lib/public-wizard/placement-constraints";
import type { Point2D } from "@/types/floor-plan";
import type { PublicProductId } from "@/types/public-wizard";

/** Preferred free space from room boundary to fixture outer edge (automatic placement only). */
export const PREFERRED_AUTO_WALL_CLEARANCE_M = 0.6;

/** Still acceptable when no layout reaches the preferred distance. */
export const ACCEPTABLE_AUTO_WALL_CLEARANCE_M = 0.4;

export interface LayoutWallMarginsM {
  leftM: number;
  rightM: number;
  topM: number;
  bottomM: number;
  minM: number;
}

function polygonBounds(vertices: Point2D[]) {
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/** Minimum distance from each wall to the nearest fixture outer edge (rectangular rooms). */
export function computeLayoutWallMarginsM(
  points: Point2D[],
  pixelsPerMeter: number,
  vertices: Point2D[],
  productId: PublicProductId,
  rotation = 0,
): LayoutWallMarginsM {
  if (points.length === 0 || vertices.length < 3 || pixelsPerMeter <= 0) {
    return { leftM: 0, rightM: 0, topM: 0, bottomM: 0, minM: 0 };
  }
  const bounds = polygonBounds(vertices);
  const ppm = pixelsPerMeter;
  let leftM = Infinity;
  let rightM = Infinity;
  let topM = Infinity;
  let bottomM = Infinity;

  for (const center of points) {
    const corners = getFixtureFootprintCorners(center, ppm, productId, rotation);
    for (const corner of corners) {
      leftM = Math.min(leftM, (corner.x - bounds.minX) / ppm);
      rightM = Math.min(rightM, (bounds.maxX - corner.x) / ppm);
      topM = Math.min(topM, (corner.y - bounds.minY) / ppm);
      bottomM = Math.min(bottomM, (bounds.maxY - corner.y) / ppm);
    }
  }

  const finite = (v: number) => (Number.isFinite(v) ? Math.max(0, v) : 0);
  const l = finite(leftM);
  const r = finite(rightM);
  const t = finite(topM);
  const b = finite(bottomM);
  return { leftM: l, rightM: r, topM: t, bottomM: b, minM: Math.min(l, r, t, b) };
}

/** Score delta for auto-layout (positive = better). */
export function autoWallClearanceScoreAdjustment(minWallM: number): number {
  if (minWallM >= PREFERRED_AUTO_WALL_CLEARANCE_M) return 9000;
  if (minWallM >= PREFERRED_AUTO_WALL_CLEARANCE_M - 0.05) {
    return 6500 + (minWallM - (PREFERRED_AUTO_WALL_CLEARANCE_M - 0.05)) * 50_000;
  }
  if (minWallM >= ACCEPTABLE_AUTO_WALL_CLEARANCE_M) {
    return 2500 + (minWallM - ACCEPTABLE_AUTO_WALL_CLEARANCE_M) * 20_000;
  }
  if (minWallM >= 0.2) {
    return -4000 + (minWallM - 0.2) * 13_000;
  }
  if (minWallM >= 0.1) {
    return -18_000 + (minWallM - 0.1) * 140_000;
  }
  return -35_000;
}

/**
 * Adjustment when comparing whole matrix candidates (pickBest).
 * Does not reward ≥ acceptable clearance — that stays a tie-break so matrix shape is preserved.
 * Heavily penalizes layouts with fixtures near or on walls (&lt; 40 cm).
 */
/** Treat margins within ~2.5 cm of 40 cm as acceptable (grid / float rounding). */
export const ACCEPTABLE_WALL_CLEARANCE_EPSILON_M = 0.025;

export function isAutoWallClearanceAcceptable(minWallM: number): boolean {
  return minWallM >= ACCEPTABLE_AUTO_WALL_CLEARANCE_M - ACCEPTABLE_WALL_CLEARANCE_EPSILON_M;
}

export function autoWallClearanceMatrixPickAdjustment(minWallM: number): number {
  if (isAutoWallClearanceAcceptable(minWallM)) return 0;
  return -100_000 + minWallM * 50_000;
}

/** @deprecated use autoWallClearanceScoreAdjustment */
export function autoWallClearancePenalty(minWallM: number): number {
  return -autoWallClearanceScoreAdjustment(minWallM);
}
