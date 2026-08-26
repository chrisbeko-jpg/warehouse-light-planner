import { getPublicProduct } from "@/lib/public-wizard/products";
import type { Point2D } from "@/types/floor-plan";
import type { PlacedPublicFixture } from "@/types/public-wizard";

export const PUBLIC_HEATMAP_DISCLAIMER =
  "Indicatieve lichtspreiding op basis van geplaatste armaturen. Geen gevalideerde fotometrische berekening.";

export type HeatmapLevel = "high" | "medium" | "low" | "dark";

export interface PublicHeatmapCell {
  x: number;
  y: number;
  lux: number;
  level: HeatmapLevel;
}

function beamSigma(beamAngleDeg: number, ceilingHeightM: number): number {
  const isWide = beamAngleDeg >= 100;
  return isWide
    ? 1.35 + ceilingHeightM * 0.15
    : 0.85 + ceilingHeightM * 0.11;
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
  const sigma = beamSigma(beamAngleDeg, ceilingHeightM);
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
  if (lux >= targetLux * 0.9) return "high";
  if (lux >= targetLux * 0.55) return "medium";
  if (lux >= targetLux * 0.25) return "low";
  return "dark";
}

export function computePublicHeatmap(
  fixtures: PlacedPublicFixture[],
  roomVertices: Point2D[],
  pixelsPerMeter: number,
  ceilingHeightM: number,
  targetLux: number,
  gridStepM = 0.35,
): PublicHeatmapCell[] {
  if (roomVertices.length < 3 || pixelsPerMeter <= 0) return [];

  const xs = roomVertices.map((v) => v.x);
  const ys = roomVertices.map((v) => v.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const stepPx = Math.max(2, gridStepM * pixelsPerMeter);
  const cells: PublicHeatmapCell[] = [];
  const maxCells = 2500;

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
        const fx = fixture.x / pixelsPerMeter;
        const fy = fixture.y / pixelsPerMeter;
        lux += fixtureIlluminanceAt(
          worldX,
          worldY,
          fx,
          fy,
          ceilingHeightM,
          product.lumens,
          product.beamAngleDeg,
        );
      }
      cells.push({
        x: px,
        y: py,
        lux,
        level: classifyLevel(lux, targetLux),
      });
    }
    if (cells.length >= maxCells) break;
  }
  return cells;
}

export const HEATMAP_LEVEL_COLORS: Record<HeatmapLevel, string> = {
  high: "rgba(250, 204, 21, 0.55)",
  medium: "rgba(250, 204, 21, 0.28)",
  low: "rgba(250, 204, 21, 0.12)",
  dark: "rgba(30, 41, 59, 0.35)",
};
