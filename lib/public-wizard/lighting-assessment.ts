import { computePublicHeatmap } from "@/lib/public-wizard/heatmap";
import { minDistanceToPolygonBoundaryM } from "@/lib/public-wizard/placement-constraints";
import type { Point2D } from "@/types/floor-plan";
import type { PlacedPublicFixture } from "@/types/public-wizard";

/** Default assessment inset from room boundary (not a mounting rule). */
export const LIGHTING_ASSESSMENT_INSET_M = 0.5;

export interface LightingCoverageSummary {
  sampleCount: number;
  averageLux: number;
  minLux: number;
  maxLux: number;
  /** min / avg when avg > 0 */
  uniformityRatio: number;
  belowTargetFraction: number;
}

export function filterAssessmentSamplePoints(
  roomVertices: Point2D[],
  pixelsPerMeter: number,
  insetM = LIGHTING_ASSESSMENT_INSET_M,
): Point2D[] {
  if (roomVertices.length < 3 || pixelsPerMeter <= 0) return [];
  const xs = roomVertices.map((v) => v.x);
  const ys = roomVertices.map((v) => v.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const stepPx = Math.max(8, 0.45 * pixelsPerMeter);
  const points: Point2D[] = [];
  for (let py = minY; py <= maxY; py += stepPx) {
    for (let px = minX; px <= maxX; px += stepPx) {
      const p = { x: px, y: py };
      if (minDistanceToPolygonBoundaryM(p, roomVertices, pixelsPerMeter) >= insetM - 0.02) {
        points.push(p);
      }
    }
  }
  return points;
}

export function summarizeLightingCoverage(
  fixtures: PlacedPublicFixture[],
  roomVertices: Point2D[],
  pixelsPerMeter: number,
  ceilingHeightM: number,
  targetLux: number,
  insetM = LIGHTING_ASSESSMENT_INSET_M,
): LightingCoverageSummary {
  const cells = computePublicHeatmap(
    fixtures,
    roomVertices,
    pixelsPerMeter,
    ceilingHeightM,
    targetLux,
    0.45,
  ).filter(
    (cell) =>
      minDistanceToPolygonBoundaryM(
        { x: cell.x, y: cell.y },
        roomVertices,
        pixelsPerMeter,
      ) >= insetM - 0.02,
  );

  if (cells.length === 0) {
    return {
      sampleCount: 0,
      averageLux: 0,
      minLux: 0,
      maxLux: 0,
      uniformityRatio: 0,
      belowTargetFraction: 1,
    };
  }

  const luxValues = cells.map((c) => c.lux);
  const averageLux = luxValues.reduce((a, b) => a + b, 0) / luxValues.length;
  const minLux = Math.min(...luxValues);
  const maxLux = Math.max(...luxValues);
  const belowTargetFraction =
    luxValues.filter((l) => l < targetLux * 0.95).length / luxValues.length;

  return {
    sampleCount: cells.length,
    averageLux: Math.round(averageLux),
    minLux: Math.round(minLux),
    maxLux: Math.round(maxLux),
    uniformityRatio: averageLux > 0 ? minLux / averageLux : 0,
    belowTargetFraction,
  };
}

export function lightingCoverageScoreAdjustment(
  summary: LightingCoverageSummary,
  targetLux: number,
): number {
  if (summary.sampleCount === 0) return -50_000;
  let score = 0;
  score += Math.min(summary.averageLux, targetLux * 1.2) * 8;
  score += summary.minLux * 12;
  if (summary.minLux >= targetLux * 0.95) score += 4000;
  else score -= (targetLux - summary.minLux) * 18;
  score += summary.uniformityRatio * 2500;
  score -= summary.belowTargetFraction * 6000;
  return score;
}
