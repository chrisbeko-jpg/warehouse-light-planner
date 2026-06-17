import type { LineDirection, RailSegment, RailSlot, SlotType } from "@/types";

export const END_CAP_LENGTH = 0.3;
export const POWER_FEED_LENGTH = 0.3;
export const RAIL_3M = 3;
export const RAIL_1_5M = 1.5;
export const SLOT_WIDTH = 1.5;
export const MIN_SEGMENT_LENGTH = END_CAP_LENGTH + RAIL_1_5M + END_CAP_LENGTH;
export const HANGER_EDGE_MARGIN = 0.5;
export const HANGER_MAX_SPACING = 2.0;

export interface PhysicalLayout {
  rails3m: number;
  rails1_5m: number;
  railLength: number;
  physicalLength: number;
  freeMargin: number;
  offset: number;
  maxPositions: number;
}

export interface HangerResult {
  positions: number[];
  count: number;
  warning?: string;
}

export function computePhysicalLayout(availableLength: number): PhysicalLayout | null {
  if (availableLength < MIN_SEGMENT_LENGTH) {
    return null;
  }

  const railBudget = availableLength - END_CAP_LENGTH - POWER_FEED_LENGTH;
  if (railBudget < RAIL_1_5M) {
    return null;
  }

  let best: PhysicalLayout = {
    rails3m: 0,
    rails1_5m: 0,
    railLength: 0,
    physicalLength: 0,
    freeMargin: 0,
    offset: 0,
    maxPositions: 0,
  };

  for (let rails3m = Math.floor(railBudget / RAIL_3M); rails3m >= 0; rails3m -= 1) {
    const remainder = railBudget - rails3m * RAIL_3M;
    const rails1_5m = remainder >= RAIL_1_5M - 1e-9 ? 1 : 0;
    const railLength = rails3m * RAIL_3M + rails1_5m * RAIL_1_5M;

    if (railLength > best.railLength) {
      const physicalLength = POWER_FEED_LENGTH + railLength + END_CAP_LENGTH;
      const freeMargin = availableLength - physicalLength;
      best = {
        rails3m,
        rails1_5m,
        railLength,
        physicalLength,
        freeMargin,
        offset: freeMargin / 2,
        maxPositions: rails3m * 2 + rails1_5m,
      };
    }
  }

  if (best.railLength < RAIL_1_5M) {
    return null;
  }

  return best;
}

export function computeHangers(physicalStart: number, physicalLength: number): HangerResult {
  const usableLength = physicalLength - 1.0;
  const zoneStart = physicalStart + HANGER_EDGE_MARGIN;
  const zoneEnd = physicalStart + physicalLength - HANGER_EDGE_MARGIN;
  const zoneLength = zoneEnd - zoneStart;

  if (usableLength <= 0 || zoneLength < 0.01) {
    return {
      positions: [],
      count: 0,
      warning: "Lichtlijnsegment te kort voor correcte ophanging.",
    };
  }

  const count = Math.max(2, Math.floor(usableLength / HANGER_MAX_SPACING) + 1);

  if (count >= 2 && zoneLength < 0.01) {
    return {
      positions: [],
      count: 0,
      warning: "Lichtlijnsegment te kort voor correcte ophanging.",
    };
  }

  const positions = Array.from(
    { length: count },
    (_, index) => zoneStart + (index * zoneLength) / (count - 1),
  );

  return { positions, count };
}

/** @deprecated use computeHangers */
export function getHangerCount(physicalLength: number): number {
  return computeHangers(0, physicalLength).count;
}

/** @deprecated use computeHangers */
export function getHangerPositions(physicalStart: number, physicalLength: number): number[] {
  return computeHangers(physicalStart, physicalLength).positions;
}

function buildRailSegments(
  railStart: number,
  rails3m: number,
  rails1_5m: number,
): RailSegment[] {
  const segments: RailSegment[] = [];
  let cursor = railStart;

  for (let i = 0; i < rails3m; i += 1) {
    segments.push({ length: 3, alongStart: cursor, alongEnd: cursor + RAIL_3M });
    cursor += RAIL_3M;
  }

  if (rails1_5m > 0) {
    segments.push({ length: 1.5, alongStart: cursor, alongEnd: cursor + RAIL_1_5M });
  }

  return segments;
}

function slotRect(
  direction: LineDirection,
  crossPos: number,
  alongStart: number,
  alongEnd: number,
): Pick<RailSlot, "xStart" | "xEnd" | "yStart" | "yEnd"> {
  if (direction === "horizontal") {
    return {
      xStart: alongStart,
      xEnd: alongEnd,
      yStart: crossPos,
      yEnd: crossPos,
    };
  }

  return {
    xStart: crossPos,
    xEnd: crossPos,
    yStart: alongStart,
    yEnd: alongEnd,
  };
}

export function buildSlotsForPhysicalLine(
  direction: LineDirection,
  crossPos: number,
  availableStart: number,
  layout: PhysicalLayout,
  lineId: string,
  slotTypes?: SlotType[],
): { slots: RailSlot[]; railSegments: RailSegment[]; positions: RailSlot[] } {
  const physicalStart = availableStart + layout.offset;
  const railStart = physicalStart + POWER_FEED_LENGTH;
  const railSegments = buildRailSegments(railStart, layout.rails3m, layout.rails1_5m);

  const slots: RailSlot[] = [];
  let slotIndex = 0;

  railSegments.forEach((segment, railIndex) => {
    const positionsInRail = segment.length === 3 ? 2 : 1;
    const railId = `${lineId}-rail-${railIndex}`;

    for (let position = 0; position < positionsInRail; position += 1) {
      const alongStart = segment.alongStart + position * SLOT_WIDTH;
      const alongEnd = alongStart + SLOT_WIDTH;
      const type = slotTypes?.[slotIndex] ?? "module";

      slots.push({
        id: `${railId}-pos-${position}`,
        railId,
        positionIndex: position,
        index: slotIndex,
        railIndex,
        railLength: segment.length,
        type,
        length: SLOT_WIDTH,
        ...slotRect(direction, crossPos, alongStart, alongEnd),
      });

      slotIndex += 1;
    }
  });

  return { slots, railSegments, positions: slots };
}

export function getSlotCenter(slot: RailSlot): { x: number; y: number } {
  return {
    x: (slot.xStart + slot.xEnd) / 2,
    y: (slot.yStart + slot.yEnd) / 2,
  };
}

export function getLineWorldCenter(line: {
  direction: LineDirection;
  crossPos: number;
  physicalStart: number;
  physicalEnd: number;
}): { x: number; y: number } {
  const alongCenter = (line.physicalStart + line.physicalEnd) / 2;
  if (line.direction === "horizontal") {
    return { x: alongCenter, y: line.crossPos };
  }
  return { x: line.crossPos, y: alongCenter };
}
