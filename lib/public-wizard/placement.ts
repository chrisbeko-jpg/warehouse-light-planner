import { calculatePolygonAreaM2 } from "@/lib/polygon-area";
import {
  findNearestFreeGridPosition,
  placePanelsOnCeilingGrid,
  snapFixtureToGrid,
  type CeilingLayoutResult,
} from "@/lib/public-wizard/ceiling-grid";
import { CEILING_GRID_M, snapPointToGridPx, uniqueGridPoints } from "@/lib/public-wizard/grid";
import { getPublicProduct } from "@/lib/public-wizard/products";
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
): Point2D[] {
  if (vertices.length < 3 || pixelsPerMeter <= 0) return [];

  const gridPx = CEILING_GRID_M * pixelsPerMeter;
  const bounds = polygonBounds(vertices);
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
  const origin = snapPointToGridPx(center, pixelsPerMeter);
  const spanX = Math.ceil((bounds.maxX - bounds.minX) / gridPx) + 4;
  const spanY = Math.ceil((bounds.maxY - bounds.minY) / gridPx) + 4;
  const candidates: Point2D[] = [];

  for (let row = -spanY; row <= spanY; row++) {
    for (let col = -spanX; col <= spanX; col++) {
      const snapped = {
        x: origin.x + col * gridPx,
        y: origin.y + row * gridPx,
      };
      if (pointInPolygon(snapped, vertices)) {
        candidates.push(snapped);
      }
    }
  }

  return uniqueGridPoints(candidates);
}

/** @deprecated use placePanelsOnCeilingGrid */
export function selectSpreadGridPoints(candidates: Point2D[], count: number): Point2D[] {
  if (count <= 0 || candidates.length === 0) return [];
  return candidates.slice(0, count);
}

export function placeFixturesInPolygon(
  vertices: Point2D[],
  pixelsPerMeter: number,
  count: number,
  productId: PublicProductId,
): PlacedPublicFixture[] {
  const product = getPublicProduct(productId);
  if (product.category === "led_panel") {
    return placePanelsOnCeilingGrid(vertices, pixelsPerMeter, count, productId).fixtures;
  }

  const candidates = generateGridCandidates(vertices, pixelsPerMeter);
  const bounds = polygonBounds(vertices);
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
  const sorted = [...candidates].sort(
    (a, b) =>
      Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y),
  );
  return sorted.slice(0, count).map((point) => ({
    id: nextId(),
    productId,
    x: point.x,
    y: point.y,
    rotation: 0,
  }));
}

export function placeFixturesWithLayoutInfo(
  vertices: Point2D[],
  pixelsPerMeter: number,
  count: number,
  productId: PublicProductId,
): CeilingLayoutResult {
  return placePanelsOnCeilingGrid(vertices, pixelsPerMeter, count, productId);
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
  productId: PublicProductId,
  previous?: Point2D,
  fixtures: PlacedPublicFixture[] = [],
  excludeId?: string,
): Point2D | null {
  return snapFixtureToGrid(
    x,
    y,
    pixelsPerMeter,
    vertices,
    productId,
    previous,
    fixtures,
    excludeId,
  );
}

export function findFreeGridPosition(
  vertices: Point2D[],
  pixelsPerMeter: number,
  fixtures: PlacedPublicFixture[],
  productId: PublicProductId,
  preferNear?: Point2D,
): Point2D | null {
  const bounds = polygonBounds(vertices);
  const center = preferNear ?? {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
  const isPanel = getPublicProduct(productId).category === "led_panel";
  return findNearestFreeGridPosition(
    vertices,
    pixelsPerMeter,
    fixtures,
    center,
    isPanel,
  );
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
  vertices: Point2D[],
): PlacedPublicFixture[] {
  const source = fixtures.find((f) => f.id === id);
  if (!source) return fixtures;
  const offsetPx = CEILING_GRID_M * pixelsPerMeter;
  const free = findFreeGridPosition(
    vertices,
    pixelsPerMeter,
    fixtures,
    source.productId,
    { x: source.x + offsetPx, y: source.y },
  );
  if (!free) return fixtures;
  return [
    ...fixtures,
    {
      ...source,
      id: nextId(),
      x: free.x,
      y: free.y,
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
