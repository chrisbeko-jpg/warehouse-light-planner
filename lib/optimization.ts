import {
  buildSlotsForPhysicalLine,
  computeHangers,
  computePhysicalLayout,
} from "@/lib/light-line-physics";
import type { LightLine, SlotType } from "@/types";
import { isModulePosition } from "@/types";

export function cloneLineWithSlotTypes(line: LightLine, slotTypes: SlotType[]): LightLine {
  const layout = computePhysicalLayout(line.availableLength);
  if (!layout) return line;

  const { slots, railSegments, positions } = buildSlotsForPhysicalLine(
    line.direction,
    line.crossPos,
    line.availableStart,
    layout,
    line.id,
    slotTypes,
  );

  const modules = slots.filter((slot) => isModulePosition(slot.type)).length;
  const blankPlates = slots.filter((slot) => slot.type === "blankplate").length;
  const physicalStart = line.availableStart + layout.offset;
  const physicalEnd = physicalStart + layout.physicalLength;
  const hangers = computeHangers(physicalStart, layout.physicalLength);

  return {
    ...line,
    slots,
    positions,
    railSegments,
    modules,
    blankPlates,
    physicalStart,
    physicalEnd,
    physicalLength: layout.physicalLength,
    railLength: layout.railLength,
    freeMargin: layout.freeMargin,
    rails3m: layout.rails3m,
    rails1_5m: layout.rails1_5m,
    maxPositions: layout.maxPositions,
    hangerPositions: hangers.positions,
    hangerCount: hangers.count,
    hangerWarning: hangers.warning,
  };
}
