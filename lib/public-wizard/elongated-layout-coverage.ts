import type { RoomBounds } from "@/lib/public-wizard/layout-quality";
import { maxDistanceToNearestFixtureM } from "@/lib/public-wizard/elongated-matrix-score";
import type { Point2D } from "@/types/floor-plan";

export interface LayoutCoverageMetrics {
  maxSampleDistanceM: number;
  /** 0 = balanced margins on an axis, higher = shifted cluster. */
  axisMarginImbalanceM: number;
}

function marginSpreadM(valuesM: number[], spanM: number): number {
  if (valuesM.length === 0 || spanM <= 0) return 0;
  const minV = Math.min(...valuesM);
  const maxV = Math.max(...valuesM);
  const marginLow = minV;
  const marginHigh = spanM - maxV;
  return Math.abs(marginLow - marginHigh);
}

/** Coverage quality from physical fixture positions (meters in room axes). */
export function computeLayoutCoverageMetrics(
  points: Point2D[],
  bounds: RoomBounds,
  pixelsPerMeter: number,
  gridSamples = 12,
): LayoutCoverageMetrics {
  const maxSampleDistanceM = maxDistanceToNearestFixtureM(
    points,
    bounds,
    pixelsPerMeter,
    gridSamples,
  );
  const xsM = points.map((p) => p.x / pixelsPerMeter);
  const ysM = points.map((p) => p.y / pixelsPerMeter);
  const roomMinX = bounds.minX / pixelsPerMeter;
  const roomMaxX = bounds.maxX / pixelsPerMeter;
  const roomMinY = bounds.minY / pixelsPerMeter;
  const roomMaxY = bounds.maxY / pixelsPerMeter;
  const relX = xsM.map((x) => x - roomMinX);
  const relY = ysM.map((y) => y - roomMinY);
  const axisMarginImbalanceM =
    marginSpreadM(relX, roomMaxX - roomMinX) + marginSpreadM(relY, roomMaxY - roomMinY);

  return { maxSampleDistanceM, axisMarginImbalanceM };
}

/** Higher is better. Penalizes large unlit zones and one-sided clustering. */
export function layoutCoverageScoreAdjustment(metrics: LayoutCoverageMetrics): number {
  let adj = -metrics.maxSampleDistanceM * 1200;
  adj -= metrics.axisMarginImbalanceM * 180;
  if (metrics.maxSampleDistanceM > 2.2) adj -= 15_000;
  if (metrics.maxSampleDistanceM > 1.8) adj -= 6000;
  return adj;
}
