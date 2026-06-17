import { getHeightFactor } from "@/lib/height-factor";
import { getSlotCenter } from "@/lib/light-line-physics";
import {
  LUMENS_PER_MODULE_AT_60W,
  MODULE_WATTAGE_MAX,
} from "@/lib/light-analysis";
import type {
  FixtureType,
  HeatmapCell,
  HeatmapStats,
  LightLine,
  PlacedRectangle,
} from "@/types";
import { isModulePosition } from "@/types";

export const HEATMAP_DISCLAIMER =
  "Indicatieve lichtspreiding, geen officiële lichtberekening.";

const GRID_STEP = 0.5;

function isBlocked(x: number, y: number, rectangles: PlacedRectangle[]): boolean {
  return rectangles.some(
    (rect) =>
      rect.type === "shelf" &&
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height,
  );
}

/** Characteristic spread on workplane (m) for Gaussian falloff */
function beamSigma(fixtureType: FixtureType, mountingHeight: number): number {
  return fixtureType === "90degree"
    ? 0.85 + mountingHeight * 0.11
    : 1.35 + mountingHeight * 0.15;
}

/**
 * Indicative illuminance (lux) from one LED module at floor point (cellX, cellY).
 * Uses Gaussian beam spread + inverse-square attenuation from mounting height.
 */
function moduleIlluminanceAt(
  cellX: number,
  cellY: number,
  sourceX: number,
  sourceY: number,
  mountingHeight: number,
  lumens: number,
  sigma: number,
): number {
  const horizontalDist = Math.hypot(cellX - sourceX, cellY - sourceY);
  const slantDist = Math.hypot(horizontalDist, mountingHeight);
  const gaussian = Math.exp(-0.5 * (horizontalDist / sigma) ** 2);
  const cosFactor = mountingHeight / slantDist;
  const invSquare = 1 / (slantDist * slantDist);
  const patchArea = Math.PI * sigma * sigma;
  return ((lumens * gaussian * cosFactor) / patchArea) * (mountingHeight * mountingHeight * invSquare);
}

export function computeAisleMinLux(
  lines: LightLine[],
  warehouseLength: number,
  warehouseWidth: number,
  warehouseHeight: number,
  rectangles: PlacedRectangle[],
  wattsPerModule: number,
  fixtureType: FixtureType,
  netArea: number,
): number {
  const heatmap = computeHeatmap(
    lines,
    warehouseLength,
    warehouseWidth,
    warehouseHeight,
    rectangles,
    wattsPerModule,
    fixtureType,
    netArea,
  );
  return heatmap.minLux;
}

export function getLocalLuxNearPoint(
  heatmap: HeatmapStats,
  x: number,
  y: number,
): number {
  if (heatmap.cells.length === 0) return 0;

  let nearestLux = 0;
  let minDistance = Infinity;

  for (const cell of heatmap.cells) {
    const distance = Math.hypot(cell.x - x, cell.y - y);
    if (distance < minDistance) {
      minDistance = distance;
      nearestLux = cell.lux;
    }
  }

  return nearestLux;
}

export function computeHeatmap(
  lines: LightLine[],
  warehouseLength: number,
  warehouseWidth: number,
  warehouseHeight: number,
  rectangles: PlacedRectangle[],
  wattsPerModule: number,
  fixtureType: FixtureType,
  netArea: number,
): HeatmapStats {
  const heightFactor = getHeightFactor(warehouseHeight);
  const sigma = beamSigma(fixtureType, warehouseHeight);
  const lumensPerModule =
    LUMENS_PER_MODULE_AT_60W * (wattsPerModule / MODULE_WATTAGE_MAX) * heightFactor;

  const ledSources = lines.flatMap((line) =>
    line.slots
      .filter((slot) => isModulePosition(slot.type))
      .map((slot) => getSlotCenter(slot)),
  );

  const cells: HeatmapCell[] = [];
  const rawValues: number[] = [];

  for (let x = GRID_STEP / 2; x < warehouseLength; x += GRID_STEP) {
    for (let y = GRID_STEP / 2; y < warehouseWidth; y += GRID_STEP) {
      if (isBlocked(x, y, rectangles)) {
        continue;
      }

      let rawLux = 0;
      for (const source of ledSources) {
        rawLux += moduleIlluminanceAt(
          x,
          y,
          source.x,
          source.y,
          warehouseHeight,
          lumensPerModule,
          sigma,
        );
      }

      cells.push({ x, y, lux: rawLux });
      rawValues.push(rawLux);
    }
  }

  if (rawValues.length === 0 || ledSources.length === 0) {
    return {
      cells: [],
      minLux: 0,
      averageLux: 0,
      maxLux: 0,
      uniformity: 0,
      gridStep: GRID_STEP,
    };
  }

  const totalEffectiveLumens = ledSources.length * lumensPerModule;
  const targetAverageLux = netArea > 0 ? totalEffectiveLumens / netArea : 0;
  const rawAverage = rawValues.reduce((sum, value) => sum + value, 0) / rawValues.length;
  const scale = rawAverage > 0 && targetAverageLux > 0 ? targetAverageLux / rawAverage : 1;

  let minLux = Infinity;
  let maxLux = 0;
  let sumLux = 0;

  for (const cell of cells) {
    cell.lux *= scale;
    minLux = Math.min(minLux, cell.lux);
    maxLux = Math.max(maxLux, cell.lux);
    sumLux += cell.lux;
  }

  const averageLux = sumLux / cells.length;
  const uniformity = averageLux > 0 ? minLux / averageLux : 0;

  return {
    cells,
    minLux: Number.isFinite(minLux) ? minLux : 0,
    averageLux,
    maxLux,
    uniformity,
    gridStep: GRID_STEP,
  };
}

/** Color scale relative to target lux — muted tones with transparency */
export function luxToHeatmapColor(lux: number, targetLux: number): string {
  const ratio = targetLux > 0 ? lux / targetLux : 0;

  if (ratio > 1.5) return "rgba(220, 38, 38, 0.42)";
  if (ratio > 1.2) return "rgba(234, 88, 12, 0.38)";
  if (ratio > 1.0) return "rgba(245, 196, 0, 0.35)";
  if (ratio >= 0.8) return "rgba(22, 163, 74, 0.32)";
  if (ratio >= 0.5) return "rgba(156, 163, 175, 0.38)";
  return "rgba(43, 43, 43, 0.35)";
}

export function luxToHeatmapHex(lux: number, targetLux: number): string {
  const ratio = targetLux > 0 ? lux / targetLux : 0;

  if (ratio > 1.5) return "#DC2626";
  if (ratio > 1.2) return "#EA580C";
  if (ratio > 1.0) return "#F5C400";
  if (ratio >= 0.8) return "#16A34A";
  if (ratio >= 0.5) return "#9CA3AF";
  return "#2B2B2B";
}
