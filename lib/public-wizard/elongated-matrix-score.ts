import { evaluateLayoutQuality, type RoomBounds } from "@/lib/public-wizard/layout-quality";
import type { Point2D } from "@/types/floor-plan";

export interface ElongatedMatrixScoreInput {
  points: Point2D[];
  bounds: RoomBounds;
  pixelsPerMeter: number;
  matrixRows: number;
  matrixCols: number;
  roomWidthM: number;
  roomHeightM: number;
  placedCount: number;
  requiredCount: number;
  adjacentPairs: number;
  meetsLuxTarget: boolean;
  indicativeLux: number;
  targetLux: number;
  rotation: number;
}

export interface ElongatedMatrixScoreResult {
  score: number;
  layoutRejected: boolean;
  layoutScore: number;
  maxSampleDistanceM: number;
}

/** Combined score for comparing 120×30 module-matrix candidates. Higher is better. */
export function scoreElongatedMatrixCandidate(input: ElongatedMatrixScoreInput): ElongatedMatrixScoreResult {
  const quality = evaluateLayoutQuality(input.points, input.bounds);
  const maxSampleDistanceM = maxDistanceToNearestFixtureM(
    input.points,
    input.bounds,
    input.pixelsPerMeter,
  );

  let score = quality.score * 120;
  if (quality.rejected) score -= 250_000;

  score -= input.adjacentPairs * 50_000;
  score -= Math.abs(input.placedCount - input.requiredCount) * 6000;

  if (input.meetsLuxTarget) score += 12_000;
  else score += input.indicativeLux * 0.6;

  const roomAspect = input.roomWidthM / Math.max(input.roomHeightM, 0.01);
  const matrixAspect = input.matrixCols / Math.max(input.matrixRows, 1);
  score -= Math.abs(Math.log((matrixAspect + 0.01) / (roomAspect + 0.01))) * 450;

  if (input.rotation === 0) score += 2500;

  score -= maxSampleDistanceM * 180;
  score -= Math.abs(input.matrixRows - input.matrixCols) * 35;

  const colGaps = gapSpreadPx(input.points.map((p) => p.x));
  const rowGaps = gapSpreadPx(input.points.map((p) => p.y));
  score -= (colGaps + rowGaps) * 0.02;

  return {
    score,
    layoutRejected: quality.rejected,
    layoutScore: quality.score,
    maxSampleDistanceM,
  };
}

function gapSpreadPx(positions: number[]): number {
  const sorted = [...new Set(positions.map((v) => Math.round(v)))].sort((a, b) => a - b);
  if (sorted.length < 2) return 0;
  const gaps = sorted.slice(1).map((p, i) => p - sorted[i]!);
  return Math.max(...gaps) - Math.min(...gaps);
}

export function maxDistanceToNearestFixtureM(
  points: Point2D[],
  bounds: RoomBounds,
  pixelsPerMeter: number,
  gridSamples = 10,
): number {
  if (points.length === 0 || pixelsPerMeter <= 0) return Infinity;
  let maxPx = 0;
  for (let i = 1; i <= gridSamples; i++) {
    for (let j = 1; j <= gridSamples; j++) {
      const px = bounds.minX + (i / (gridSamples + 1)) * (bounds.maxX - bounds.minX);
      const py = bounds.minY + (j / (gridSamples + 1)) * (bounds.maxY - bounds.minY);
      let best = Infinity;
      for (const p of points) {
        best = Math.min(best, Math.hypot(px - p.x, py - p.y));
      }
      maxPx = Math.max(maxPx, best);
    }
  }
  return maxPx / pixelsPerMeter;
}

export function polygonBoundsFromVertices(vertices: Point2D[]): RoomBounds {
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}
