import type { Point2D } from "@/types/floor-plan";
import type { PublicRoomPolygon } from "@/types/public-wizard";

/** Non-blocking AI room detection stub — always allows manual drawing. */
export async function attemptRoomRecognition(
  _backgroundDataUrl: string,
  _pixelsPerMeter: number,
): Promise<{ vertices: Point2D[] | null; failed: boolean }> {
  await new Promise((r) => setTimeout(r, 800));
  return { vertices: null, failed: true };
}

export function validateRoomPolygon(polygon: PublicRoomPolygon | null): boolean {
  return Boolean(polygon && polygon.vertices.length >= 3 && polygon.areaM2 > 0);
}
