import { CEILING_GRID_M, snapPointToGridPx, uniqueGridPoints } from "@/lib/public-wizard/grid";
import {
  calculateIndicativeResult,
} from "@/lib/public-wizard/calculation";
import {
  getMinCenterInsetM,
  isFixtureCenterValid,
  isPanelPlacementValid,
} from "@/lib/public-wizard/placement-constraints";
import { getPublicProduct } from "@/lib/public-wizard/products";
import { pointInPolygon } from "@/lib/public-wizard/placement";
import type { Point2D } from "@/types/floor-plan";
import type { PlacedPublicFixture, PublicProductId } from "@/types/public-wizard";

export const PANEL_SIZE_M = 0.595;

export interface CeilingLayoutResult {
  fixtures: PlacedPublicFixture[];
  requestedCount: number;
  placedCount: number;
  matrixRows?: number;
  matrixCols?: number;
  warning?: string;
}

export interface PanelLayoutContext {
  areaM2: number;
  targetLux: number;
  ceilingHeightM: number;
}

export interface SpreadMetrics {
  extentXRatio: number;
  extentYRatio: number;
  leftMarginPx: number;
  rightMarginPx: number;
  topMarginPx: number;
  bottomMarginPx: number;
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

function nextId(): string {
  return `fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function panelHalfSizePx(pixelsPerMeter: number): number {
  return (PANEL_SIZE_M / 2) * pixelsPerMeter;
}

export function panelFootprintInside(
  center: Point2D,
  pixelsPerMeter: number,
  polygon: Point2D[],
  productId: PublicProductId = "led_panel_4000",
): boolean {
  return isPanelPlacementValid(center, pixelsPerMeter, polygon, productId);
}

export function downlightCenterValid(center: Point2D, polygon: Point2D[]): boolean {
  return pointInPolygon(center, polygon);
}

export function buildValidGridCenters(
  vertices: Point2D[],
  pixelsPerMeter: number,
  productId: PublicProductId,
): Point2D[] {
  if (vertices.length < 3 || pixelsPerMeter <= 0) return [];

  const bounds = polygonBounds(vertices);
  const gridPx = CEILING_GRID_M * pixelsPerMeter;
  const product = getPublicProduct(productId);
  const insetPx =
    product.category === "led_panel" ? getMinCenterInsetM(productId) * pixelsPerMeter : 0;
  const safeBounds = {
    minX: bounds.minX + insetPx,
    maxX: bounds.maxX - insetPx,
    minY: bounds.minY + insetPx,
    maxY: bounds.maxY - insetPx,
  };
  const center = {
    x: (safeBounds.minX + safeBounds.maxX) / 2,
    y: (safeBounds.minY + safeBounds.maxY) / 2,
  };
  const origin = snapPointToGridPx(center, pixelsPerMeter);
  const spanX = Math.ceil((bounds.maxX - bounds.minX) / gridPx) + 6;
  const spanY = Math.ceil((bounds.maxY - bounds.minY) / gridPx) + 6;
  const points: Point2D[] = [];

  for (let row = -spanY; row <= spanY; row++) {
    for (let col = -spanX; col <= spanX; col++) {
      const point = {
        x: origin.x + col * gridPx,
        y: origin.y + row * gridPx,
      };
      if (isFixtureCenterValid(point, pixelsPerMeter, vertices, productId)) {
        points.push(point);
      }
    }
  }

  return uniqueGridPoints(points);
}

export function getSpreadMetrics(points: Point2D[], bounds: ReturnType<typeof polygonBounds>): SpreadMetrics {
  if (points.length === 0) {
    return {
      extentXRatio: 0,
      extentYRatio: 0,
      leftMarginPx: 0,
      rightMarginPx: 0,
      topMarginPx: 0,
      bottomMarginPx: 0,
    };
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bboxW = bounds.maxX - bounds.minX;
  const bboxH = bounds.maxY - bounds.minY;
  return {
    extentXRatio: bboxW > 0 ? (maxX - minX) / bboxW : 0,
    extentYRatio: bboxH > 0 ? (maxY - minY) / bboxH : 0,
    leftMarginPx: minX - bounds.minX,
    rightMarginPx: bounds.maxX - maxX,
    topMarginPx: minY - bounds.minY,
    bottomMarginPx: bounds.maxY - maxY,
  };
}

export function getGridSpacingPx(points: Point2D[]): { rowSpacingPx: number; colSpacingPx: number } {
  const xs = [...new Set(points.map((p) => Math.round(p.x)))].sort((a, b) => a - b);
  const ys = [...new Set(points.map((p) => Math.round(p.y)))].sort((a, b) => a - b);
  const colSpacingPx = xs.length > 1 ? xs[1]! - xs[0]! : 0;
  const rowSpacingPx = ys.length > 1 ? ys[1]! - ys[0]! : 0;
  return { rowSpacingPx, colSpacingPx };
}

export function describeFixtureMatrix(
  fixtures: Array<{ x: number; y: number }>,
): { rows: number; cols: number; panelCount: number; isComplete: boolean } {
  const xs = [...new Set(fixtures.map((f) => Math.round(f.x)))].sort((a, b) => a - b);
  const ys = [...new Set(fixtures.map((f) => Math.round(f.y)))].sort((a, b) => a - b);
  const rows = ys.length;
  const cols = xs.length;
  return {
    rows,
    cols,
    panelCount: fixtures.length,
    isComplete: fixtures.length === rows * cols && rows > 0 && cols > 0,
  };
}

function getSafeBoundsPx(
  vertices: Point2D[],
  pixelsPerMeter: number,
  productId: PublicProductId,
) {
  const bounds = polygonBounds(vertices);
  const insetPx = getMinCenterInsetM(productId) * pixelsPerMeter;
  return {
    bounds,
    minX: bounds.minX + insetPx,
    maxX: bounds.maxX - insetPx,
    minY: bounds.minY + insetPx,
    maxY: bounds.maxY - insetPx,
    width: bounds.maxX - bounds.minX - 2 * insetPx,
    height: bounds.maxY - bounds.minY - 2 * insetPx,
  };
}

function enumerateFullMatrixSizes(requiredCount: number): Array<{ rows: number; cols: number }> {
  const minTotal = Math.max(1, requiredCount - 1);
  const maxTotal = Math.min(120, Math.ceil(requiredCount * 1.28));
  const sizes: Array<{ rows: number; cols: number }> = [];
  for (let rows = 1; rows <= 12; rows++) {
    for (let cols = 1; cols <= 12; cols++) {
      const total = rows * cols;
      if (total < minTotal || total > maxTotal) continue;
      sizes.push({ rows, cols });
    }
  }
  return sizes;
}

function maxUniformStepCells(
  spanPx: number,
  panelCountOnAxis: number,
  gridPx: number,
): number {
  if (panelCountOnAxis <= 1) return 12;
  const maxStep = Math.floor(spanPx / ((panelCountOnAxis - 1) * gridPx));
  return Math.max(1, Math.min(12, maxStep));
}

function tryBuildCenteredMatrix(
  vertices: Point2D[],
  pixelsPerMeter: number,
  rows: number,
  cols: number,
  stepCellsX: number,
  stepCellsY: number,
  productId: PublicProductId,
): Point2D[] | null {
  const safe = getSafeBoundsPx(vertices, pixelsPerMeter, productId);
  const gridPx = CEILING_GRID_M * pixelsPerMeter;
  const spacingX = stepCellsX * gridPx;
  const spacingY = stepCellsY * gridPx;
  const matrixW = Math.max(0, (cols - 1) * spacingX);
  const matrixH = Math.max(0, (rows - 1) * spacingY);

  if (matrixW > safe.width + 0.5 || matrixH > safe.height + 0.5) {
    return null;
  }

  const idealOriginX = (safe.minX + safe.maxX - matrixW) / 2;
  const idealOriginY = (safe.minY + safe.maxY - matrixH) / 2;

  let best: Point2D[] | null = null;
  let bestBalance = Infinity;

  for (let ox = -10; ox <= 10; ox++) {
    for (let oy = -10; oy <= 10; oy++) {
      const origin = snapPointToGridPx(
        {
          x: idealOriginX + ox * gridPx,
          y: idealOriginY + oy * gridPx,
        },
        pixelsPerMeter,
      );
      const points: Point2D[] = [];
      let valid = true;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const point = {
            x: origin.x + c * spacingX,
            y: origin.y + r * spacingY,
          };
          if (!isPanelPlacementValid(point, pixelsPerMeter, vertices, productId)) {
            valid = false;
            break;
          }
          points.push(point);
        }
        if (!valid) break;
      }
      if (!valid || points.length !== rows * cols) continue;

      const metrics = getSpreadMetrics(points, safe.bounds);
      const balance =
        Math.abs(metrics.leftMarginPx - metrics.rightMarginPx) +
        Math.abs(metrics.topMarginPx - metrics.bottomMarginPx);
      if (balance < bestBalance) {
        bestBalance = balance;
        best = points;
      }
    }
  }

  return best;
}

function scoreCompleteMatrixLayout(
  points: Point2D[],
  rows: number,
  cols: number,
  requiredCount: number,
  vertices: Point2D[],
  pixelsPerMeter: number,
  productId: PublicProductId,
  context: PanelLayoutContext,
  stepCellsX: number,
  stepCellsY: number,
): number {
  const placedCount = rows * cols;
  const safe = getSafeBoundsPx(vertices, pixelsPerMeter, productId);
  const roomAspect = safe.bounds.maxX - safe.bounds.minX;
  const roomHeight = safe.bounds.maxY - safe.bounds.minY;
  const aspect = roomAspect / Math.max(roomHeight, 0.01);
  const matrixAspect = cols / Math.max(rows, 1);

  let score = 15000;

  score -= Math.abs(Math.log((matrixAspect + 0.01) / (aspect + 0.01))) * 90;

  const metrics = getSpreadMetrics(points, safe.bounds);
  score += (metrics.extentXRatio + metrics.extentYRatio) * 700;
  score -=
    (Math.abs(metrics.leftMarginPx - metrics.rightMarginPx) +
      Math.abs(metrics.topMarginPx - metrics.bottomMarginPx)) *
    0.1;

  const { rowSpacingPx, colSpacingPx } = getGridSpacingPx(points);
  if (rowSpacingPx > 0 && colSpacingPx > 0) {
    if (Math.abs(rowSpacingPx - colSpacingPx) < 1) score += 200;
    else score -= Math.abs(rowSpacingPx - colSpacingPx) * 0.03;
  }

  if (stepCellsX === stepCellsY) score += 80;
  else score -= Math.abs(stepCellsX - stepCellsY) * 15;

  const fixtures: PlacedPublicFixture[] = points.map((point, index) => ({
    id: `score-${index}`,
    productId,
    x: point.x,
    y: point.y,
    rotation: 0,
  }));
  const lux = calculateIndicativeResult(
    context.areaM2,
    context.targetLux,
    context.ceilingHeightM,
    fixtures,
    requiredCount,
  ).indicativeAverageLux;

  const delta = placedCount - requiredCount;
  if (delta < 0) score -= Math.abs(delta) * 650;
  else score -= delta * 110;
  if (placedCount === requiredCount) score += 900;

  if (rows === cols) score += 420;
  const squareness = 1 - Math.abs(rows - cols) / Math.max(rows, cols);
  score += squareness * 120;

  if (placedCount > requiredCount && rows === cols && lux >= context.targetLux * 0.95) {
    score += 220;
  }

  if (lux < context.targetLux * 0.95) {
    score -= (context.targetLux - lux) * 10;
  } else if (lux > context.targetLux * 1.35) {
    score -= (lux - context.targetLux) * 4;
  } else if (lux >= context.targetLux * 0.95) {
    score += 120;
  }

  return score;
}

function orientMatrixForRoom(
  rows: number,
  cols: number,
  roomAspect: number,
): [number, number] {
  const optionA: [number, number] = [rows, cols];
  const optionB: [number, number] = [cols, rows];
  if (rows === cols) return optionA;
  const aspectA = optionA[1] / optionA[0];
  const aspectB = optionB[1] / optionB[0];
  const errA = Math.abs(Math.log((aspectA + 0.01) / (roomAspect + 0.01)));
  const errB = Math.abs(Math.log((aspectB + 0.01) / (roomAspect + 0.01)));
  return errA <= errB ? optionA : optionB;
}

function computeBestCompleteMatrixLayout(
  vertices: Point2D[],
  pixelsPerMeter: number,
  requiredCount: number,
  productId: PublicProductId,
  context: PanelLayoutContext,
): { points: Point2D[]; rows: number; cols: number } | null {
  const safe = getSafeBoundsPx(vertices, pixelsPerMeter, productId);
  const gridPx = CEILING_GRID_M * pixelsPerMeter;
  const roomAspect =
    (safe.bounds.maxX - safe.bounds.minX) / Math.max(safe.bounds.maxY - safe.bounds.minY, 0.01);

  let bestPoints: Point2D[] | null = null;
  let bestRows = 0;
  let bestCols = 0;
  let bestScore = -Infinity;

  for (const size of enumerateFullMatrixSizes(requiredCount)) {
    const [rows, cols] = orientMatrixForRoom(size.rows, size.cols, roomAspect);
    const maxStepX = maxUniformStepCells(safe.width, cols, gridPx);
    const maxStepY = maxUniformStepCells(safe.height, rows, gridPx);
    const maxUniform = Math.min(maxStepX, maxStepY);

    const stepPlans: Array<[number, number]> = [];
    for (let step = 1; step <= maxUniform; step++) {
      stepPlans.push([step, step]);
    }
    for (let stepX = 1; stepX <= maxStepX; stepX++) {
      for (let stepY = 1; stepY <= maxStepY; stepY++) {
        if (stepX === stepY) continue;
        stepPlans.push([stepX, stepY]);
      }
    }

    for (const [stepX, stepY] of stepPlans) {
      const points = tryBuildCenteredMatrix(
        vertices,
        pixelsPerMeter,
        rows,
        cols,
        stepX,
        stepY,
        productId,
      );
      if (!points || points.length !== rows * cols) continue;

      const score = scoreCompleteMatrixLayout(
        points,
        rows,
        cols,
        requiredCount,
        vertices,
        pixelsPerMeter,
        productId,
        context,
        stepX,
        stepY,
      );
      if (score > bestScore) {
        bestScore = score;
        bestPoints = points;
        bestRows = rows;
        bestCols = cols;
      }
    }
  }

  if (!bestPoints) return null;
  return { points: bestPoints, rows: bestRows, cols: bestCols };
}

/** Place LED panels on a strict 600 mm ceiling grid, spread across the full room. */
export function placePanelsOnCeilingGrid(
  vertices: Point2D[],
  pixelsPerMeter: number,
  targetCount: number,
  productId: PublicProductId,
  layoutContext?: PanelLayoutContext,
): CeilingLayoutResult {
  if (vertices.length < 3 || targetCount <= 0 || pixelsPerMeter <= 0) {
    return { fixtures: [], requestedCount: targetCount, placedCount: 0 };
  }

  const context: PanelLayoutContext = layoutContext ?? {
    areaM2: 0,
    targetLux: 500,
    ceilingHeightM: 2.7,
  };

  const layout = computeBestCompleteMatrixLayout(
    vertices,
    pixelsPerMeter,
    targetCount,
    productId,
    context,
  );

  const bestPoints = layout?.points ?? [];
  const matrixRows = layout?.rows;
  const matrixCols = layout?.cols;

  const fixtures: PlacedPublicFixture[] = bestPoints.map((point) => ({
    id: nextId(),
    productId,
    x: point.x,
    y: point.y,
    rotation: 0,
  }));

  let warning: string | undefined;
  if (fixtures.length > targetCount && matrixRows && matrixCols) {
    warning = `Theoretisch benodigd: ${targetCount} panelen. Gekozen nette verdeling: ${fixtures.length} panelen (${matrixRows}×${matrixCols} matrix).`;
  } else if (fixtures.length < targetCount) {
    warning = `Theoretisch benodigd: ${targetCount} panelen. Gekozen nette verdeling: ${fixtures.length} panelen (minimaal 60 cm wandafstand).`;
  }

  return {
    fixtures,
    requestedCount: targetCount,
    placedCount: fixtures.length,
    matrixRows,
    matrixCols,
    warning,
  };
}

function positionOccupied(
  point: Point2D,
  occupied: PlacedPublicFixture[],
  excludeId?: string,
  tolerance = 2,
): boolean {
  return occupied.some(
    (f) =>
      f.id !== excludeId &&
      Math.abs(f.x - point.x) < tolerance &&
      Math.abs(f.y - point.y) < tolerance,
  );
}

export function findNearestFreeGridPosition(
  vertices: Point2D[],
  pixelsPerMeter: number,
  occupied: PlacedPublicFixture[],
  preferNear: Point2D,
  productId: PublicProductId,
): Point2D | null {
  const candidates = buildValidGridCenters(vertices, pixelsPerMeter, productId);
  const free = candidates.filter((c) => !positionOccupied(c, occupied));
  if (free.length === 0) return null;
  free.sort(
    (a, b) =>
      Math.hypot(a.x - preferNear.x, a.y - preferNear.y) -
      Math.hypot(b.x - preferNear.x, b.y - preferNear.y),
  );
  return free[0] ?? null;
}

export function snapFixtureToGrid(
  x: number,
  y: number,
  pixelsPerMeter: number,
  vertices: Point2D[],
  productId: PublicProductId,
  previous?: Point2D,
  occupied: PlacedPublicFixture[] = [],
  excludeId?: string,
): Point2D | null {
  const gridPx = CEILING_GRID_M * pixelsPerMeter;

  const isValid = (candidate: Point2D) => {
    if (!isFixtureCenterValid(candidate, pixelsPerMeter, vertices, productId)) return false;
    return !positionOccupied(candidate, occupied, excludeId);
  };

  const snapped = snapPointToGridPx({ x, y }, pixelsPerMeter);
  if (isValid(snapped)) return snapped;

  let best: Point2D | null = null;
  let bestDist = Infinity;
  for (let dy = -8; dy <= 8; dy++) {
    for (let dx = -8; dx <= 8; dx++) {
      const candidate = {
        x: snapped.x + dx * gridPx,
        y: snapped.y + dy * gridPx,
      };
      if (!isValid(candidate)) continue;
      const dist = Math.hypot(candidate.x - x, candidate.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = candidate;
      }
    }
  }
  return best ?? previous ?? null;
}
