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
  edgeOnlyColumns: boolean;
  isCompleteMatrix: boolean;
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

/** Every row has the same fixture count and rows × cols equals panel count. */
export function isCompleteRectangularMatrix(points: Point2D[]): boolean {
  if (points.length === 0) return false;
  const xs = sortedUnique(points.map((p) => p.x));
  const ys = sortedUnique(points.map((p) => p.y));
  if (xs.length * ys.length !== points.length) return false;
  const perRow = countPerRow(points);
  const cols = xs.length;
  for (const count of perRow.values()) {
    if (count !== cols) return false;
  }
  return perRow.size === ys.length;
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
  const roomW = bounds.maxX - bounds.minX;
  const roomH = bounds.maxY - bounds.minY;
  const midY = (bounds.minY + bounds.maxY) / 2;
  const midX = (bounds.minX + bounds.maxX) / 2;
  const bandY = roomH * 0.32;
  const bandX = roomW * 0.32;
  const inMiddleY = points.filter((p) => Math.abs(p.y - midY) < bandY / 2).length;
  const inMiddleX = points.filter((p) => Math.abs(p.x - midX) < bandX / 2).length;
  const ys = sortedUnique(points.map((p) => p.y));
  const xs = sortedUnique(points.map((p) => p.x));
  if (ys.length >= 2 && inMiddleY === 0 && points.length >= 10) return true;
  if (xs.length >= 2 && inMiddleX === 0 && points.length >= 8 && roomW > roomH * 1.05) return true;
  return false;
}

function detectEdgeOnlyColumns(points: Point2D[], bounds: RoomBounds): boolean {
  const xs = sortedUnique(points.map((p) => p.x));
  if (xs.length !== 2 || points.length < 8) return false;
  const roomW = bounds.maxX - bounds.minX;
  const roomH = bounds.maxY - bounds.minY;
  if (roomW <= roomH * 1.05) return false;
  const colGap = Math.abs(xs[1]! - xs[0]!);
  if (colGap < roomW * 0.55) return false;
  const perCol = new Map<number, number>();
  for (const p of points) {
    const x = Math.round(p.x);
    perCol.set(x, (perCol.get(x) ?? 0) + 1);
  }
  const counts = [...perCol.values()];
  if (counts.some((c) => c < 3)) return false;
  const midX = (bounds.minX + bounds.maxX) / 2;
  const band = roomW * 0.28;
  const inMiddle = points.filter((p) => Math.abs(p.x - midX) < band).length;
  return inMiddle === 0;
}

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
      edgeOnlyColumns: false,
      isCompleteMatrix: false,
      symmetryBalance: 0,
      nearestNeighborCv: 0,
    };
  }

  const xs = sortedUnique(points.map((p) => p.x));
  const ys = sortedUnique(points.map((p) => p.y));
  const completeMatrix = isCompleteRectangularMatrix(points);
  const rowSpacingUniformity = gapUniformity(ys);
  const colSpacingUniformity = gapUniformity(xs);
  const coverage = coverageRatio(points, bounds);
  const hollowMiddle = detectHollowMiddle(points, bounds);
  const edgeOnlyRows = detectEdgeOnlyRows(points, bounds);
  const edgeOnlyColumns = detectEdgeOnlyColumns(points, bounds);
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
  score += rowSpacingUniformity * 28;
  score += colSpacingUniformity * 28;
  score += coverage * 30;
  score += symmetryBalance * 15;
  score += Math.max(0, 1 - nnCv) * 8;
  if (completeMatrix) score += 25;

  const rowCount = ys.length;
  const roomW = bounds.maxX - bounds.minX;
  const roomH = bounds.maxY - bounds.minY;
  if (rowCount === 2 && points.length >= 8 && !completeMatrix) score -= 25;
  if (
    rowCount === 1 &&
    points.length >= 6 &&
    roomH >= roomW * 0.45
  ) {
    score -= 15;
  }

  if (!completeMatrix && points.length > 1) {
    score -= 60;
    rejectionReasons.push("incomplete_matrix");
  }
  const twoRowWideMatrix =
    completeMatrix && ys.length === 2 && xs.length >= 6 && points.length >= 12;
  if (twoRowWideMatrix) {
    score -= 100;
    rejectionReasons.push("two_row_wall_matrix");
  }
  if (hollowMiddle) {
    score -= 80;
    rejectionReasons.push("hollow_middle");
  }
  if (edgeOnlyRows) {
    score -= 120;
    rejectionReasons.push("edge_only_rows");
  }
  if (edgeOnlyColumns) {
    score -= 140;
    rejectionReasons.push("edge_only_columns");
  }
  if (singleColumnWide) {
    score -= 100;
    rejectionReasons.push("single_column_wide_room");
  }

  const rejected =
    !completeMatrix ||
    edgeOnlyRows ||
    edgeOnlyColumns ||
    singleColumnWide ||
    twoRowWideMatrix ||
    (hollowMiddle && points.length >= 8);

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
    edgeOnlyColumns,
    isCompleteMatrix: completeMatrix,
    symmetryBalance,
    nearestNeighborCv: nnCv,
  };
}

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
