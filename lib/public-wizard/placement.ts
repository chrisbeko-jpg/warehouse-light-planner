import { fixtureClearsObstacles } from "@/lib/public-wizard/obstacles";
import { placeInUsableArea } from "@/lib/public-wizard/irregular-placement";
import { calculatePolygonAreaM2 } from "@/lib/polygon-area";
import {
  findNearestFreeGridPosition,
  placePanelsOnCeilingGrid,
  snapFixtureToGrid,
  type CeilingLayoutResult,
  type PanelLayoutContext,
  type SnapFrame,
} from "@/lib/public-wizard/ceiling-grid";
import { placeDownlightsSymmetrically } from "@/lib/public-wizard/matrix-placement";
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
  layoutContext?: PanelLayoutContext,
): PlacedPublicFixture[] {
  const product = getPublicProduct(productId);
  if (product.category === "led_panel") {
    const ctx =
      layoutContext ??
      ({
        areaM2: createRoomPolygon(vertices, pixelsPerMeter).areaM2,
        targetLux: 500,
        ceilingHeightM: 2.7,
        ceilingType: "grid_600",
      } as const);
    return placePanelsOnCeilingGrid(vertices, pixelsPerMeter, count, productId, ctx).fixtures;
  }

  const ctx =
    layoutContext ??
    ({
      areaM2: createRoomPolygon(vertices, pixelsPerMeter).areaM2,
      targetLux: 250,
      ceilingHeightM: 2.7,
    } as const);
  return placeDownlightsSymmetrically(vertices, pixelsPerMeter, count, productId, ctx).fixtures;
}

export function placeFixturesWithLayoutInfo(
  vertices: Point2D[],
  pixelsPerMeter: number,
  count: number,
  productId: PublicProductId,
  layoutContext?: PanelLayoutContext,
): CeilingLayoutResult {
  const bounds = polygonBounds(vertices);
  const area = createRoomPolygon(vertices, pixelsPerMeter).areaM2;
  const boxArea = (bounds.maxX-bounds.minX)*(bounds.maxY-bounds.minY)/(pixelsPerMeter*pixelsPerMeter);
  if (area < boxArea * 0.98) {
    const fixtures = placeInUsableArea(vertices, pixelsPerMeter, count, productId,
      layoutContext?.ceilingType ?? "grid_600", layoutContext?.obstacles ?? []);
    return { fixtures, requestedCount:count, placedCount:fixtures.length,
      warning: fixtures.length<count ? "Niet alle armaturen passen vrij van wanden en obstakels. Controleer de indeling en het luxniveau." : undefined };
  }
  if (layoutContext?.obstacles?.length) {
    const base = placeFixturesWithLayoutInfo(vertices, pixelsPerMeter, count, productId,
      { ...layoutContext, obstacles: [] });
    const obstacles = layoutContext.obstacles;
    const clear = (fixture: PlacedPublicFixture) => fixtureClearsObstacles(
      fixture, pixelsPerMeter, fixture.productId, fixture.rotation, obstacles);
    const fixtures = base.fixtures.filter(clear);
    // Keep complete rows intact; only relocate fixtures whose footprints hit an obstacle.
    for (const fixture of base.fixtures.filter(f => !clear(f))) {
      const position = findFreeGridPosition(vertices, pixelsPerMeter, fixtures,
        fixture.productId, fixture, { ceilingType:layoutContext.ceilingType, rotation:fixture.rotation, obstacles });
      if (position) fixtures.push({ ...fixture, ...position });
    }
    return { ...base, fixtures, placedCount:fixtures.length,
      warning: fixtures.length < base.fixtures.length
        ? "Niet alle armaturen passen vrij van wanden en obstakels. Controleer de indeling en het luxniveau."
        : base.warning };
  }
  const product = getPublicProduct(productId);
  if (product.category === "led_panel") {
    const ctx =
      layoutContext ??
      ({
        areaM2: createRoomPolygon(vertices, pixelsPerMeter).areaM2,
        targetLux: 500,
        ceilingHeightM: 2.7,
      } as const);
    return placePanelsOnCeilingGrid(vertices, pixelsPerMeter, count, productId, ctx);
  }
  const ctx =
    layoutContext ??
    ({
      areaM2: createRoomPolygon(vertices, pixelsPerMeter).areaM2,
      targetLux: 250,
      ceilingHeightM: 2.7,
    } as const);
  return placeDownlightsSymmetrically(vertices, pixelsPerMeter, count, productId, ctx);
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
  frame?: SnapFrame,
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
    frame,
  );
}

export function findFreeGridPosition(
  vertices: Point2D[],
  pixelsPerMeter: number,
  fixtures: PlacedPublicFixture[],
  productId: PublicProductId,
  preferNear?: Point2D,
  frame?: SnapFrame,
): Point2D | null {
  const bounds = polygonBounds(vertices);
  const center = preferNear ?? {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
  return findNearestFreeGridPosition(
    vertices,
    pixelsPerMeter,
    fixtures,
    center,
    productId,
    frame,
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
  frame?: SnapFrame,
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
    { ...frame, rotation: source.rotation },
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
