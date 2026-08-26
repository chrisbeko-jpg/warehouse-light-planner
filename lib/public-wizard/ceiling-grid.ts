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

function factorPairs(count: number): Array<[number, number]> {
  const pairs = new Set<string>();
  const maxDim = Math.max(12, Math.ceil(Math.sqrt(count)) + 3);
  for (let rows = 1; rows <= maxDim; rows++) {
    for (let cols = 1; cols <= maxDim; cols++) {
      const total = rows * cols;
      if (total >= count - 2 && total <= count + 4) {
        pairs.add(`${rows}x${cols}`);
      }
    }
  }
  return [...pairs].map((key) => {
    const [r, c] = key.split("x").map(Number);
    return [r!, c!] as [number, number];
  });
}

function scorePattern(
  points: Point2D[],
  targetCount: number,
  roomCenter: Point2D,
): number {
  if (points.length === 0) return -Infinity;
  const countScore = -Math.abs(points.length - targetCount) * 100;
  const avgDist =
    points.reduce((sum, p) => sum + Math.hypot(p.x - roomCenter.x, p.y - roomCenter.y), 0) /
    points.length;
  const balanceScore = -avgDist * 0.01;

  const xs = [...new Set(points.map((p) => Math.round(p.x)))].sort((a, b) => a - b);
  const ys = [...new Set(points.map((p) => Math.round(p.y)))].sort((a, b) => a - b);
  const colSpacing = xs.length > 1 ? xs[1]! - xs[0]! : 0;
  const rowSpacing = ys.length > 1 ? ys[1]! - ys[0]! : 0;
  const gridPx = colSpacing || rowSpacing;
  const gridBonus =
    gridPx > 0 &&
    Math.abs(colSpacing / gridPx - Math.round(colSpacing / gridPx)) < 0.01 &&
    Math.abs(rowSpacing / gridPx - Math.round(rowSpacing / gridPx)) < 0.01
      ? 50
      : 0;

  return countScore + balanceScore + gridBonus + points.length * 10;
}

function buildRectPattern(
  vertices: Point2D[],
  pixelsPerMeter: number,
  rows: number,
  cols: number,
  stepX: number,
  stepY: number,
): Point2D[] {
  const bounds = polygonBounds(vertices);
  const gridPx = CEILING_GRID_M * pixelsPerMeter;
  const spacingXPx = stepX * gridPx;
  const spacingYPx = stepY * gridPx;
  const roomCenter = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
  const patternW = (cols - 1) * spacingXPx;
  const patternH = (rows - 1) * spacingYPx;

  let best: Point2D[] = [];
  let bestScore = -Infinity;

  for (let ox = -3; ox <= 3; ox++) {
    for (let oy = -3; oy <= 3; oy++) {
      const origin = snapPointToGridPx(
        {
          x: roomCenter.x - patternW / 2 + ox * gridPx,
          y: roomCenter.y - patternH / 2 + oy * gridPx,
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
      const score = scorePattern(points, rows * cols, roomCenter);
      if (score > bestScore) {
        bestScore = score;
        best = points;
      }
    }
  }

  return best;
}

/** Place LED panels on a strict 600 mm ceiling grid in rows/columns. */
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
  const bboxW = (bounds.maxX - bounds.minX) / pixelsPerMeter;
  const bboxH = (bounds.maxY - bounds.minY) / pixelsPerMeter;
  const aspect = bboxW / Math.max(bboxH, 0.01);

  let bestPoints: Point2D[] = [];
  let bestScore = -Infinity;

  for (const [rows, cols] of factorPairs(targetCount)) {
    const oriented =
      aspect >= 1
        ? [rows, cols] as [number, number]
        : [cols, rows] as [number, number];

    for (let stepX = 1; stepX <= 4; stepX++) {
      for (let stepY = 1; stepY <= 4; stepY++) {
        const points = buildRectPattern(
          vertices,
          pixelsPerMeter,
          oriented[0],
          oriented[1],
          stepX,
          stepY,
        );
        const score = scorePattern(points, targetCount, {
          x: (bounds.minX + bounds.maxX) / 2,
          y: (bounds.minY + bounds.maxY) / 2,
        });
        if (score > bestScore) {
          bestScore = score;
          bestPoints = points.slice(0, targetCount);
          if (bestPoints.length < points.length && points.length > targetCount) {
            bestPoints = points.slice(0, targetCount);
          } else {
            bestPoints = points;
          }
        }
      }
    }
  }

  if (bestPoints.length > targetCount) {
    bestPoints = bestPoints.slice(0, targetCount);
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

export function findNearestFreeGridPosition(
  vertices: Point2D[],
  pixelsPerMeter: number,
  occupied: PlacedPublicFixture[],
  preferNear: Point2D,
  requirePanelFootprint: boolean,
): Point2D | null {
  const candidates = buildValidGridCenters(vertices, pixelsPerMeter, requirePanelFootprint);
  const tolerance = 2;
  const free = candidates.filter(
    (c) =>
      !occupied.some(
        (f) => Math.abs(f.x - c.x) < tolerance && Math.abs(f.y - c.y) < tolerance,
      ),
  );
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
): Point2D | null {
  const product = getPublicProduct(productId);
  const isPanel = product.category === "led_panel";
  const snapped = snapPointToGridPx({ x, y }, pixelsPerMeter);
  const valid = isPanel
    ? panelFootprintInside(snapped, pixelsPerMeter, vertices)
    : downlightCenterValid(snapped, vertices);
  if (valid) return snapped;

  const gridPx = CEILING_GRID_M * pixelsPerMeter;
  let best: Point2D | null = null;
  let bestDist = Infinity;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const candidate = {
        x: snapped.x + dx * gridPx,
        y: snapped.y + dy * gridPx,
      };
      const ok = isPanel
        ? panelFootprintInside(candidate, pixelsPerMeter, vertices)
        : downlightCenterValid(candidate, vertices);
      if (!ok) continue;
      const dist = Math.hypot(candidate.x - x, candidate.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = candidate;
      }
    }
  }
  return best ?? previous ?? null;
}

export function getGridSpacingPx(points: Point2D[]): { rowSpacingPx: number; colSpacingPx: number } {
  const xs = [...new Set(points.map((p) => Math.round(p.x)))].sort((a, b) => a - b);
  const ys = [...new Set(points.map((p) => Math.round(p.y)))].sort((a, b) => a - b);
  const colSpacingPx = xs.length > 1 ? xs[1]! - xs[0]! : 0;
  const rowSpacingPx = ys.length > 1 ? ys[1]! - ys[0]! : 0;
  return { rowSpacingPx, colSpacingPx };
}
