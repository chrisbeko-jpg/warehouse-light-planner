import { calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import { getSpreadMetrics } from "@/lib/public-wizard/ceiling-grid";

const MIN_PANEL_CENTER_SPACING_M = 1.2;

function getGridSpacingPx(points: Point2D[]): { rowSpacingPx: number; colSpacingPx: number } {
  const xs = [...new Set(points.map((p) => Math.round(p.x)))].sort((a, b) => a - b);
  const ys = [...new Set(points.map((p) => Math.round(p.y)))].sort((a, b) => a - b);
  return {
    colSpacingPx: xs.length > 1 ? xs[1]! - xs[0]! : 0,
    rowSpacingPx: ys.length > 1 ? ys[1]! - ys[0]! : 0,
  };
}
import { evaluateLayoutQuality } from "@/lib/public-wizard/layout-quality";
import type { PanelLayoutContext } from "@/lib/public-wizard/ceiling-grid";
import {
  getFixtureFootprintCorners,
  getFixtureHalfSizeM,
  isPanelFootprintInsideRoom,
  minDistanceToPolygonBoundaryM,
} from "@/lib/public-wizard/placement-constraints";
import { getPublicProduct } from "@/lib/public-wizard/products";
import type { Point2D } from "@/types/floor-plan";
import type { PlacedPublicFixture, PublicProductId } from "@/types/public-wizard";

export interface IndexPlacement {
  indices: number[];
  step: number;
}

/** All ways to pick `pickCount` slots from `slotCount` with constant index step. */
export function evenlyDistributedIndexSets(slotCount: number, pickCount: number): IndexPlacement[] {
  if (pickCount <= 0) return [];
  if (pickCount === 1) {
    const mid = Math.floor((slotCount - 1) / 2);
    return [{ indices: [mid], step: 0 }];
  }
  if (pickCount >= slotCount) {
    return [{ indices: Array.from({ length: slotCount }, (_, index) => index), step: 1 }];
  }

  const seen = new Set<string>();
  const results: IndexPlacement[] = [];
  const maxStep = Math.floor((slotCount - 1) / (pickCount - 1));

  for (let step = 1; step <= maxStep; step++) {
    const need = (pickCount - 1) * step + 1;
    if (need > slotCount) continue;
    for (let start = 0; start <= slotCount - need; start++) {
      const indices = Array.from({ length: pickCount }, (_, index) => start + index * step);
      const key = indices.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ indices, step });
    }
  }
  return results;
}

/** Symmetric per-row fixture counts that sum to `total`. */
export function symmetricRowCounts(total: number, numRows: number): number[] | null {
  if (numRows < 1 || total < numRows) return null;
  const base = Math.floor(total / numRows);
  const counts = Array<number>(numRows).fill(base);
  let rem = total - base * numRows;
  let lo = 0;
  let hi = numRows - 1;
  while (rem > 0 && lo <= hi) {
    counts[lo]! += 1;
    rem -= 1;
    if (rem > 0 && lo < hi) {
      counts[hi]! += 1;
      rem -= 1;
    }
    lo += 1;
    hi -= 1;
  }
  return counts;
}

/** Alternating extra counts (e.g. 4-3-4-3 for 14 on 4 rows). */
export function alternatingRowCounts(total: number, numRows: number): number[] | null {
  if (numRows < 1 || total < numRows) return null;
  const base = Math.floor(total / numRows);
  const counts = Array<number>(numRows).fill(base);
  let rem = total - base * numRows;
  for (let i = 0; rem > 0 && i < numRows; i += 2) {
    counts[i]! += 1;
    rem -= 1;
  }
  for (let i = 1; rem > 0 && i < numRows; i += 2) {
    counts[i]! += 1;
    rem -= 1;
  }
  return counts;
}

export function rowCountPatterns(total: number, numRows: number): number[][] {
  const patterns: number[][] = [];
  const seen = new Set<string>();
  const add = (counts: number[] | null) => {
    if (!counts || counts.reduce((a, b) => a + b, 0) !== total) return;
    const key = counts.join(",");
    if (seen.has(key)) return;
    seen.add(key);
    patterns.push(counts);
  };
  add(symmetricRowCounts(total, numRows));
  add(alternatingRowCounts(total, numRows));
  return patterns;
}

function minPanelMinEdgeClearanceM(
  center: Point2D,
  pixelsPerMeter: number,
  vertices: Point2D[],
  productId: PublicProductId,
  rotation: number,
): number {
  const corners = getFixtureFootprintCorners(center, pixelsPerMeter, productId, rotation);
  return Math.min(...corners.map((c) => minDistanceToPolygonBoundaryM(c, vertices, pixelsPerMeter)));
}

export function scoreDistributedFixtureLayout(options: {
  points: Point2D[];
  rows: number;
  cols: number;
  rowStep: number;
  colStep: number;
  requiredCount: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  vertices: Point2D[];
  pixelsPerMeter: number;
  productId: PublicProductId;
  context: PanelLayoutContext;
  rotation?: number;
}): number {
  const {
    points,
    rows,
    cols,
    requiredCount,
    bounds,
    vertices,
    pixelsPerMeter,
    productId,
    context,
    rotation = 0,
  } = options;

  const placedCount = points.length;
  if (placedCount === 0) return -Infinity;

  const quality = evaluateLayoutQuality(points, bounds);
  if (quality.rejected) return -Infinity;

  const roomWidth = bounds.maxX - bounds.minX;
  const roomHeight = bounds.maxY - bounds.minY;
  const roomAspect = roomWidth / Math.max(roomHeight, 0.01);
  const matrixAspect = cols / Math.max(rows, 1);

  let score = quality.score * 800;
  score -= Math.abs(Math.log((matrixAspect + 0.01) / (roomAspect + 0.01))) * 80;

  const spread = getSpreadMetrics(points, bounds);
  const extentAvg = (spread.extentXRatio + spread.extentYRatio) / 2;
  if (extentAvg >= 0.48 && extentAvg <= 0.92) score += extentAvg * 500;
  else if (extentAvg < 0.38) score -= 2500;

  const fixtures: PlacedPublicFixture[] = points.map((point, index) => ({
    id: `score-${index}`,
    productId,
    x: point.x,
    y: point.y,
    rotation,
  }));

  const lux = calculateIndicativeResult(
    context.areaM2,
    context.targetLux,
    context.ceilingHeightM,
    fixtures,
    requiredCount,
  ).indicativeAverageLux;

  if (placedCount === requiredCount) score += 4000;
  else score -= Math.abs(placedCount - requiredCount) * 1500;

  if (lux < context.targetLux * 0.92) {
    score -= (context.targetLux - lux) * 10;
  } else if (lux >= context.targetLux * 0.95) {
    score += 300;
  }

  const product = getPublicProduct(productId);
  const halfM = getFixtureHalfSizeM(productId);
  let minEdgeM = Infinity;
  for (const point of points) {
    if (product.category === "led_panel") {
      minEdgeM = Math.min(
        minEdgeM,
        minPanelMinEdgeClearanceM(point, pixelsPerMeter, vertices, productId, rotation),
      );
    } else {
      minEdgeM = Math.min(minEdgeM, minDistanceToPolygonBoundaryM(point, vertices, pixelsPerMeter) - halfM);
    }
  }
  if (Number.isFinite(minEdgeM) && minEdgeM >= 0) {
    score += Math.min(minEdgeM, 0.45) * 40;
  }

  if (product.category === "led_panel" && placedCount >= 2) {
    const { rowSpacingPx, colSpacingPx } = getGridSpacingPx(points);
    const minGap = MIN_PANEL_CENTER_SPACING_M - 0.02;
    if (cols > 1 && colSpacingPx > 0 && colSpacingPx / pixelsPerMeter < minGap) return -Infinity;
    if (rows > 1 && rowSpacingPx > 0 && rowSpacingPx / pixelsPerMeter < minGap) return -Infinity;
  }

  return score;
}

export interface ModuleColumnEntry {
  col: number;
  point: Point2D;
}

export interface DistributedModuleMatrixInput {
  sortedRows: number[];
  colsByRow: Map<number, ModuleColumnEntry[]>;
  requiredCount: number;
  roomAspect: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  vertices: Point2D[];
  pixelsPerMeter: number;
  productId: PublicProductId;
  context: PanelLayoutContext;
  rotation?: number;
  maxMatrixDim?: number;
}

function spacingM(a: Point2D, b: Point2D, pixelsPerMeter: number): number {
  return Math.hypot(a.x - b.x, a.y - b.y) / pixelsPerMeter;
}

function colIndicesMeetMinGap(
  colList: ModuleColumnEntry[],
  indices: number[],
  pixelsPerMeter: number,
): boolean {
  if (indices.length < 2) return true;
  const sorted = [...indices].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    const a = colList[sorted[i - 1]!]?.point;
    const b = colList[sorted[i]!]?.point;
    if (!a || !b) return false;
    if (spacingM(a, b, pixelsPerMeter) < MIN_PANEL_CENTER_SPACING_M - 0.02) return false;
  }
  return true;
}

function validatePanelPoints(
  points: Point2D[],
  vertices: Point2D[],
  pixelsPerMeter: number,
  productId: PublicProductId,
  rotation: number,
): boolean {
  if (getPublicProduct(productId).category !== "led_panel") return true;
  return points.every((point) =>
    isPanelFootprintInsideRoom(point, pixelsPerMeter, vertices, productId, rotation),
  );
}

function tryUniformMatrix(
  input: DistributedModuleMatrixInput,
  matrixRows: number,
  matrixCols: number,
): { points: Point2D[]; rowStep: number; colStep: number } | null {
  const { sortedRows, colsByRow, bounds, vertices, pixelsPerMeter, productId, rotation = 0 } = input;
  const rowPlacements = evenlyDistributedIndexSets(sortedRows.length, matrixRows);

  let best: { points: Point2D[]; rowStep: number; colStep: number } | null = null;
  let bestScore = -Infinity;

  for (const rowPick of rowPlacements) {
    const pickedRows = rowPick.indices.map((index) => sortedRows[index]!);
    const colLists = pickedRows.map((row) => colsByRow.get(row) ?? []);
    if (colLists.some((list) => list.length < matrixCols)) continue;
    const minCols = Math.min(...colLists.map((list) => list.length));
    const colPlacements = evenlyDistributedIndexSets(minCols, matrixCols);

    for (const colPick of colPlacements) {
      const points: Point2D[] = [];
      let valid = true;
      for (const row of pickedRows) {
        const colList = colsByRow.get(row)!;
        if (!colIndicesMeetMinGap(colList, colPick.indices, pixelsPerMeter)) {
          valid = false;
          break;
        }
        for (const colIndex of colPick.indices) {
          const entry = colList[colIndex];
          if (!entry) {
            valid = false;
            break;
          }
          points.push(entry.point);
        }
        if (!valid) break;
      }
      if (!valid || points.length !== matrixRows * matrixCols) continue;
      if (!validatePanelPoints(points, vertices, pixelsPerMeter, productId, rotation)) continue;

      const score = scoreDistributedFixtureLayout({
        points,
        rows: matrixRows,
        cols: matrixCols,
        rowStep: rowPick.step,
        colStep: colPick.step,
        requiredCount: input.requiredCount,
        bounds,
        vertices,
        pixelsPerMeter,
        productId,
        context: input.context,
        rotation,
      });
      if (score > bestScore) {
        bestScore = score;
        best = { points, rowStep: rowPick.step, colStep: colPick.step };
      }
    }
  }
  return best;
}

function tryStaggeredLayout(input: DistributedModuleMatrixInput, numRows: number): Point2D[] | null {
  const {
    sortedRows,
    colsByRow,
    requiredCount,
    bounds,
    vertices,
    pixelsPerMeter,
    productId,
    rotation = 0,
  } = input;

  const patterns = rowCountPatterns(requiredCount, numRows);
  if (patterns.length === 0) return null;

  let bestPoints: Point2D[] | null = null;
  let bestScore = -Infinity;

  const rowPlacements = evenlyDistributedIndexSets(sortedRows.length, numRows);
  for (const pattern of patterns) {
    if (pattern.every((c) => c === 1) && requiredCount > 1) continue;
    if (Math.min(...pattern) < 2 && numRows >= 3) continue;
    for (const rowPick of rowPlacements) {
      const pickedRows = rowPick.indices.map((index) => sortedRows[index]!);
      const points: Point2D[] = [];
      let valid = true;

      for (let r = 0; r < numRows; r++) {
        const colList = colsByRow.get(pickedRows[r]!) ?? [];
        const needCols = pattern[r]!;
        if (colList.length < needCols) {
          valid = false;
          break;
        }
        const colPlacements = evenlyDistributedIndexSets(colList.length, needCols);
        let rowBest: Point2D[] | null = null;
        let rowBestScore = -Infinity;
        for (const colPick of colPlacements) {
          if (!colIndicesMeetMinGap(colList, colPick.indices, pixelsPerMeter)) continue;
          const rowPoints: Point2D[] = [];
          for (const colIndex of colPick.indices) {
            const entry = colList[colIndex];
            if (!entry) {
              rowPoints.length = 0;
              break;
            }
            rowPoints.push(entry.point);
          }
          if (rowPoints.length !== needCols) continue;
          const partial = [...points, ...rowPoints];
          const q = evaluateLayoutQuality(partial, bounds).score;
          if (q > rowBestScore) {
            rowBestScore = q;
            rowBest = rowPoints;
          }
        }
        if (!rowBest) {
          valid = false;
          break;
        }
        points.push(...rowBest);
      }

      if (!valid || points.length !== requiredCount) continue;
      if (!validatePanelPoints(points, vertices, pixelsPerMeter, productId, rotation)) continue;

      const maxCols = Math.max(...pattern);
      const score = scoreDistributedFixtureLayout({
        points,
        rows: numRows,
        cols: maxCols,
        rowStep: rowPick.step,
        colStep: 1,
        requiredCount,
        bounds,
        vertices,
        pixelsPerMeter,
        productId,
        context: input.context,
        rotation,
      });
      if (score > bestScore) {
        bestScore = score;
        bestPoints = points;
      }
    }
  }
  return bestPoints;
}

export function selectBestDistributedModuleMatrix(
  input: DistributedModuleMatrixInput,
): { points: Point2D[]; rows: number; cols: number; rowStep: number; colStep: number } | null {
  const {
    requiredCount,
    roomAspect,
    maxMatrixDim = 12,
  } = input;

  const allSizes: Array<{ rows: number; cols: number; total: number }> = [];
  for (let rows = 1; rows <= maxMatrixDim; rows++) {
    for (let cols = 1; cols <= maxMatrixDim; cols++) {
      const total = rows * cols;
      if (total < Math.max(1, requiredCount - 1) || total > Math.min(80, Math.ceil(requiredCount * 1.25))) {
        continue;
      }
      allSizes.push({ rows, cols, total });
    }
  }

  const sortSizes = (items: typeof allSizes) =>
    [...items].sort((a, b) => {
      const deltaA = Math.abs(a.total - requiredCount);
      const deltaB = Math.abs(b.total - requiredCount);
      if (deltaA !== deltaB) return deltaA - deltaB;
      const aspectA = a.cols / Math.max(a.rows, 1);
      const aspectB = b.cols / Math.max(b.rows, 1);
      return (
        Math.abs(Math.log((aspectA + 0.01) / (roomAspect + 0.01))) -
        Math.abs(Math.log((aspectB + 0.01) / (roomAspect + 0.01)))
      );
    });

  let best: { points: Point2D[]; rows: number; cols: number; rowStep: number; colStep: number } | null = null;
  let bestScore = -Infinity;

  const maxModuleCols = Math.max(
    0,
    ...[...input.colsByRow.values()].map((list) => list.length),
  );
  const preferSingleRow =
    getPublicProduct(input.productId).category === "downlight" &&
    roomAspect >= 1.1 &&
    maxModuleCols >= requiredCount;

  const consider = (candidate: typeof best, allowCountMismatch = false) => {
    if (!candidate) return;
    if (candidate.points.length !== requiredCount) {
      if (!allowCountMismatch || candidate.points.length > requiredCount) return;
    }
    const score = scoreDistributedFixtureLayout({
      points: candidate.points,
      rows: candidate.rows,
      cols: candidate.cols,
      rowStep: candidate.rowStep,
      colStep: candidate.colStep,
      requiredCount,
      bounds: input.bounds,
      vertices: input.vertices,
      pixelsPerMeter: input.pixelsPerMeter,
      productId: input.productId,
      context: input.context,
      rotation: input.rotation,
    });
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  };

  if (preferSingleRow) {
    const uniform = tryUniformMatrix(input, 1, requiredCount);
    if (uniform) {
      consider({
        points: uniform.points,
        rows: 1,
        cols: requiredCount,
        rowStep: uniform.rowStep,
        colStep: uniform.colStep,
      });
    }
  }

  for (const size of sortSizes(allSizes.filter((s) => s.total === requiredCount))) {
    if (preferSingleRow && size.rows > 1) continue;
    let matrixRows = size.rows;
    let matrixCols = size.cols;
    if (matrixRows !== matrixCols) {
      const err = (r: number, c: number) => {
        const aspect = c / Math.max(r, 1);
        return Math.abs(Math.log((aspect + 0.01) / (roomAspect + 0.01)));
      };
      if (err(matrixCols, matrixRows) < err(matrixRows, matrixCols)) {
        [matrixRows, matrixCols] = [matrixCols, matrixRows];
      }
    }
    const uniform = tryUniformMatrix(input, matrixRows, matrixCols);
    if (uniform) {
      consider({
        points: uniform.points,
        rows: matrixRows,
        cols: matrixCols,
        rowStep: uniform.rowStep,
        colStep: uniform.colStep,
      });
    }
  }

  const minStaggerRows = Math.max(2, Math.ceil(Math.sqrt(requiredCount)) - 1);
  const maxStaggerRows = Math.min(input.sortedRows.length, maxMatrixDim, requiredCount);
  const skipStagger =
    preferSingleRow || getPublicProduct(input.productId).category === "downlight";
  if (!skipStagger) for (let numRows = minStaggerRows; numRows <= maxStaggerRows; numRows++) {
    const points = tryStaggeredLayout(input, numRows);
    if (!points) continue;
    const ys = [...new Set(points.map((p) => Math.round(p.y)))];
    const xs = [...new Set(points.map((p) => Math.round(p.x)))];
    consider({
      points,
      rows: ys.length,
      cols: xs.length,
      rowStep: 1,
      colStep: 1,
    });
  }

  if (!best) {
    for (const size of sortSizes(allSizes.filter((s) => s.total !== requiredCount))) {
    let matrixRows = size.rows;
    let matrixCols = size.cols;
    if (matrixRows !== matrixCols) {
      const err = (r: number, c: number) => {
        const aspect = c / Math.max(r, 1);
        return Math.abs(Math.log((aspect + 0.01) / (roomAspect + 0.01)));
      };
      if (err(matrixCols, matrixRows) < err(matrixRows, matrixCols)) {
        [matrixRows, matrixCols] = [matrixCols, matrixRows];
      }
    }
    const uniform = tryUniformMatrix(input, matrixRows, matrixCols);
    if (uniform) {
      consider(
        {
          points: uniform.points,
          rows: matrixRows,
          cols: matrixCols,
          rowStep: uniform.rowStep,
          colStep: uniform.colStep,
        },
        true,
      );
    }
    }
  }

  return best;
}
