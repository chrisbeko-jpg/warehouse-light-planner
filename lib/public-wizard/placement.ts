import { calculatePolygonAreaM2 } from "@/lib/polygon-area";
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

function polygonCentroid(vertices: Point2D[]): Point2D {
  let cx = 0;
  let cy = 0;
  for (const v of vertices) {
    cx += v.x;
    cy += v.y;
  }
  return { x: cx / vertices.length, y: cy / vertices.length };
}

function nextId(): string {
  return `fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function placeFixturesInPolygon(
  vertices: Point2D[],
  pixelsPerMeter: number,
  count: number,
  productId: PublicProductId,
): PlacedPublicFixture[] {
  if (vertices.length < 3 || count <= 0 || pixelsPerMeter <= 0) return [];

  const product = getPublicProduct(productId);
  const spacingPx = (product.widthM + 0.03) * pixelsPerMeter;
  const bounds = polygonBounds(vertices);
  const centroid = polygonCentroid(vertices);
  const candidates: Point2D[] = [];

  for (let y = bounds.minY + spacingPx / 2; y <= bounds.maxY; y += spacingPx) {
    for (let x = bounds.minX + spacingPx / 2; x <= bounds.maxX; x += spacingPx) {
      const point = { x, y };
      if (pointInPolygon(point, vertices)) {
        candidates.push(point);
      }
    }
  }

  candidates.sort((a, b) => {
    const da = Math.hypot(a.x - centroid.x, a.y - centroid.y);
    const db = Math.hypot(b.x - centroid.x, b.y - centroid.y);
    return da - db;
  });

  const selected = candidates.slice(0, count);
  if (selected.length === 0 && count > 0) {
    selected.push(centroid);
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

export function addDownlightAt(
  fixtures: PlacedPublicFixture[],
  x: number,
  y: number,
  productId: PublicProductId,
): PlacedPublicFixture[] {
  return [
    ...fixtures,
    { id: nextId(), productId, x, y, rotation: 0 },
  ];
}

export function moveFixture(
  fixtures: PlacedPublicFixture[],
  id: string,
  x: number,
  y: number,
): PlacedPublicFixture[] {
  return fixtures.map((f) => (f.id === id ? { ...f, x, y } : f));
}

export function removeFixture(
  fixtures: PlacedPublicFixture[],
  id: string,
): PlacedPublicFixture[] {
  return fixtures.filter((f) => f.id !== id);
}
