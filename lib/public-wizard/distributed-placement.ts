import { calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import { getSpreadMetrics } from "@/lib/public-wizard/ceiling-grid";
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

/** All ways to pick `pickCount` slots from `slotCount` with constant index step (max spread first). */
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

  for (let step = maxStep; step >= 1; step--) {
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

function marginBalanceScore(
  left: number,
  right: number,
  top: number,
  bottom: number,
): number {
  return -(Math.abs(left - right) + Math.abs(top - bottom));
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
    rowStep,
    colStep,
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

  const roomWidth = bounds.maxX - bounds.minX;
  const roomHeight = bounds.maxY - bounds.minY;
  const roomAspect = roomWidth / Math.max(roomHeight, 0.01);
  const matrixAspect = cols / Math.max(rows, 1);

  let score = 20000;
  score -= Math.abs(Math.log((matrixAspect + 0.01) / (roomAspect + 0.01))) * 120;

  const spread = getSpreadMetrics(points, bounds);
  score += (spread.extentXRatio + spread.extentYRatio) * 4500;
  score += marginBalanceScore(
    spread.leftMarginPx,
    spread.rightMarginPx,
    spread.topMarginPx,
    spread.bottomMarginPx,
  ) * 0.15;

  if (rows > 1) score += rowStep * 650;
  if (cols > 1) score += colStep * 650;
  if (rows > 1 && rowStep === 1 && rows < 0.85 * (spread.extentYRatio > 0 ? rows : rows)) {
    score -= 4000;
  }
  if (cols > 1 && colStep === 1) {
    const colSpanRatio = spread.extentXRatio;
    if (colSpanRatio < 0.55 && cols >= 3) score -= 12000;
  }
  if (rows > 1 && rowStep === 1) {
    const rowSpanRatio = spread.extentYRatio;
    if (rowSpanRatio < 0.55 && rows >= 3) score -= 12000;
  }

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

  const delta = placedCount - requiredCount;
  if (placedCount === requiredCount) score += 3000;
  else score -= Math.abs(delta) * 1200;

  if (lux < context.targetLux * 0.92) {
    score -= (context.targetLux - lux) * 12;
  } else if (lux >= context.targetLux * 0.95) {
    score += 400;
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
    score += Math.min(minEdgeM, 0.5) * 80;
  }

  return score;
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

export function selectBestDistributedModuleMatrix(
  input: DistributedModuleMatrixInput,
): { points: Point2D[]; rows: number; cols: number; rowStep: number; colStep: number } | null {
  const {
    sortedRows,
    colsByRow,
    requiredCount,
    roomAspect,
    bounds,
    vertices,
    pixelsPerMeter,
    productId,
    context,
    rotation = 0,
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

  const sizePhases = [
    sortSizes(allSizes.filter((size) => size.total === requiredCount)),
    sortSizes(allSizes.filter((size) => size.total !== requiredCount)),
  ];

  let best: { points: Point2D[]; rows: number; cols: number; rowStep: number; colStep: number } | null = null;
  let bestScore = -Infinity;

  for (const sizes of sizePhases) {
    for (const size of sizes) {
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

    const rowPlacements = evenlyDistributedIndexSets(sortedRows.length, matrixRows);
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
          for (const colIndex of colPick.indices) {
            const entry = colList[colIndex];
            if (!entry) {
              valid = false;
              break;
            }
            if (
              getPublicProduct(productId).category === "led_panel" &&
              !isPanelFootprintInsideRoom(entry.point, pixelsPerMeter, vertices, productId, rotation)
            ) {
              valid = false;
              break;
            }
            points.push(entry.point);
          }
          if (!valid) break;
        }
        if (!valid || points.length !== matrixRows * matrixCols) continue;

        const score = scoreDistributedFixtureLayout({
          points,
          rows: matrixRows,
          cols: matrixCols,
          rowStep: rowPick.step,
          colStep: colPick.step,
          requiredCount,
          bounds,
          vertices,
          pixelsPerMeter,
          productId,
          context,
          rotation,
        });

        if (score > bestScore) {
          bestScore = score;
          best = {
            points,
            rows: matrixRows,
            cols: matrixCols,
            rowStep: rowPick.step,
            colStep: colPick.step,
          };
        }
      }
    }
    }
    if (best && sizes === sizePhases[0] && sizes.length > 0) {
      break;
    }
  }

  return best;
}
