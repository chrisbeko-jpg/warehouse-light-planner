import { CEILING_GRID_M, snapPointToGridPx, uniqueGridPoints } from "@/lib/public-wizard/grid";
import { getPublicProduct } from "@/lib/public-wizard/products";
import { pointInPolygon } from "@/lib/public-wizard/placement";
import type { Point2D } from "@/types/floor-plan";
import type { PlacedPublicFixture, PublicProductId } from "@/types/public-wizard";

export const PANEL_SIZE_M = 0.595;

export interface CeilingLayoutResult {
  fixtures: PlacedPublicFixture[];
  requestedCount: number;
  placedCount: number;
  warning?: string;
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
): boolean {
  const h = panelHalfSizePx(pixelsPerMeter);
  const corners: Point2D[] = [
    { x: center.x - h, y: center.y - h },
    { x: center.x + h, y: center.y - h },
    { x: center.x + h, y: center.y + h },
    { x: center.x - h, y: center.y + h },
  ];
  return corners.every((c) => pointInPolygon(c, polygon));
}

export function downlightCenterValid(center: Point2D, polygon: Point2D[]): boolean {
  return pointInPolygon(center, polygon);
}

export function buildValidGridCenters(
  vertices: Point2D[],
  pixelsPerMeter: number,
  requirePanelFootprint: boolean,
): Point2D[] {
  if (vertices.length < 3 || pixelsPerMeter <= 0) return [];

  const bounds = polygonBounds(vertices);
  const gridPx = CEILING_GRID_M * pixelsPerMeter;
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
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
      const valid = requirePanelFootprint
        ? panelFootprintInside(point, pixelsPerMeter, vertices)
        : downlightCenterValid(point, vertices);
      if (valid) points.push(point);
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

function factorPairs(count: number): Array<[number, number]> {
  const pairs = new Set<string>();
  const maxDim = Math.max(12, Math.ceil(Math.sqrt(count)) + 4);
  for (let rows = 1; rows <= maxDim; rows++) {
    for (let cols = 1; cols <= maxDim; cols++) {
      const total = rows * cols;
      if (total >= count - 2 && total <= count + 6) {
        pairs.add(`${rows}x${cols}`);
      }
    }
  }
  return [...pairs].map((key) => {
    const [r, c] = key.split("x").map(Number);
    return [r!, c!] as [number, number];
  });
}

function evenlySpacedIndices(length: number, pick: number): number[] {
  if (pick <= 0 || length <= 0) return [];
  if (pick >= length) return Array.from({ length }, (_, i) => i);
  if (pick === 1) return [Math.floor((length - 1) / 2)];
  const indices: number[] = [];
  for (let i = 0; i < pick; i++) {
    indices.push(Math.round((i * (length - 1)) / (pick - 1)));
  }
  return [...new Set(indices)].sort((a, b) => a - b);
}

function subsampleGridPoints(points: Point2D[], targetCount: number): Point2D[] {
  if (points.length <= targetCount) return points;
  const ys = [...new Set(points.map((p) => Math.round(p.y)))].sort((a, b) => a - b);
  const xs = [...new Set(points.map((p) => Math.round(p.x)))].sort((a, b) => a - b);
  const aspect = xs.length / Math.max(ys.length, 1);
  const targetRows = Math.max(1, Math.round(Math.sqrt(targetCount / Math.max(aspect, 0.01))));
  let targetCols = Math.max(1, Math.ceil(targetCount / targetRows));
  while (targetRows * targetCols < targetCount) targetCols += 1;

  const rowIdx = evenlySpacedIndices(ys.length, Math.min(targetRows, ys.length));
  const colIdx = evenlySpacedIndices(xs.length, Math.min(targetCols, xs.length));
  const picked: Point2D[] = [];
  for (const ri of rowIdx) {
    for (const ci of colIdx) {
      const y = ys[ri]!;
      const x = xs[ci]!;
      const match = points.find((p) => Math.round(p.x) === x && Math.round(p.y) === y);
      if (match) picked.push(match);
    }
  }
  const unique = uniqueGridPoints(picked);
  if (unique.length >= targetCount) return unique.slice(0, targetCount);
  return unique;
}

function scoreSpreadPattern(
  points: Point2D[],
  targetCount: number,
  bounds: ReturnType<typeof polygonBounds>,
  bboxW: number,
  bboxH: number,
  aspect: number,
  rows: number,
  cols: number,
): number {
  if (points.length === 0) return -Infinity;

  const metrics = getSpreadMetrics(points, bounds);
  const countPenalty = -Math.abs(points.length - targetCount) * 250;
  const spreadScore = (metrics.extentXRatio + metrics.extentYRatio) * 800;
  const marginBalance =
    -(
      Math.abs(metrics.leftMarginPx - metrics.rightMarginPx) +
      Math.abs(metrics.topMarginPx - metrics.bottomMarginPx)
    ) * 0.05;

  const gridAspect = cols / Math.max(rows, 1);
  const aspectFit = -Math.abs(Math.log((gridAspect + 0.01) / (aspect + 0.01))) * 40;

  const { rowSpacingPx, colSpacingPx } = getGridSpacingPx(points);
  const gridBonus =
    rowSpacingPx > 0 &&
    colSpacingPx > 0 &&
    Math.abs(rowSpacingPx / colSpacingPx - 1) < 0.01
      ? 20
      : 0;

  return spreadScore + marginBalance + countPenalty + aspectFit + gridBonus;
}

function buildSpreadPattern(
  vertices: Point2D[],
  pixelsPerMeter: number,
  rows: number,
  cols: number,
  stepX: number,
  stepY: number,
  targetCount: number,
): Point2D[] {
  const bounds = polygonBounds(vertices);
  const gridPx = CEILING_GRID_M * pixelsPerMeter;
  const spacingXPx = stepX * gridPx;
  const spacingYPx = stepY * gridPx;
  const patternW = Math.max(0, (cols - 1) * spacingXPx);
  const patternH = Math.max(0, (rows - 1) * spacingYPx);
  const bboxW = bounds.maxX - bounds.minX;
  const bboxH = bounds.maxY - bounds.minY;
  const aspect = bboxW / Math.max(bboxH, 0.01);

  let best: Point2D[] = [];
  let bestScore = -Infinity;

  const idealOriginX = (bounds.minX + bounds.maxX - patternW) / 2;
  const idealOriginY = (bounds.minY + bounds.maxY - patternH) / 2;

  for (let ox = -6; ox <= 6; ox++) {
    for (let oy = -6; oy <= 6; oy++) {
      const origin = snapPointToGridPx(
        {
          x: idealOriginX + ox * gridPx,
          y: idealOriginY + oy * gridPx,
        },
        pixelsPerMeter,
      );
      const points: Point2D[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const point = {
            x: origin.x + c * spacingXPx,
            y: origin.y + r * spacingYPx,
          };
          if (panelFootprintInside(point, pixelsPerMeter, vertices)) {
            points.push(point);
          }
        }
      }
      const picked = subsampleGridPoints(points, targetCount);
      const score = scoreSpreadPattern(picked, targetCount, bounds, bboxW, bboxH, aspect, rows, cols);
      if (score > bestScore) {
        bestScore = score;
        best = picked;
      }
    }
  }

  return best;
}

function selectSpreadFromValidGrid(
  vertices: Point2D[],
  pixelsPerMeter: number,
  targetCount: number,
): Point2D[] {
  const candidates = buildValidGridCenters(vertices, pixelsPerMeter, true);
  if (candidates.length === 0) return [];
  const bounds = polygonBounds(vertices);
  const ys = [...new Set(candidates.map((p) => Math.round(p.y)))].sort((a, b) => a - b);
  const xs = [...new Set(candidates.map((p) => Math.round(p.x)))].sort((a, b) => a - b);
  const aspect = (bounds.maxX - bounds.minX) / Math.max(bounds.maxY - bounds.minY, 0.01);

  let best: Point2D[] = [];
  let bestScore = -Infinity;

  for (let rows = 1; rows <= Math.min(12, ys.length); rows++) {
    for (let cols = 1; cols <= Math.min(12, xs.length); cols++) {
      if (rows * cols < targetCount - 2 || rows * cols > targetCount + 6) continue;
      const rowIdx = evenlySpacedIndices(ys.length, rows);
      const colIdx = evenlySpacedIndices(xs.length, cols);
      const picked: Point2D[] = [];
      for (const ri of rowIdx) {
        for (const ci of colIdx) {
          const match = candidates.find(
            (p) => Math.round(p.x) === xs[ci] && Math.round(p.y) === ys[ri],
          );
          if (match) picked.push(match);
        }
      }
      const unique = uniqueGridPoints(picked);
      const final = subsampleGridPoints(unique, targetCount);
      const score = scoreSpreadPattern(
        final,
        targetCount,
        bounds,
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY,
        aspect,
        rows,
        cols,
      );
      if (score > bestScore) {
        bestScore = score;
        best = final;
      }
    }
  }

  return best;
}

function maxGridStep(bboxPx: number, count: number, gridPx: number): number {
  if (count <= 1) return 8;
  const maxSpan = bboxPx * 0.95;
  const maxStep = Math.floor(maxSpan / ((count - 1) * gridPx));
  return Math.max(1, Math.min(8, maxStep));
}

/** Place LED panels on a strict 600 mm ceiling grid, spread across the full room. */
export function placePanelsOnCeilingGrid(
  vertices: Point2D[],
  pixelsPerMeter: number,
  targetCount: number,
  productId: PublicProductId,
): CeilingLayoutResult {
  if (vertices.length < 3 || targetCount <= 0 || pixelsPerMeter <= 0) {
    return { fixtures: [], requestedCount: targetCount, placedCount: 0 };
  }

  const bounds = polygonBounds(vertices);
  const gridPx = CEILING_GRID_M * pixelsPerMeter;
  const bboxW = bounds.maxX - bounds.minX;
  const bboxH = bounds.maxY - bounds.minY;
  const aspect = bboxW / Math.max(bboxH, 0.01);

  let bestPoints: Point2D[] = [];
  let bestScore = -Infinity;

  for (const [rows, cols] of factorPairs(targetCount)) {
    const oriented =
      aspect >= 1 ? ([rows, cols] as [number, number]) : ([cols, rows] as [number, number]);
    const maxStepX = maxGridStep(bboxW, oriented[1], gridPx);
    const maxStepY = maxGridStep(bboxH, oriented[0], gridPx);

    for (let stepX = 1; stepX <= maxStepX; stepX++) {
      for (let stepY = 1; stepY <= maxStepY; stepY++) {
        const points = buildSpreadPattern(
          vertices,
          pixelsPerMeter,
          oriented[0],
          oriented[1],
          stepX,
          stepY,
          targetCount,
        );
        const score = scoreSpreadPattern(
          points,
          targetCount,
          bounds,
          bboxW,
          bboxH,
          aspect,
          oriented[0],
          oriented[1],
        );
        if (score > bestScore) {
          bestScore = score;
          bestPoints = points;
        }
      }
    }
  }

  if (bestPoints.length < targetCount) {
    const fallback = selectSpreadFromValidGrid(vertices, pixelsPerMeter, targetCount);
    const fallbackScore = scoreSpreadPattern(
      fallback,
      targetCount,
      bounds,
      bboxW,
      bboxH,
      aspect,
      0,
      0,
    );
    if (fallbackScore > bestScore) {
      bestPoints = fallback;
    }
  }

  if (bestPoints.length > targetCount) {
    bestPoints = subsampleGridPoints(bestPoints, targetCount);
  }

  const fixtures: PlacedPublicFixture[] = bestPoints.map((point) => ({
    id: nextId(),
    productId,
    x: point.x,
    y: point.y,
    rotation: 0,
  }));

  let warning: string | undefined;
  if (fixtures.length < targetCount) {
    warning = `Het berekende aantal is ${targetCount} armaturen. Er zijn ${fixtures.length} armaturen geplaatst in een logisch plafondraster. Controleer de indeling handmatig.`;
  }

  return {
    fixtures,
    requestedCount: targetCount,
    placedCount: fixtures.length,
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
  requirePanelFootprint: boolean,
): Point2D | null {
  const candidates = buildValidGridCenters(vertices, pixelsPerMeter, requirePanelFootprint);
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
  const product = getPublicProduct(productId);
  const isPanel = product.category === "led_panel";
  const gridPx = CEILING_GRID_M * pixelsPerMeter;

  const isValid = (candidate: Point2D) => {
    const inside = isPanel
      ? panelFootprintInside(candidate, pixelsPerMeter, vertices)
      : downlightCenterValid(candidate, vertices);
    if (!inside) return false;
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
