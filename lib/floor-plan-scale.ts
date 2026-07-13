import type { Point2D } from "@/types/floor-plan";
import { distanceBetweenPoints } from "@/lib/polygon-area";

export function computePixelsPerMeter(
  pointA: Point2D,
  pointB: Point2D,
  distanceMm: number,
): number {
  const pixelDistance = distanceBetweenPoints(pointA, pointB);
  if (pixelDistance <= 0 || distanceMm <= 0) {
    return 0;
  }

  const meters = distanceMm / 1000;
  return pixelDistance / meters;
}

export function pixelsToMeters(pixels: number, pixelsPerMeter: number): number {
  if (pixelsPerMeter <= 0) {
    return 0;
  }
  return pixels / pixelsPerMeter;
}

export function metersToPixels(meters: number, pixelsPerMeter: number): number {
  return meters * pixelsPerMeter;
}

export function formatScaleLabel(pixelsPerMeter: number | null): string {
  if (!pixelsPerMeter || pixelsPerMeter <= 0) {
    return "Niet gekalibreerd";
  }
  const metersPerPixel = 1 / pixelsPerMeter;
  if (metersPerPixel >= 1) {
    return `1 px = ${metersPerPixel.toFixed(2)} m`;
  }
  const mmPerPixel = metersPerPixel * 1000;
  return `1 px = ${mmPerPixel.toFixed(1)} mm`;
}
