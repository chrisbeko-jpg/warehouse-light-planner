import { calculatePolygonAreaM2 } from "@/lib/polygon-area";
import {
  CEILING_GRID_M,
  clampPoint,
  isValidPoint,
  snapPointToGridPx,
  uniqueGridPoints,
} from "@/lib/public-wizard/grid";
import type { Point2D } from "@/types/floor-plan";
import type { PlacedPublicFixture, PublicProductId } from "@/types/public-wizard";

function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.x;
    const yi = polygon[i]!.y;
    const xj = polygon[j]!.x;
    const yj = polygon[j]!.y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
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

export function generateGridCandidates(
  vertices: Point2D[],
  pixelsPerMeter: number,
  insetM = 0.3,
): Point2D[] {
  if (vertices.length < 3 || pixelsPerMeter <= 0) return [];

  const gridPx = CEILING_GRID_M * pixelsPerMeter;
  const bounds = polygonBounds(vertices);
  const insetPx = insetM * pixelsPerMeter;
  const candidates: Point2D[] = [];

  for (let y = bounds.minY + insetPx; y <= bounds.maxY - insetPx; y += gridPx) {
    for (let x = bounds.minX + insetPx; x <= bounds.maxX - insetPx; x += gridPx) {
      const snapped = snapPointToGridPx({ x, y }, pixelsPerMeter);
      if (pointInPolygon(snapped, vertices)) {
        candidates.push(snapped);
      }
    }
  }

  return uniqueGridPoints(candidates);
}

/** Pick evenly distributed grid points across the full room. */
export function selectSpreadGridPoints(candidates: Point2D[], count: number): Point2D[] {
  if (count <= 0 || candidates.length === 0) return [];
  if (candidates.length <= count) return candidates.slice(0, count);

  const sorted = [...candidates].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
  const selected: Point2D[] = [];
  const step = sorted.length / count;

  for (let i = 0; i < count; i++) {
    const index = Math.min(sorted.length - 1, Math.floor(i * step + step / 2));
    const point = sorted[index]!;
    const duplicate = selected.some(
      (p) => Math.abs(p.x - point.x) < 1 && Math.abs(p.y - point.y) < 1,
    );
    if (!duplicate) selected.push(point);
  }

  if (selected.length < count) {
    for (const point of sorted) {
      if (selected.length >= count) break;
      const duplicate = selected.some(
        (p) => Math.abs(p.x - point.x) < 1 && Math.abs(p.y - point.y) < 1,
      );
      if (!duplicate) selected.push(point);
    }
  }

  return selected.slice(0, count);
}

export function placeFixturesInPolygon(
  vertices: Point2D[],
  pixelsPerMeter: number,
  count: number,
  productId: PublicProductId,
): PlacedPublicFixture[] {
  if (vertices.length < 3 || count <= 0 || pixelsPerMeter <= 0) return [];

  const candidates = generateGridCandidates(vertices, pixelsPerMeter);
  const selected = selectSpreadGridPoints(candidates, count);

  if (selected.length === 0) {
    const bounds = polygonBounds(vertices);
    selected.push(
      snapPointToGridPx(
        { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 },
        pixelsPerMeter,
      ),
    );
  }

  return selected.map((point) => ({
    id: nextId(),
    productId,
    x: point.x,
    y: point.y,
    rotation: 0,
  }));
}

export function createRoomPolygon(
  vertices: Point2D[],
  pixelsPerMeter: number,
): { vertices: Point2D[]; areaM2: number } {
  return {
    vertices,
    areaM2: calculatePolygonAreaM2(vertices, pixelsPerMeter),
  };
}

export function snapFixtureCenter(
  x: number,
  y: number,
  pixelsPerMeter: number,
  vertices: Point2D[],
  backgroundWidth: number,
  backgroundHeight: number,
): Point2D {
  let point = snapPointToGridPx({ x, y }, pixelsPerMeter);
  point = clampPoint(point, 0, 0, backgroundWidth, backgroundHeight);
  if (vertices.length >= 3 && !pointInPolygon(point, vertices)) {
    point = snapPointToGridPx({ x, y }, pixelsPerMeter);
  }
  return isValidPoint(point) ? point : { x, y };
}

export function addFixtureAt(
  fixtures: PlacedPublicFixture[],
  x: number,
  y: number,
  productId: PublicProductId,
): PlacedPublicFixture[] {
  return [...fixtures, { id: nextId(), productId, x, y, rotation: 0 }];
}

export function addDownlightAt(
  fixtures: PlacedPublicFixture[],
  x: number,
  y: number,
  productId: PublicProductId,
): PlacedPublicFixture[] {
  return addFixtureAt(fixtures, x, y, productId);
}

export function moveFixture(
  fixtures: PlacedPublicFixture[],
  id: string,
  x: number,
  y: number,
): PlacedPublicFixture[] {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return fixtures;
  return fixtures.map((f) => (f.id === id ? { ...f, x, y } : f));
}

export function duplicateFixture(
  fixtures: PlacedPublicFixture[],
  id: string,
  pixelsPerMeter: number,
): PlacedPublicFixture[] {
  const source = fixtures.find((f) => f.id === id);
  if (!source) return fixtures;
  const offsetPx = CEILING_GRID_M * pixelsPerMeter;
  const snapped = snapPointToGridPx({ x: source.x + offsetPx, y: source.y }, pixelsPerMeter);
  return [
    ...fixtures,
    {
      ...source,
      id: nextId(),
      x: snapped.x,
      y: snapped.y,
    },
  ];
}

export function removeFixture(
  fixtures: PlacedPublicFixture[],
  id: string,
): PlacedPublicFixture[] {
  return fixtures.filter((f) => f.id !== id);
}

export { pointInPolygon };
