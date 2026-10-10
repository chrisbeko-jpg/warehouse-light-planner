import type { Point2D } from "@/types/floor-plan";
import type { CeilingTypeId } from "@/types/public-wizard";

export interface CeilingCellSize {
  cellWidthM: number;
  cellHeightM: number;
  helper: boolean;
}

export function ceilingCellSizeM(
  ceilingType: CeilingTypeId,
  roomWidthM: number,
  roomHeightM: number,
): CeilingCellSize {
  if (ceilingType === "concrete") {
    return { cellWidthM: 0.6, cellHeightM: 0.6, helper: true };
  }
  if (ceilingType === "grid_1200_600") {
    if (roomWidthM >= roomHeightM) {
      return { cellWidthM: 1.2, cellHeightM: 0.6, helper: false };
    }
    return { cellWidthM: 0.6, cellHeightM: 1.2, helper: false };
  }
  return { cellWidthM: 0.6, cellHeightM: 0.6, helper: false };
}

/**
 * Module centres in metres from the start of the span.
 * The leftover strip is split equally on both sides.
 */
export function centeredModuleCentersM(spanM: number, cellM: number): number[] {
  if (spanM <= 0 || cellM <= 0) return [];
  const cells = Math.floor((spanM + 1e-6) / cellM);
  if (cells < 1) return [];
  const offset = (spanM - cells * cellM) / 2;
  const centers: number[] = [];
  for (let index = 0; index < cells; index++) {
    centers.push(offset + (index + 0.5) * cellM);
  }
  return centers;
}

export interface RasterSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CeilingRaster {
  helper: boolean;
  cellWidthM: number;
  cellHeightM: number;
  segments: RasterSegment[];
}

export function buildCeilingRaster(
  vertices: Point2D[],
  pixelsPerMeter: number,
  ceilingType: CeilingTypeId,
): CeilingRaster {
  const empty: CeilingRaster = {
    helper: ceilingType === "concrete",
    cellWidthM: 0.6,
    cellHeightM: 0.6,
    segments: [],
  };
  if (vertices.length < 3 || pixelsPerMeter <= 0) return empty;

  const xs = vertices.map((vertex) => vertex.x);
  const ys = vertices.map((vertex) => vertex.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const roomWidthM = (maxX - minX) / pixelsPerMeter;
  const roomHeightM = (maxY - minY) / pixelsPerMeter;
  const cells = ceilingCellSizeM(ceilingType, roomWidthM, roomHeightM);
  const segments: RasterSegment[] = [];

  const pushLines = (spanPx: number, origin: number, cellM: number, vertical: boolean) => {
    const cellPx = cellM * pixelsPerMeter;
    if (cellPx <= 1) return;
    const count = Math.floor((spanPx + 1e-3) / cellPx);
    if (count < 1) return;
    const offset = (spanPx - count * cellPx) / 2;
    for (let index = 0; index <= count; index++) {
      const position = origin + offset + index * cellPx;
      if (vertical) {
        segments.push({ x1: position, y1: minY, x2: position, y2: maxY });
      } else {
        segments.push({ x1: minX, y1: position, x2: maxX, y2: position });
      }
    }
  };

  pushLines(maxX - minX, minX, cells.cellWidthM, true);
  pushLines(maxY - minY, minY, cells.cellHeightM, false);

  return { ...cells, segments };
}
