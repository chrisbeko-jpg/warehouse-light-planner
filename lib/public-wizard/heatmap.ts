import { getPublicProduct } from "@/lib/public-wizard/products";
import type { Point2D } from "@/types/floor-plan";
import type { PlacedPublicFixture } from "@/types/public-wizard";

export const PUBLIC_HEATMAP_DISCLAIMER =
  "Indicatieve lichtspreiding op basis van geplaatste armaturen. Geen gevalideerde fotometrische berekening.";

export type HeatmapLevel = "high" | "medium" | "low" | "none";

export interface HeatmapGradientSpot {
  x: number;
  y: number;
  radiusPx: number;
  level: HeatmapLevel;
  fixtureId: string;
}

export interface PublicHeatmapCell {
  x: number;
  y: number;
  lux: number;
  level: HeatmapLevel;
}

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

function classifyLevel(lux: number, targetLux: number): HeatmapLevel {
  if (lux >= targetLux * 0.85) return "high";
  if (lux >= targetLux * 0.5) return "medium";
  if (lux >= targetLux * 0.2) return "low";
  return "none";
}

function beamRadiusPx(beamAngleDeg: number, ceilingHeightM: number, pixelsPerMeter: number): number {
  const halfAngleRad = (beamAngleDeg / 2) * (Math.PI / 180);
  const radiusM = Math.tan(halfAngleRad) * ceilingHeightM * 1.35;
  return Math.max(24, radiusM * pixelsPerMeter);
}

function fixtureIlluminanceAt(
  cellX: number,
  cellY: number,
  sourceX: number,
  sourceY: number,
  ceilingHeightM: number,
  lumens: number,
  beamAngleDeg: number,
): number {
  const sigma =
    beamAngleDeg >= 100
      ? 1.35 + ceilingHeightM * 0.15
      : 0.85 + ceilingHeightM * 0.11;
  const horizontalDist = Math.hypot(cellX - sourceX, cellY - sourceY);
  const slantDist = Math.hypot(horizontalDist, ceilingHeightM);
  const gaussian = Math.exp(-0.5 * (horizontalDist / sigma) ** 2);
  const cosFactor = ceilingHeightM / slantDist;
  const invSquare = 1 / (slantDist * slantDist);
  const patchArea = Math.PI * sigma * sigma;
  return (
    ((lumens * gaussian * cosFactor) / patchArea) *
    (ceilingHeightM * ceilingHeightM * invSquare)
  );
}

/** Soft radial gradients — one per placed fixture. */
export function computeHeatmapGradients(
  fixtures: PlacedPublicFixture[],
  roomVertices: Point2D[],
  pixelsPerMeter: number,
  ceilingHeightM: number,
  targetLux: number,
): HeatmapGradientSpot[] {
  if (roomVertices.length < 3 || pixelsPerMeter <= 0 || fixtures.length === 0) return [];

  return fixtures.map((fixture) => {
    const product = getPublicProduct(fixture.productId);
    const fx = fixture.x / pixelsPerMeter;
    const fy = fixture.y / pixelsPerMeter;
    const sampleLux = fixtureIlluminanceAt(
      fx,
      fy,
      fx,
      fy,
      ceilingHeightM,
      product.lumens,
      product.beamAngleDeg,
    );
    return {
      x: fixture.x,
      y: fixture.y,
      radiusPx: beamRadiusPx(product.beamAngleDeg, ceilingHeightM, pixelsPerMeter),
      level: classifyLevel(sampleLux, targetLux),
      fixtureId: fixture.id,
    };
  });
}

export function computePublicHeatmap(
  fixtures: PlacedPublicFixture[],
  roomVertices: Point2D[],
  pixelsPerMeter: number,
  ceilingHeightM: number,
  targetLux: number,
  gridStepM = 0.45,
): PublicHeatmapCell[] {
  if (roomVertices.length < 3 || pixelsPerMeter <= 0) return [];

  const xs = roomVertices.map((v) => v.x);
  const ys = roomVertices.map((v) => v.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const stepPx = Math.max(8, gridStepM * pixelsPerMeter);
  const cells: PublicHeatmapCell[] = [];
  const maxCells = 800;

  for (let py = minY; py <= maxY; py += stepPx) {
    for (let px = minX; px <= maxX; px += stepPx) {
      if (cells.length >= maxCells) break;
      const point = { x: px, y: py };
      if (!pointInPolygon(point, roomVertices)) continue;

      const worldX = px / pixelsPerMeter;
      const worldY = py / pixelsPerMeter;
      let lux = 0;
      for (const fixture of fixtures) {
        const product = getPublicProduct(fixture.productId);
        lux += fixtureIlluminanceAt(
          worldX,
          worldY,
          fixture.x / pixelsPerMeter,
          fixture.y / pixelsPerMeter,
          ceilingHeightM,
          product.lumens,
          product.beamAngleDeg,
        );
      }
      cells.push({ x: px, y: py, lux, level: classifyLevel(lux, targetLux) });
    }
    if (cells.length >= maxCells) break;
  }
  return cells;
}

export const HEATMAP_GRADIENT_STOPS: Record<
  HeatmapLevel,
  { inner: string; mid: string; outer: string }
> = {
  high: { inner: "rgba(168, 85, 247, 0.55)", mid: "rgba(217, 70, 239, 0.28)", outer: "rgba(217, 70, 239, 0)" },
  medium: { inner: "rgba(217, 70, 239, 0.42)", mid: "rgba(249, 115, 22, 0.24)", outer: "rgba(249, 115, 22, 0)" },
  low: { inner: "rgba(249, 115, 22, 0.3)", mid: "rgba(239, 68, 68, 0.18)", outer: "rgba(239, 68, 68, 0)" },
  none: { inner: "rgba(239, 68, 68, 0.12)", mid: "rgba(239, 68, 68, 0.04)", outer: "rgba(239, 68, 68, 0)" },
};

/** @deprecated use HEATMAP_GRADIENT_STOPS */
export const HEATMAP_LEVEL_COLORS: Record<string, string> = {
  high: HEATMAP_GRADIENT_STOPS.high.inner,
  medium: HEATMAP_GRADIENT_STOPS.medium.inner,
  low: HEATMAP_GRADIENT_STOPS.low.inner,
  dark: "rgba(30, 41, 59, 0.15)",
};
