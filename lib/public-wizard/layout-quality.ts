import type { Point2D } from "@/types/floor-plan";

export interface RoomBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface LayoutQualityResult {
  score: number;
  rejected: boolean;
  rejectionReasons: string[];
  rowCount: number;
  colCountUnique: number;
  rowSpacingUniformity: number;
  colSpacingUniformity: number;
  coverageRatio: number;
  hollowMiddle: boolean;
  edgeOnlyRows: boolean;
  symmetryBalance: number;
  nearestNeighborCv: number;
}

function sortedUnique(values: number[], round = true): number[] {
  const mapped = round ? values.map((v) => Math.round(v)) : [...values];
  return [...new Set(mapped)].sort((a, b) => a - b);
}

function gapUniformity(positions: number[]): number {
  if (positions.length < 2) return 1;
  const gaps = positions.slice(1).map((p, i) => p - positions[i]!);
  const min = Math.min(...gaps);
  const max = Math.max(...gaps);
  if (max <= 0) return 1;
  return 1 - (max - min) / max;
}

function countPerRow(points: Point2D[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const p of points) {
    const y = Math.round(p.y);
    map.set(y, (map.get(y) ?? 0) + 1);
  }
  return map;
}

function coverageRatio(points: Point2D[], bounds: RoomBounds, gridDivisions = 8): number {
  if (points.length === 0) return 0;
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  if (w <= 0 || h <= 0) return 0;
  const filled = new Set<string>();
  for (const p of points) {
    const gx = Math.min(
      gridDivisions - 1,
      Math.max(0, Math.floor(((p.x - bounds.minX) / w) * gridDivisions)),
    );
    const gy = Math.min(
      gridDivisions - 1,
      Math.max(0, Math.floor(((p.y - bounds.minY) / h) * gridDivisions)),
    );
    filled.add(`${gx}:${gy}`);
  }
  return filled.size / (gridDivisions * gridDivisions);
}

function nearestNeighborCoefficientOfVariation(points: Point2D[]): number {
  if (points.length < 2) return 0;
  const dists: number[] = [];
  for (let i = 0; i < points.length; i++) {
    let best = Infinity;
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const dx = points[i]!.x - points[j]!.x;
      const dy = points[i]!.y - points[j]!.y;
      best = Math.min(best, Math.hypot(dx, dy));
    }
    if (Number.isFinite(best)) dists.push(best);
  }
  if (dists.length === 0) return 0;
  const mean = dists.reduce((a, b) => a + b, 0) / dists.length;
  if (mean <= 0) return 0;
  const variance = dists.reduce((sum, d) => sum + (d - mean) ** 2, 0) / dists.length;
  return Math.sqrt(variance) / mean;
}

/** Detect two full rows hugging opposite walls with an empty vertical middle band. */
/** One fixture per row in a wide room → vertical stack instead of a centred row. */
function detectSingleColumnInWideRoom(points: Point2D[], bounds: RoomBounds): boolean {
  if (points.length < 2) return false;
  const perRow = countPerRow(points);
  if (perRow.size !== points.length) return false;
  const roomW = bounds.maxX - bounds.minX;
  const roomH = bounds.maxY - bounds.minY;
  return roomW > roomH * 1.15 && points.length >= 2;
}

function detectEdgeOnlyRows(points: Point2D[], bounds: RoomBounds): boolean {
  const ys = sortedUnique(points.map((p) => p.y));
  if (ys.length !== 2 || points.length < 6) return false;
  const perRow = countPerRow(points);
  const counts = [...perRow.values()];
  if (counts.some((c) => c < 3)) return false;
  const roomH = bounds.maxY - bounds.minY;
  const rowGap = Math.abs(ys[1]! - ys[0]!);
  if (rowGap < roomH * 0.55) return false;
  const midY = (bounds.minY + bounds.maxY) / 2;
  const band = roomH * 0.28;
  const inMiddle = points.filter((p) => Math.abs(p.y - midY) < band).length;
  return inMiddle === 0;
}

function detectHollowMiddle(points: Point2D[], bounds: RoomBounds): boolean {
  if (points.length < 8) return false;
  const midY = (bounds.minY + bounds.maxY) / 2;
  const band = (bounds.maxY - bounds.minY) * 0.32;
  const inMiddle = points.filter((p) => Math.abs(p.y - midY) < band / 2).length;
  const ys = sortedUnique(points.map((p) => p.y));
  return ys.length >= 2 && inMiddle === 0 && points.length >= 10;
}

/**
 * Geometric quality of a fixture layout (higher is better).
 * Used to reject wall-hugging double rows and other unprofessional patterns.
 */
export function evaluateLayoutQuality(
  points: Point2D[],
  bounds: RoomBounds,
): LayoutQualityResult {
  const rejectionReasons: string[] = [];
  if (points.length === 0) {
    return {
      score: -Infinity,
      rejected: true,
      rejectionReasons: ["no_fixtures"],
      rowCount: 0,
      colCountUnique: 0,
      rowSpacingUniformity: 0,
      colSpacingUniformity: 0,
      coverageRatio: 0,
      hollowMiddle: false,
      edgeOnlyRows: false,
      symmetryBalance: 0,
      nearestNeighborCv: 0,
    };
  }

  const xs = sortedUnique(points.map((p) => p.x));
  const ys = sortedUnique(points.map((p) => p.y));
  const rowSpacingUniformity = gapUniformity(ys);
  const colSpacingUniformity = gapUniformity(xs);
  const coverage = coverageRatio(points, bounds);
  const hollowMiddle = detectHollowMiddle(points, bounds);
  const edgeOnlyRows = detectEdgeOnlyRows(points, bounds);
  const singleColumnWide = detectSingleColumnInWideRoom(points, bounds);
  const nnCv = nearestNeighborCoefficientOfVariation(points);

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const symmetryBalance =
    1 -
    (Math.abs(minX - bounds.minX - (bounds.maxX - maxX)) +
      Math.abs(minY - bounds.minY - (bounds.maxY - maxY))) /
      Math.max(bounds.maxX - bounds.minX + bounds.maxY - bounds.minY, 1);

  let score = 0;
  score += rowSpacingUniformity * 22;
  score += colSpacingUniformity * 22;
  score += coverage * 35;
  score += symmetryBalance * 12;
  score += Math.max(0, 1 - nnCv) * 8;

  const rowCount = ys.length;
  const roomW = bounds.maxX - bounds.minX;
  const roomH = bounds.maxY - bounds.minY;
  if (rowCount >= 3) score += 18;
  else if (rowCount === 2 && points.length >= 8) score -= 25;
  if (
    rowCount === 1 &&
    points.length >= 5 &&
    roomH >= roomW * 0.45 &&
    points.length >= 6
  ) {
    score -= 20;
  }

  if (hollowMiddle) {
    score -= 80;
    rejectionReasons.push("hollow_middle");
  }
  if (edgeOnlyRows) {
    score -= 120;
    rejectionReasons.push("edge_only_rows");
  }
  if (singleColumnWide) {
    score -= 100;
    rejectionReasons.push("single_column_wide_room");
  }

  const rejected =
    edgeOnlyRows ||
    singleColumnWide ||
    (hollowMiddle && points.length >= 10);

  return {
    score,
    rejected,
    rejectionReasons,
    rowCount,
    colCountUnique: xs.length,
    rowSpacingUniformity,
    colSpacingUniformity,
    coverageRatio: coverage,
    hollowMiddle,
    edgeOnlyRows,
    symmetryBalance,
    nearestNeighborCv: nnCv,
  };
}

/** Compare two layouts; returns true if `a` is clearly better than `b`. */
export function layoutQualityBeats(
  a: Point2D[],
  b: Point2D[],
  bounds: RoomBounds,
): boolean {
  const qa = evaluateLayoutQuality(a, bounds);
  const qb = evaluateLayoutQuality(b, bounds);
  if (qa.rejected && !qb.rejected) return false;
  if (!qa.rejected && qb.rejected) return true;
  return qa.score > qb.score + 0.5;
}
