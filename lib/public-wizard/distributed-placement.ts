import { calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import { getSpreadMetrics } from "@/lib/public-wizard/ceiling-grid";
import { evaluateLayoutQuality, isCompleteRectangularMatrix } from "@/lib/public-wizard/layout-quality";
import type { PanelLayoutContext } from "@/lib/public-wizard/ceiling-grid";
import {
  getFixtureFootprintCorners,
  getFixtureHalfSizeM,
  isPanelFootprintInsideRoom,
  minDistanceToPolygonBoundaryM,
} from "@/lib/public-wizard/placement-constraints";
import { countAdjacentLuminaires, minEdgeToEdgeGapM } from "@/lib/public-wizard/luminaire-adjacency";
import { getPublicProduct, isElongatedPanel } from "@/lib/public-wizard/products";
import type { Point2D } from "@/types/floor-plan";
import type { PlacedPublicFixture, PublicProductId } from "@/types/public-wizard";

const MIN_PANEL_CENTER_SPACING_M = 1.2;

/** Search full matrices within ±delta of the calculated fixture count. */
export const MATRIX_COUNT_SEARCH_DELTA = 3;

export interface IndexPlacement {
  indices: number[];
  step: number;
}

function getGridSpacingPx(points: Point2D[]): { rowSpacingPx: number; colSpacingPx: number } {
  const xs = [...new Set(points.map((p) => Math.round(p.x)))].sort((a, b) => a - b);
  const ys = [...new Set(points.map((p) => Math.round(p.y)))].sort((a, b) => a - b);
  return {
    colSpacingPx: xs.length > 1 ? xs[1]! - xs[0]! : 0,
    rowSpacingPx: ys.length > 1 ? ys[1]! - ys[0]! : 0,
  };
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

export function enumerateFullMatrixSizes(
  calculatedCount: number,
  maxMatrixDim = 12,
  delta = MATRIX_COUNT_SEARCH_DELTA,
): Array<{ rows: number; cols: number; total: number }> {
  const minTotal = Math.max(1, calculatedCount - delta);
  const maxTotal = Math.min(120, calculatedCount + delta);
  const sizes: Array<{ rows: number; cols: number; total: number }> = [];
  for (let rows = 1; rows <= maxMatrixDim; rows++) {
    for (let cols = 1; cols <= maxMatrixDim; cols++) {
      const total = rows * cols;
      if (total < minTotal || total > maxTotal) continue;
      sizes.push({ rows, cols, total });
    }
  }
  return sizes;
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
  calculatedCount: number;
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
    calculatedCount,
    bounds,
    vertices,
    pixelsPerMeter,
    productId,
    context,
    rotation = 0,
  } = options;

  const product = getPublicProduct(productId);
  const placedCount = points.length;
  if (placedCount === 0 || placedCount !== rows * cols) return -Infinity;
  if (!isCompleteRectangularMatrix(points)) return -Infinity;

  const quality = evaluateLayoutQuality(points, bounds);
  if (quality.rejected) return -Infinity;

  const roomWidth = bounds.maxX - bounds.minX;
  const roomHeight = bounds.maxY - bounds.minY;
  const roomAspect = roomWidth / Math.max(roomHeight, 0.01);
  const matrixAspect = cols / Math.max(rows, 1);

  let score = quality.score * 900;
  score -= Math.abs(Math.log((matrixAspect + 0.01) / (roomAspect + 0.01))) * 90;

  const spread = getSpreadMetrics(points, bounds);
  const extentAvg = (spread.extentXRatio + spread.extentYRatio) / 2;
  if (extentAvg >= 0.45 && extentAvg <= 0.92) score += extentAvg * 450;
  else if (extentAvg < 0.35) score -= 2000;

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
    calculatedCount,
  );

  if (!lux.meetsTarget) {
    score -= (context.targetLux - lux.indicativeAverageLux) * 15;
    if (placedCount < calculatedCount && product.category === "led_panel") return -Infinity;
  }

  const countDelta = Math.abs(placedCount - calculatedCount);
  score -= countDelta * 1400;
  if (countDelta === 0) score += 3500;

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

    const adjacent = countAdjacentLuminaires(points, pixelsPerMeter, productId, rotation);
    if (adjacent.totalPairs > 0) {
      const penaltyPerPair = isElongatedPanel(productId) ? 18_000 : 4_000;
      score -= adjacent.totalPairs * penaltyPerPair;
    }
    const minEdgeGap = minEdgeToEdgeGapM(points, pixelsPerMeter, productId, rotation);
    if (Number.isFinite(minEdgeGap)) {
      score += Math.min(minEdgeGap, 1.2) * (isElongatedPanel(productId) ? 220 : 80);
    }
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
  countSearchDelta?: number;
}

function spacingM(a: Point2D, b: Point2D, pixelsPerMeter: number): number {
  return Math.hypot(a.x - b.x, a.y - b.y) / pixelsPerMeter;
}

function colIndicesMeetMinGap(
  colList: ModuleColumnEntry[],
  indices: number[],
  pixelsPerMeter: number,
  productId: PublicProductId,
  rotation: number,
): boolean {
  if (isElongatedPanel(productId)) {
    return true;
  }
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

function orientMatrixForRoom(
  rows: number,
  cols: number,
  roomAspect: number,
  productId: PublicProductId,
): [number, number] {
  if (rows === cols) return [rows, cols];
  if (isElongatedPanel(productId)) return [rows, cols];
  const err = (r: number, c: number) => {
    const aspect = c / Math.max(r, 1);
    return Math.abs(Math.log((aspect + 0.01) / (roomAspect + 0.01)));
  };
  return err(cols, rows) < err(rows, cols) ? [cols, rows] : [rows, cols];
}

function matrixOrientationsToTry(
  rows: number,
  cols: number,
  productId: PublicProductId,
  roomAspect: number,
): Array<[number, number]> {
  if (rows === cols) return [[rows, cols]];
  if (isElongatedPanel(productId)) {
    const a: [number, number] = [rows, cols];
    const b: [number, number] = [cols, rows];
    if (a[0] === b[0] && a[1] === b[1]) return [a];
    return [a, b];
  }
  return [orientMatrixForRoom(rows, cols, roomAspect, productId)];
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
        if (!colIndicesMeetMinGap(colList, colPick.indices, pixelsPerMeter, productId, rotation)) {
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
        calculatedCount: input.requiredCount,
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

export function selectBestDistributedModuleMatrix(
  input: DistributedModuleMatrixInput,
): { points: Point2D[]; rows: number; cols: number; rowStep: number; colStep: number } | null {
  const {
    requiredCount: calculatedCount,
    roomAspect,
    maxMatrixDim = 12,
    countSearchDelta = MATRIX_COUNT_SEARCH_DELTA,
  } = input;

  const sizes = enumerateFullMatrixSizes(calculatedCount, maxMatrixDim, countSearchDelta).sort(
    (a, b) => {
      const deltaA = Math.abs(a.total - calculatedCount);
      const deltaB = Math.abs(b.total - calculatedCount);
      if (deltaA !== deltaB) return deltaA - deltaB;
      const aspectA = a.cols / Math.max(a.rows, 1);
      const aspectB = b.cols / Math.max(b.rows, 1);
      return (
        Math.abs(Math.log((aspectA + 0.01) / (roomAspect + 0.01))) -
        Math.abs(Math.log((aspectB + 0.01) / (roomAspect + 0.01)))
      );
    },
  );

  let best: { points: Point2D[]; rows: number; cols: number; rowStep: number; colStep: number } | null =
    null;
  let bestScore = -Infinity;

  const maxModuleCols = Math.max(
    0,
    ...[...input.colsByRow.values()].map((list) => list.length),
  );
  const preferSingleRow =
    getPublicProduct(input.productId).category === "downlight" &&
    roomAspect >= 1.1 &&
    maxModuleCols >= calculatedCount;

  if (preferSingleRow) {
    const uniform = tryUniformMatrix(input, 1, calculatedCount);
    if (uniform) {
      const score = scoreDistributedFixtureLayout({
        points: uniform.points,
        rows: 1,
        cols: calculatedCount,
        rowStep: uniform.rowStep,
        colStep: uniform.colStep,
        calculatedCount,
        bounds: input.bounds,
        vertices: input.vertices,
        pixelsPerMeter: input.pixelsPerMeter,
        productId: input.productId,
        context: input.context,
        rotation: input.rotation,
      });
      if (score > bestScore) {
        bestScore = score;
        best = {
          points: uniform.points,
          rows: 1,
          cols: calculatedCount,
          rowStep: uniform.rowStep,
          colStep: uniform.colStep,
        };
      }
    }
  }

  const triedMatrixKeys = new Set<string>();

  const evaluateSizes = (sizeList: typeof sizes) => {
    for (const size of sizeList) {
      if (preferSingleRow && size.rows > 1) continue;
      const orientations = matrixOrientationsToTry(
        size.rows,
        size.cols,
        input.productId,
        roomAspect,
      );

      for (const [matrixRows, matrixCols] of orientations) {
        const key = `${matrixRows}x${matrixCols}`;
        if (triedMatrixKeys.has(key)) continue;
        triedMatrixKeys.add(key);

        const uniform = tryUniformMatrix(input, matrixRows, matrixCols);
        if (!uniform) continue;

        const score = scoreDistributedFixtureLayout({
          points: uniform.points,
          rows: matrixRows,
          cols: matrixCols,
          rowStep: uniform.rowStep,
          colStep: uniform.colStep,
          calculatedCount,
          bounds: input.bounds,
          vertices: input.vertices,
          pixelsPerMeter: input.pixelsPerMeter,
          productId: input.productId,
          context: input.context,
          rotation: input.rotation,
        });
        if (score > bestScore) {
          bestScore = score;
          best = {
            points: uniform.points,
            rows: matrixRows,
            cols: matrixCols,
            rowStep: uniform.rowStep,
            colStep: uniform.colStep,
          };
        }
      }
    }
  };

  const exactSizes = sizes.filter((size) => size.total === calculatedCount);
  evaluateSizes(exactSizes);
  if (!best) {
    evaluateSizes(sizes.filter((size) => size.total !== calculatedCount));
  }

  return best;
}
