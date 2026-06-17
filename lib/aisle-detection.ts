import type { LineDirection, LightLineSegment, PlacedRectangle } from "@/types";

export const MIN_AISLE_WIDTH = 1.2;
const CROSSING_TOLERANCE = 0.35;

interface Interval {
  start: number;
  end: number;
}

export interface Aisle {
  direction: LineDirection;
  start: number;
  end: number;
  width: number;
  center: number;
  isEdgeZone: boolean;
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function getGaps(
  dimensionSize: number,
  occupied: Interval[],
  minWidth: number,
): Array<{ start: number; end: number; isEdgeZone: boolean }> {
  const gaps: Array<{ start: number; end: number; isEdgeZone: boolean }> = [];
  let cursor = 0;

  for (const block of occupied) {
    if (block.start - cursor >= minWidth) {
      gaps.push({
        start: cursor,
        end: block.start,
        isEdgeZone: cursor === 0,
      });
    }
    cursor = Math.max(cursor, block.end);
  }

  if (dimensionSize - cursor >= minWidth) {
    gaps.push({
      start: cursor,
      end: dimensionSize,
      isEdgeZone: occupied.length === 0 || cursor >= occupied[occupied.length - 1].end,
    });
  }

  return gaps;
}

export function detectDominantDirection(shelves: PlacedRectangle[]): LineDirection {
  if (shelves.length === 0) {
    return "horizontal";
  }

  let horizontalLength = 0;
  let verticalLength = 0;

  for (const shelf of shelves) {
    if (shelf.width >= shelf.height) {
      horizontalLength += shelf.width;
    } else {
      verticalLength += shelf.height;
    }
  }

  return horizontalLength >= verticalLength ? "horizontal" : "vertical";
}

export function detectAisles(
  direction: LineDirection,
  warehouseLength: number,
  warehouseWidth: number,
  shelves: PlacedRectangle[],
  includeEdgeZones: boolean,
): Aisle[] {
  const crossDimension = direction === "horizontal" ? warehouseWidth : warehouseLength;
  const crossProjections = shelves.map((shelf) =>
    direction === "horizontal"
      ? { start: shelf.y, end: shelf.y + shelf.height }
      : { start: shelf.x, end: shelf.x + shelf.width },
  );

  const merged = mergeIntervals(crossProjections);
  const gaps = getGaps(crossDimension, merged, MIN_AISLE_WIDTH);

  return gaps
    .filter((gap) => includeEdgeZones || !gap.isEdgeZone)
    .map((gap) => ({
      direction,
      start: gap.start,
      end: gap.end,
      width: gap.end - gap.start,
      center: (gap.start + gap.end) / 2,
      isEdgeZone: gap.isEdgeZone,
    }));
}

export function detectAllAisles(
  warehouseLength: number,
  warehouseWidth: number,
  shelves: PlacedRectangle[],
  includeEdgeZones: boolean,
): Aisle[] {
  return [
    ...detectAisles("horizontal", warehouseLength, warehouseWidth, shelves, includeEdgeZones),
    ...detectAisles("vertical", warehouseLength, warehouseWidth, shelves, includeEdgeZones),
  ];
}

function overlapsCross(
  crossPos: number,
  rect: PlacedRectangle,
  direction: LineDirection,
): boolean {
  if (direction === "horizontal") {
    return crossPos >= rect.y && crossPos <= rect.y + rect.height;
  }

  return crossPos >= rect.x && crossPos <= rect.x + rect.width;
}

function subtractAlongRange(
  segments: LightLineSegment[],
  blockStart: number,
  blockEnd: number,
): LightLineSegment[] {
  const result: LightLineSegment[] = [];

  for (const segment of segments) {
    if (blockEnd <= segment.start || blockStart >= segment.end) {
      result.push(segment);
      continue;
    }

    if (blockStart > segment.start) {
      result.push({ start: segment.start, end: blockStart });
    }
    if (blockEnd < segment.end) {
      result.push({ start: blockEnd, end: segment.end });
    }
  }

  return result.filter((segment) => segment.end - segment.start > 0.01);
}

export function getSegmentsAlongAxis(
  crossPos: number,
  direction: LineDirection,
  warehouseLength: number,
  warehouseWidth: number,
  obstructions: PlacedRectangle[],
): LightLineSegment[] {
  const alongSize = direction === "horizontal" ? warehouseLength : warehouseWidth;
  let segments: LightLineSegment[] = [{ start: 0, end: alongSize }];

  for (const obstruction of obstructions) {
    if (!overlapsCross(crossPos, obstruction, direction)) {
      continue;
    }

    const blockStart =
      direction === "horizontal" ? obstruction.x : obstruction.y;
    const blockEnd =
      direction === "horizontal"
        ? obstruction.x + obstruction.width
        : obstruction.y + obstruction.height;

    segments = subtractAlongRange(segments, blockStart, blockEnd);
  }

  return segments;
}

export function isInsideShelf(
  crossPos: number,
  shelves: PlacedRectangle[],
  direction: LineDirection,
): boolean {
  return shelves.some((shelf) => overlapsCross(crossPos, shelf, direction));
}

export interface DraftSegment {
  direction: LineDirection;
  crossPos: number;
  aisleWidth: number;
  availableStart: number;
  availableEnd: number;
}

export function draftSegmentKey(segment: DraftSegment): string {
  return [
    segment.direction,
    segment.crossPos.toFixed(2),
    segment.availableStart.toFixed(2),
    segment.availableEnd.toFixed(2),
  ].join(":");
}

export function isDuplicateAtCrossing(
  candidate: DraftSegment,
  existing: DraftSegment[],
): boolean {
  for (const line of existing) {
    if (line.direction === candidate.direction) {
      continue;
    }

    const horizontal = candidate.direction === "horizontal" ? candidate : line;
    const vertical = candidate.direction === "vertical" ? candidate : line;

    const crossX = vertical.crossPos;
    const crossY = horizontal.crossPos;

    const horizontalCovers =
      crossX >= horizontal.availableStart - CROSSING_TOLERANCE &&
      crossX <= horizontal.availableEnd + CROSSING_TOLERANCE;
    const verticalCovers =
      crossY >= vertical.availableStart - CROSSING_TOLERANCE &&
      crossY <= vertical.availableEnd + CROSSING_TOLERANCE;

    if (!horizontalCovers || !verticalCovers) {
      continue;
    }

    const sameSpan =
      Math.abs(candidate.availableStart - line.availableStart) < CROSSING_TOLERANCE &&
      Math.abs(candidate.availableEnd - line.availableEnd) < CROSSING_TOLERANCE &&
      Math.abs(candidate.crossPos - line.crossPos) < CROSSING_TOLERANCE;

    if (sameSpan) {
      return true;
    }
  }

  return false;
}
