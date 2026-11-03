import { fixtureClearsObstacles } from "@/lib/public-wizard/obstacles";
import type { Point2D } from "@/types/floor-plan";
import type { PublicObstacle, PublicProductId } from "@/types/public-wizard";

export function fixtureOverlapsObstacle(
  center: Point2D,
  pixelsPerMeter: number,
  productId: PublicProductId,
  rotation: number,
  obstacles: PublicObstacle[],
): boolean {
  return !fixtureClearsObstacles(center, pixelsPerMeter, productId, rotation, obstacles);
}

export function isFixturePlacementAllowed(
  center: Point2D,
  pixelsPerMeter: number,
  roomVertices: Point2D[],
  productId: PublicProductId,
  rotation: number,
  obstacles: PublicObstacle[],
  insideRoom: boolean,
): boolean {
  if (!insideRoom) return false;
  return !fixtureOverlapsObstacle(center, pixelsPerMeter, productId, rotation, obstacles);
}
