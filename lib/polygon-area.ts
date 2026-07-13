import type { Point2D } from "@/types/floor-plan";

/** Shoelace formula — area in square pixels. */
export function calculatePolygonAreaPixels(vertices: Point2D[]): number {
  if (vertices.length < 3) {
    return 0;
  }

  let sum = 0;
  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    sum += current.x * next.y - next.x * current.y;
  }

  return Math.abs(sum) / 2;
}

export function calculatePolygonAreaM2(
  vertices: Point2D[],
  pixelsPerMeter: number,
): number {
  if (pixelsPerMeter <= 0) {
    return 0;
  }

  const areaPixels = calculatePolygonAreaPixels(vertices);
  return areaPixels / (pixelsPerMeter * pixelsPerMeter);
}

export function formatAreaM2(areaM2: number): string {
  if (areaM2 <= 0) {
    return "—";
  }
  return `${areaM2.toFixed(2)} m²`;
}

export function flattenVertices(vertices: Point2D[]): number[] {
  return vertices.flatMap((vertex) => [vertex.x, vertex.y]);
}

export function distanceBetweenPoints(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function isNearPoint(
  point: Point2D,
  target: Point2D,
  threshold: number,
): boolean {
  return distanceBetweenPoints(point, target) <= threshold;
}
