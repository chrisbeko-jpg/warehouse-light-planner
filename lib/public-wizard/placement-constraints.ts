import { getPublicProduct } from "@/lib/public-wizard/products";
import { pointInPolygon } from "@/lib/public-wizard/placement";
import type { Point2D } from "@/types/floor-plan";
import type { PublicProductId } from "@/types/public-wizard";

/** Minimum free space from room boundary to the outer edge of an LED panel. */
/** Preferred margin for manual validation; automatic placement uses footprint-only checks. */
export const DEFAULT_LED_PANEL_WALL_CLEARANCE_M = 0;

export function getMinWallClearanceM(productId: PublicProductId): number {
  const product = getPublicProduct(productId);
  if (product.minWallClearanceM != null) return product.minWallClearanceM;
  if (product.category === "led_panel") return DEFAULT_LED_PANEL_WALL_CLEARANCE_M;
  return 0;
}

export function getFixtureHalfSizeM(productId: PublicProductId): number {
  const product = getPublicProduct(productId);
  if (product.diameterM) return product.diameterM / 2;
  return Math.max(product.widthM, product.heightM) / 2;
}

/** Minimum distance from room boundary to fixture center (meters). */
export function getMinCenterInsetM(productId: PublicProductId): number {
  return getMinWallClearanceM(productId) + getFixtureHalfSizeM(productId);
}

function distPointToSegmentPx(point: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(point.x - projX, point.y - projY);
}

export function minDistanceToPolygonBoundaryM(
  point: Point2D,
  vertices: Point2D[],
  pixelsPerMeter: number,
): number {
  if (vertices.length < 3 || pixelsPerMeter <= 0) return 0;
  let minDistPx = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]!;
    const b = vertices[(i + 1) % vertices.length]!;
    minDistPx = Math.min(minDistPx, distPointToSegmentPx(point, a, b));
  }
  return minDistPx / pixelsPerMeter;
}

export function orientedFixtureSizeM(
  productId: PublicProductId,
  rotation = 0,
): { widthM: number; heightM: number } {
  const product = getPublicProduct(productId);
  const quarterTurns = Math.abs(Math.round(rotation / 90)) % 2;
  if (quarterTurns === 1) {
    return { widthM: product.heightM, heightM: product.widthM };
  }
  return { widthM: product.widthM, heightM: product.heightM };
}

export function getFixtureFootprintCorners(
  center: Point2D,
  pixelsPerMeter: number,
  productId: PublicProductId,
  rotation = 0,
): Point2D[] {
  const { widthM, heightM } = orientedFixtureSizeM(productId, rotation);
  const halfX = (widthM / 2) * pixelsPerMeter;
  const halfY = (heightM / 2) * pixelsPerMeter;
  return [
    { x: center.x - halfX, y: center.y - halfY },
    { x: center.x + halfX, y: center.y - halfY },
    { x: center.x + halfX, y: center.y + halfY },
    { x: center.x - halfX, y: center.y + halfY },
  ];
}

/** Footprint fully inside room polygon — used for automatic placement (no extra wall margin). */
export function isPanelFootprintInsideRoom(
  center: Point2D,
  pixelsPerMeter: number,
  vertices: Point2D[],
  productId: PublicProductId,
  rotation = 0,
): boolean {
  const product = getPublicProduct(productId);
  if (product.category !== "led_panel") {
    return pointInPolygon(center, vertices);
  }
  const corners = getFixtureFootprintCorners(center, pixelsPerMeter, productId, rotation);
  return corners.every((corner) => pointInPolygon(corner, vertices));
}

export function isPanelPlacementValid(
  center: Point2D,
  pixelsPerMeter: number,
  vertices: Point2D[],
  productId: PublicProductId,
  rotation = 0,
  options?: { enforceWallClearance?: boolean },
): boolean {
  const product = getPublicProduct(productId);
  if (product.category !== "led_panel") {
    return pointInPolygon(center, vertices);
  }

  if (!isPanelFootprintInsideRoom(center, pixelsPerMeter, vertices, productId, rotation)) {
    return false;
  }

  if (options?.enforceWallClearance === false) {
    return true;
  }

  const clearanceM = getMinWallClearanceM(productId);
  if (clearanceM <= 0) return true;

  const corners = getFixtureFootprintCorners(center, pixelsPerMeter, productId, rotation);
  for (const corner of corners) {
    if (minDistanceToPolygonBoundaryM(corner, vertices, pixelsPerMeter) < clearanceM - 1e-4) {
      return false;
    }
  }
  return true;
}

export function isFixtureCenterValid(
  center: Point2D,
  pixelsPerMeter: number,
  vertices: Point2D[],
  productId: PublicProductId,
  rotation = 0,
  options?: { enforceWallClearance?: boolean },
): boolean {
  const product = getPublicProduct(productId);
  if (product.category === "led_panel") {
    return isPanelPlacementValid(center, pixelsPerMeter, vertices, productId, rotation, options);
  }
  return pointInPolygon(center, vertices);
}

export function minPanelOuterEdgeClearanceM(
  center: Point2D,
  pixelsPerMeter: number,
  vertices: Point2D[],
  productId: PublicProductId,
  rotation = 0,
): number {
  const corners = getFixtureFootprintCorners(center, pixelsPerMeter, productId, rotation);
  return Math.min(...corners.map((c) => minDistanceToPolygonBoundaryM(c, vertices, pixelsPerMeter)));
}
