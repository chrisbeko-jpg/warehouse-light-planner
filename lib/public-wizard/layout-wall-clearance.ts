import { getFixtureFootprintCorners } from "@/lib/public-wizard/placement-constraints";
import type { Point2D } from "@/types/floor-plan";
import type { PublicProductId } from "@/types/public-wizard";

/** Soft preference for symmetric margins — not a mounting requirement. */
export const PREFERRED_AUTO_WALL_CLEARANCE_M = 0.6;

/** Legacy threshold for tests that expect “comfortable” margins when geometry allows. */
export const ACCEPTABLE_AUTO_WALL_CLEARANCE_M = 0.4;

/** Lichttechnisch beoordelingsgebied (m) — see lighting-assessment.ts */
export { LIGHTING_ASSESSMENT_INSET_M } from "@/lib/public-wizard/lighting-assessment";

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

/** Secondary tie-breaker only — must not block valid in-room grid placement. */
export function autoWallClearanceScoreAdjustment(minWallM: number): number {
  if (minWallM >= PREFERRED_AUTO_WALL_CLEARANCE_M) return 900;
  if (minWallM >= ACCEPTABLE_AUTO_WALL_CLEARANCE_M) {
    return 200 + (minWallM - ACCEPTABLE_AUTO_WALL_CLEARANCE_M) * 400;
  }
  if (minWallM >= 0.05) return 0;
  return -8000;
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
  if (isAutoWallClearanceAcceptable(minWallM)) return 50;
  if (minWallM >= 0.05) return 0;
  return -4000;
}

/** @deprecated use autoWallClearanceScoreAdjustment */
export function autoWallClearancePenalty(minWallM: number): number {
  return -autoWallClearanceScoreAdjustment(minWallM);
}
