import {
  detectAllAisles,
  detectDominantDirection,
  draftSegmentKey,
  getSegmentsAlongAxis,
  isDuplicateAtCrossing,
  isInsideShelf,
  type DraftSegment,
} from "@/lib/aisle-detection";
import { computeHeatmap } from "@/lib/heatmap-engine";
import { calculateLightInstallationSummary, MODULE_WATTAGE_MAX } from "@/lib/light-analysis";
import {
  applyFillAndOverrides,
  evaluateLightStatus,
} from "@/lib/line-fill";
import {
  buildSlotsForPhysicalLine,
  computeHangers,
  computePhysicalLayout,
} from "@/lib/light-line-physics";
import { buildMaterialListFromTotals } from "@/lib/material-list";
import type {
  DrawnLightLine,
  LightLine,
  LightLinePlan,
  LineFillMode,
  LuxLevel,
  MaterialTotals,
  MountingSystem,
  PlacedRectangle,
} from "@/types";

type DraftInput = {
  direction: LightLine["direction"];
  crossPos: number;
  aisleWidth: number;
  availableStart: number;
  availableEnd: number;
  layout: NonNullable<ReturnType<typeof computePhysicalLayout>>;
};

function buildLightLineFromDraft(
  draft: DraftInput,
  index: number,
  lineId?: string,
): LightLine {
  const id = lineId ?? `light-line-${index}`;
  const { slots, railSegments, positions } = buildSlotsForPhysicalLine(
    draft.direction,
    draft.crossPos,
    draft.availableStart,
    draft.layout,
    id,
  );

  const physicalStart = draft.availableStart + draft.layout.offset;
  const physicalEnd = physicalStart + draft.layout.physicalLength;
  const hangers = computeHangers(physicalStart, draft.layout.physicalLength);
  const isHorizontal = draft.direction === "horizontal";

  return {
    id,
    index,
    direction: draft.direction,
    crossPos: draft.crossPos,
    aisleWidth: draft.aisleWidth,
    availableStart: draft.availableStart,
    availableEnd: draft.availableEnd,
    availableLength: draft.availableEnd - draft.availableStart,
    physicalStart,
    physicalEnd,
    physicalLength: draft.layout.physicalLength,
    railLength: draft.layout.railLength,
    freeMargin: draft.layout.freeMargin,
    rails3m: draft.layout.rails3m,
    rails1_5m: draft.layout.rails1_5m,
    maxPositions: draft.layout.maxPositions,
    modules: slots.filter((slot) => slot.type === "module").length,
    blankPlates: slots.filter((slot) => slot.type === "blankplate").length,
    slots,
    positions,
    railSegments,
    hangerCount: hangers.count,
    hangerPositions: hangers.positions,
    hangerWarning: hangers.warning,
    powerFeedCount: 1,
    endCapCount: 1,
    y: isHorizontal ? draft.crossPos : (draft.availableStart + draft.availableEnd) / 2,
    xStart: isHorizontal ? draft.availableStart : draft.crossPos,
    xEnd: isHorizontal ? draft.availableEnd : draft.crossPos,
    length: draft.availableEnd - draft.availableStart,
    roundedLength: draft.layout.railLength,
  };
}

function buildLightLineFromDrawn(drawn: DrawnLightLine, index: number): LightLine | null {
  const availableLength = drawn.drawnEnd - drawn.drawnStart;
  const layout = computePhysicalLayout(availableLength);
  if (!layout) return null;

  return buildLightLineFromDraft(
    {
      direction: drawn.direction,
      crossPos: drawn.crossPos,
      aisleWidth: 0,
      availableStart: drawn.drawnStart,
      availableEnd: drawn.drawnEnd,
      layout,
    },
    index,
    drawn.id,
  );
}

function buildMaterials(
  lines: LightLine[],
  summary: ReturnType<typeof calculateLightInstallationSummary>,
  heatmap: ReturnType<typeof computeHeatmap>,
  mountingSystem: MountingSystem,
): MaterialTotals {
  const rails = lines.reduce(
    (totals, line) => ({
      rails3m: totals.rails3m + line.rails3m,
      rails1_5m: totals.rails1_5m + line.rails1_5m,
    }),
    { rails3m: 0, rails1_5m: 0 },
  );

  return {
    ...rails,
    ledModules: summary.totalModules,
    blankPlates: summary.blankPlates,
    powerFeeds: lines.length,
    endCaps: lines.length,
    mountingSets: lines.reduce((sum, line) => sum + line.hangerCount, 0),
    mountingSystem,
    installedPowerW: summary.installedPowerW,
    advisedTotalPowerW: summary.advisedTotalPowerW,
    heightFactor: summary.heightFactor,
    expectedLuxAfterDimming: summary.expectedLuxAfterDimming,
    averageLux: heatmap.averageLux,
    uniformity: heatmap.uniformity,
  };
}

function buildPlanCore(
  baseLines: LightLine[],
  drawnLightLines: DrawnLightLine[],
  warehouseLength: number,
  warehouseWidth: number,
  warehouseHeight: number,
  rectangles: PlacedRectangle[],
  targetLux: LuxLevel,
  netArea: number,
  mountingSystem: MountingSystem,
  lineFillMode: LineFillMode,
  dominantDirection: LightLine["direction"],
): LightLinePlan {
  const lines = applyFillAndOverrides(baseLines, drawnLightLines, lineFillMode);
  const fixtureType = warehouseHeight <= 6 ? "opaque" : "90degree";

  const heatmapAt60 = computeHeatmap(
    lines,
    warehouseLength,
    warehouseWidth,
    warehouseHeight,
    rectangles,
    MODULE_WATTAGE_MAX,
    fixtureType,
    netArea,
  );

  const totalModules = lines.reduce((sum, line) => sum + line.modules, 0);
  const totalBlanks = lines.reduce((sum, line) => sum + line.blankPlates, 0);

  const summary = calculateLightInstallationSummary(
    totalModules,
    netArea,
    targetLux,
    warehouseHeight,
    totalBlanks,
    heatmapAt60.averageLux,
  );

  const heatmap = computeHeatmap(
    lines,
    warehouseLength,
    warehouseWidth,
    warehouseHeight,
    rectangles,
    summary.advisedWattsPerModule,
    fixtureType,
    netArea,
  );

  const { lightStatus, fillAdvice } = evaluateLightStatus(
    heatmap.averageLux,
    targetLux,
    lineFillMode,
  );

  const materials = buildMaterials(lines, summary, heatmap, mountingSystem);
  const productList = buildMaterialListFromTotals(materials, warehouseHeight, totalBlanks);

  return {
    lines,
    materials,
    summary,
    heatmap,
    dominantDirection,
    lineFillMode,
    lightStatus,
    fillAdvice,
    productList,
  };
}

export function generateLightLinePlanFromDrawn(
  drawnLightLines: DrawnLightLine[],
  warehouseLength: number,
  warehouseWidth: number,
  warehouseHeight: number,
  rectangles: PlacedRectangle[],
  targetLux: LuxLevel,
  netArea: number,
  mountingSystem: MountingSystem,
  lineFillMode: LineFillMode,
): LightLinePlan | null {
  if (drawnLightLines.length === 0) {
    return null;
  }

  const baseLines = drawnLightLines
    .map((drawn, index) => buildLightLineFromDrawn(drawn, index + 1))
    .filter((line): line is LightLine => line !== null);

  if (baseLines.length === 0) {
    return null;
  }

  const shelves = rectangles.filter((rect) => rect.type === "shelf");
  const dominantDirection = detectDominantDirection(shelves);

  return buildPlanCore(
    baseLines,
    drawnLightLines,
    warehouseLength,
    warehouseWidth,
    warehouseHeight,
    rectangles,
    targetLux,
    netArea,
    mountingSystem,
    lineFillMode,
    dominantDirection,
  );
}

function generateAutoDraftLines(
  warehouseLength: number,
  warehouseWidth: number,
  shelves: PlacedRectangle[],
  obstructions: PlacedRectangle[],
  includeEdgeZones: boolean,
): DraftInput[] {
  const aisles = detectAllAisles(warehouseLength, warehouseWidth, shelves, includeEdgeZones);
  const draftLines: DraftInput[] = [];
  const acceptedSegments: DraftSegment[] = [];
  const seenKeys = new Set<string>();

  for (const aisle of aisles) {
    if (isInsideShelf(aisle.center, shelves, aisle.direction)) {
      continue;
    }

    const segments = getSegmentsAlongAxis(
      aisle.center,
      aisle.direction,
      warehouseLength,
      warehouseWidth,
      obstructions,
    );

    for (const segment of segments) {
      const availableLength = segment.end - segment.start;
      const layout = computePhysicalLayout(availableLength);
      if (!layout) continue;

      const draftSegment: DraftSegment = {
        direction: aisle.direction,
        crossPos: aisle.center,
        aisleWidth: aisle.width,
        availableStart: segment.start,
        availableEnd: segment.end,
      };

      const key = draftSegmentKey(draftSegment);
      if (seenKeys.has(key) || isDuplicateAtCrossing(draftSegment, acceptedSegments)) {
        continue;
      }

      seenKeys.add(key);
      acceptedSegments.push(draftSegment);

      draftLines.push({
        direction: aisle.direction,
        crossPos: aisle.center,
        aisleWidth: aisle.width,
        availableStart: segment.start,
        availableEnd: segment.end,
        layout,
      });
    }
  }

  return draftLines;
}

export function generateAutoDrawnLightLines(
  warehouseLength: number,
  warehouseWidth: number,
  rectangles: PlacedRectangle[],
  includeEdgeZones: boolean,
): DrawnLightLine[] {
  const shelves = rectangles.filter((rect) => rect.type === "shelf");
  const obstructions = rectangles.filter((rect) => rect.type === "obstruction");
  const drafts = generateAutoDraftLines(
    warehouseLength,
    warehouseWidth,
    shelves,
    obstructions,
    includeEdgeZones,
  );

  return drafts.map((draft, index) => ({
    id: `drawn-auto-${index + 1}`,
    direction: draft.direction,
    crossPos: draft.crossPos,
    drawnStart: draft.availableStart,
    drawnEnd: draft.availableEnd,
  }));
}

export {
  END_CAP_LENGTH,
  POWER_FEED_LENGTH,
  computePhysicalLayout,
  buildSlotsForPhysicalLine,
  computeHangers,
} from "@/lib/light-line-physics";
