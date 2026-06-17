import type { DrawnLightLine, LineDirection } from "@/types";
import { MIN_SEGMENT_LENGTH } from "@/lib/light-line-physics";

export const LIGHT_LINE_GRID_STEP = 0.5;

export function snapToGrid(value: number, step = LIGHT_LINE_GRID_STEP): number {
  return Math.round(value / step) * step;
}

export function clampCrossPos(
  direction: LineDirection,
  crossPos: number,
  warehouseLength: number,
  warehouseWidth: number,
): number {
  if (direction === "horizontal") {
    return Math.max(0, Math.min(snapToGrid(crossPos), warehouseWidth));
  }
  return Math.max(0, Math.min(snapToGrid(crossPos), warehouseLength));
}

export function clampAlongSpan(
  start: number,
  end: number,
  maxAlong: number,
): { start: number; end: number } {
  let alongStart = snapToGrid(Math.min(start, end));
  let alongEnd = snapToGrid(Math.max(start, end));

  alongStart = Math.max(0, alongStart);
  alongEnd = Math.min(maxAlong, alongEnd);

  if (alongEnd - alongStart < MIN_SEGMENT_LENGTH) {
    if (alongStart + MIN_SEGMENT_LENGTH <= maxAlong) {
      alongEnd = alongStart + MIN_SEGMENT_LENGTH;
    } else {
      alongStart = Math.max(0, alongEnd - MIN_SEGMENT_LENGTH);
    }
  }

  return { start: alongStart, end: alongEnd };
}

export function createDrawnLineFromPoints(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  warehouseLength: number,
  warehouseWidth: number,
): DrawnLightLine | null {
  const sx = snapToGrid(Math.max(0, Math.min(x1, warehouseLength)));
  const sy = snapToGrid(Math.max(0, Math.min(y1, warehouseWidth)));
  const ex = snapToGrid(Math.max(0, Math.min(x2, warehouseLength)));
  const ey = snapToGrid(Math.max(0, Math.min(y2, warehouseWidth)));

  const dx = Math.abs(ex - sx);
  const dy = Math.abs(ey - sy);
  const direction: LineDirection = dx >= dy ? "horizontal" : "vertical";

  if (direction === "horizontal") {
    const crossPos = clampCrossPos("horizontal", sy, warehouseLength, warehouseWidth);
    const span = clampAlongSpan(sx, ex, warehouseLength);
    if (span.end - span.start < MIN_SEGMENT_LENGTH) return null;
    return {
      id,
      direction,
      crossPos,
      drawnStart: span.start,
      drawnEnd: span.end,
    };
  }

  const crossPos = clampCrossPos("vertical", sx, warehouseLength, warehouseWidth);
  const span = clampAlongSpan(sy, ey, warehouseWidth);
  if (span.end - span.start < MIN_SEGMENT_LENGTH) return null;

  return {
    id,
    direction,
    crossPos,
    drawnStart: span.start,
    drawnEnd: span.end,
  };
}

export function moveDrawnLine(
  line: DrawnLightLine,
  deltaCross: number,
  warehouseLength: number,
  warehouseWidth: number,
): DrawnLightLine {
  return {
    ...line,
    crossPos: clampCrossPos(
      line.direction,
      line.crossPos + deltaCross,
      warehouseLength,
      warehouseWidth,
    ),
  };
}

export function resizeDrawnLineEnd(
  line: DrawnLightLine,
  endpoint: "start" | "end",
  alongValue: number,
  warehouseLength: number,
  warehouseWidth: number,
): DrawnLightLine {
  const maxAlong = line.direction === "horizontal" ? warehouseLength : warehouseWidth;
  const nextStart = endpoint === "start" ? alongValue : line.drawnStart;
  const nextEnd = endpoint === "end" ? alongValue : line.drawnEnd;
  const span = clampAlongSpan(nextStart, nextEnd, maxAlong);

  return {
    ...line,
    drawnStart: span.start,
    drawnEnd: span.end,
    crossPos: clampCrossPos(line.direction, line.crossPos, warehouseLength, warehouseWidth),
  };
}

export function drawnLineToCanvasPoints(
  line: DrawnLightLine,
  scale: number,
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  if (line.direction === "horizontal") {
    return {
      start: { x: line.drawnStart * scale, y: line.crossPos * scale },
      end: { x: line.drawnEnd * scale, y: line.crossPos * scale },
    };
  }

  return {
    start: { x: line.crossPos * scale, y: line.drawnStart * scale },
    end: { x: line.crossPos * scale, y: line.drawnEnd * scale },
  };
}
