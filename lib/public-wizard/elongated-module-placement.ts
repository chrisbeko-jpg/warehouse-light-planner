import { calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import type { PanelLayoutContext } from "@/lib/public-wizard/ceiling-grid";
import {
  polygonBoundsFromVertices,
  scoreElongatedMatrixCandidate,
} from "@/lib/public-wizard/elongated-matrix-score";
import { countAdjacentLuminaires } from "@/lib/public-wizard/luminaire-adjacency";
import {
  enumerateMatrixFactors,
  minModuleIndexStepForAxis,
  enumerateEvenlySpacedIndexSets,
} from "@/lib/public-wizard/module-spacing";
import {
  autoWallClearanceScoreAdjustment,
  isAutoWallClearanceAcceptable,
} from "@/lib/public-wizard/layout-wall-clearance";
import {
  computeLayoutCoverageMetrics,
  layoutCoverageScoreAdjustment,
} from "@/lib/public-wizard/elongated-layout-coverage";
import type { MatrixSpacingMetrics } from "@/lib/public-wizard/matrix-spacing-metrics";
import { computeMatrixSpacingMetrics } from "@/lib/public-wizard/matrix-spacing-metrics";
import { isFixturePlacementAllowed } from "@/lib/public-wizard/plan-obstacles";
import { isPanelFootprintInsideRoom } from "@/lib/public-wizard/placement-constraints";
import {
  buildRoomCeilingGrid,
  defaultElongatedPanelRotationForGrid,
  elongatedPanelCenterPx,
  isElongatedPanelContainedInModule,
  listAllModuleIndices,
  type ModuleIndex,
  type RoomCeilingGrid,
} from "@/lib/public-wizard/room-ceiling-grid";
import type { Point2D } from "@/types/floor-plan";
import type { CeilingTypeId, PlacedPublicFixture, PublicProductId } from "@/types/public-wizard";
import {
  ELONGATED_COUNT_SEARCH_DELTA,
  elongatedLayoutCountCandidates,
} from "@/lib/public-wizard/indicative-lumen-method";

export interface ElongatedModulePlacementResult {
  fixtures: PlacedPublicFixture[];
  requestedCount: number;
  placedCount: number;
  matrixRows?: number;
  matrixCols?: number;
  rotation: number;
  moduleIndices: ModuleIndex[];
  warning?: string;
}

function nextId(): string {
  return `fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validModulesForRotation(
  grid: RoomCeilingGrid,
  vertices: Point2D[],
  pixelsPerMeter: number,
  productId: PublicProductId,
  rotation: number,
  obstacles: PanelLayoutContext["obstacles"],
): ModuleIndex[] {
  const valid: ModuleIndex[] = [];
  const blocks = obstacles ?? [];
  for (const { col, row } of listAllModuleIndices(grid)) {
    if (!isElongatedPanelContainedInModule(grid, col, row, productId, rotation)) continue;
    const center = elongatedPanelCenterPx(grid, col, row, productId, rotation);
    const inside = isPanelFootprintInsideRoom(center, pixelsPerMeter, vertices, productId, rotation);
    if (
      isFixturePlacementAllowed(
        center,
        pixelsPerMeter,
        vertices,
        productId,
        rotation,
        blocks,
        inside,
      )
    ) {
      valid.push({ col, row });
    }
  }
  return valid;
}

interface ModuleMatrixCandidate {
  points: Point2D[];
  modules: ModuleIndex[];
  rows: number;
  cols: number;
  rotation: number;
  placedCount: number;
  adjacentPairs: number;
  meetsLuxTarget: boolean;
  score: number;
  spacing?: MatrixSpacingMetrics;
  maxSampleDistanceM?: number;
  axisMarginImbalanceM?: number;
}

function tryModuleMatrix(
  grid: RoomCeilingGrid,
  validModules: ModuleIndex[],
  validRows: number[],
  validCols: number[],
  matrixRows: number,
  matrixCols: number,
  rotation: number,
  productId: PublicProductId,
  vertices: Point2D[],
  pixelsPerMeter: number,
  context: PanelLayoutContext,
  requiredCount: number,
  bounds: ReturnType<typeof polygonBoundsFromVertices>,
  roomWidthM: number,
  roomHeightM: number,
): ModuleMatrixCandidate | null {
  const total = matrixRows * matrixCols;

  const minRowStep = minModuleIndexStepForAxis(
    productId,
    rotation,
    "row",
    grid.cellWidthM,
    grid.cellHeightM,
  );
  const minColStep = minModuleIndexStepForAxis(
    productId,
    rotation,
    "col",
    grid.cellWidthM,
    grid.cellHeightM,
  );

  const rowSlotOptions = enumerateEvenlySpacedIndexSets(validRows.length, matrixRows, minRowStep);
  const colSlotOptions = enumerateEvenlySpacedIndexSets(validCols.length, matrixCols, minColStep);
  if (rowSlotOptions.length === 0 || colSlotOptions.length === 0) return null;

  const validSet = new Set(validModules.map((m) => `${m.col},${m.row}`));

  let best: ModuleMatrixCandidate | null = null;

  for (const rowSlots of rowSlotOptions) {
    for (const colSlots of colSlotOptions) {
      const modules: ModuleIndex[] = [];
      const points: Point2D[] = [];

      let layoutValid = true;
      for (const rowSlot of rowSlots) {
        const row = validRows[rowSlot]!;
        for (const colSlot of colSlots) {
          const col = validCols[colSlot]!;
          if (!validSet.has(`${col},${row}`)) {
            layoutValid = false;
            break;
          }
          modules.push({ col, row });
          points.push(elongatedPanelCenterPx(grid, col, row, productId, rotation));
        }
        if (!layoutValid) break;
      }

      if (!layoutValid || points.length !== total) continue;

      const adjacent = countAdjacentLuminaires(points, pixelsPerMeter, productId, rotation).totalPairs;

      const fixtures: PlacedPublicFixture[] = points.map((point, index) => ({
        id: `score-${index}`,
        productId,
        x: point.x,
        y: point.y,
        rotation,
      }));

      const lux = calculateIndicativeResult(
        context.areaM2,
        context.targetLux,
        context.ceilingHeightM,
        fixtures,
        requiredCount,
      );

      const spacing = computeMatrixSpacingMetrics(
        points,
        pixelsPerMeter,
        productId,
        rotation,
        bounds,
        vertices,
      );

      const coverage = computeLayoutCoverageMetrics(points, bounds, pixelsPerMeter);

      const scored = scoreElongatedMatrixCandidate({
        points,
        bounds,
        pixelsPerMeter,
        matrixRows,
        matrixCols,
        roomWidthM,
        roomHeightM,
        placedCount: total,
        requiredCount,
        adjacentPairs: adjacent,
        meetsLuxTarget: lux.meetsTarget,
        indicativeLux: lux.indicativeAverageLux,
        targetLux: context.targetLux,
        rotation,
        spacing,
      });

      const candidate: ModuleMatrixCandidate = {
        points,
        modules,
        rows: matrixRows,
        cols: matrixCols,
        rotation,
        placedCount: total,
        adjacentPairs: adjacent,
        meetsLuxTarget: lux.meetsTarget,
        score: scored.score,
        spacing,
        maxSampleDistanceM: coverage.maxSampleDistanceM,
        axisMarginImbalanceM: coverage.axisMarginImbalanceM,
      };

      const pickScore =
        scored.score +
        layoutCoverageScoreAdjustment(coverage) +
        autoWallClearanceScoreAdjustment(spacing.minWallMarginM);
      const bestPickScore = best
        ? best.score +
          layoutCoverageScoreAdjustment({
            maxSampleDistanceM: best.maxSampleDistanceM ?? Infinity,
            axisMarginImbalanceM: best.axisMarginImbalanceM ?? Infinity,
          }) +
          autoWallClearanceScoreAdjustment(best.spacing?.minWallMarginM ?? 0)
        : -Infinity;
      if (!best || pickScore > bestPickScore) best = candidate;
    }
  }

  return best;
}

function collectCandidates(
  grid: RoomCeilingGrid,
  vertices: Point2D[],
  pixelsPerMeter: number,
  productId: PublicProductId,
  context: PanelLayoutContext,
  requiredCount: number,
  countDelta: number,
): ModuleMatrixCandidate[] {
  const candidates: ModuleMatrixCandidate[] = [];
  const bounds = polygonBoundsFromVertices(vertices);
  const gridRotation = defaultElongatedPanelRotationForGrid(grid);
  const rotations = [gridRotation] as const;

  const counts = new Set(elongatedLayoutCountCandidates(requiredCount, countDelta));

  for (const rotation of rotations) {
    const validModules = validModulesForRotation(
      grid,
      vertices,
      pixelsPerMeter,
      productId,
      rotation,
      context.obstacles,
    );
    if (validModules.length === 0) continue;

    const validRows = [...new Set(validModules.map((m) => m.row))].sort((a, b) => a - b);
    const validCols = [...new Set(validModules.map((m) => m.col))].sort((a, b) => a - b);

    for (const targetCount of counts) {
      for (const { rows, cols } of enumerateMatrixFactors(targetCount)) {
        for (const [matrixRows, matrixCols] of [
          [rows, cols] as const,
          ...(rows === cols ? [] : ([[cols, rows] as const] as const)),
        ]) {
          const candidate = tryModuleMatrix(
            grid,
            validModules,
            validRows,
            validCols,
            matrixRows,
            matrixCols,
            rotation,
            productId,
            vertices,
            pixelsPerMeter,
            context,
            requiredCount,
            bounds,
            grid.roomWidthM,
            grid.roomHeightM,
          );
          if (candidate) candidates.push(candidate);
        }
      }
    }
  }

  return candidates;
}

function professionalMatrixBonus(c: ModuleMatrixCandidate): number {
  const cols = c.cols;
  const rows = c.rows;
  if (cols >= 3 && rows >= 3) return 12_000;
  if (cols >= 3 || rows >= 3) return 4_000;
  return 0;
}

function pickBest(
  candidates: ModuleMatrixCandidate[],
  nominalCount: number,
  prioritizeLux: boolean,
): ModuleMatrixCandidate | null {
  const pool = candidates;
  if (pool.length === 0) return null;

  const zeroAdj = pool.filter((c) => c.adjacentPairs === 0);
  let shortlist = zeroAdj.length > 0 ? zeroAdj : pool;

  if (prioritizeLux) {
    const luxOk = shortlist.filter((c) => c.meetsLuxTarget);
    if (luxOk.length > 0) shortlist = luxOk;
  }

  const hasProfessionalMatrix = shortlist.some((c) => c.cols >= 3 && c.rows >= 3);

  shortlist.sort((a, b) => {
    if (a.adjacentPairs !== b.adjacentPairs) return a.adjacentPairs - b.adjacentPairs;
    const narrowTwoCol = (c: ModuleMatrixCandidate) => {
      if (c.cols !== 2) return 0;
      if (hasProfessionalMatrix && c.rows >= 4) return -200_000;
      if (c.rows >= 6) return -120_000;
      return -40_000;
    };
    const aNarrow = narrowTwoCol(a);
    const bNarrow = narrowTwoCol(b);
    if (aNarrow !== bNarrow) return bNarrow - aNarrow;

    const aMax = a.maxSampleDistanceM ?? Infinity;
    const bMax = b.maxSampleDistanceM ?? Infinity;
    if (Math.abs(aMax - bMax) > 0.12) return aMax - bMax;

    const aProf = professionalMatrixBonus(a);
    const bProf = professionalMatrixBonus(b);
    if (aProf !== bProf) return bProf - aProf;

    const flushPenalty = (c: ModuleMatrixCandidate) => {
      const w = c.spacing?.minWallMarginM ?? 0;
      if (w < 0.12) return -80_000;
      if (!isAutoWallClearanceAcceptable(w)) {
        if (w >= 0.18 && (c.maxSampleDistanceM ?? Infinity) < 2.05 && c.cols >= 3 && c.rows >= 3) {
          return -2_500;
        }
        if (w >= 0.18 && (c.maxSampleDistanceM ?? Infinity) < 2.05) return -5_000;
        return -12_000;
      }
      return 0;
    };
    const aScore = a.score + flushPenalty(a) + aProf;
    const bScore = b.score + flushPenalty(b) + bProf;
    if (bScore !== aScore) return bScore - aScore;

    const aWallOk = isAutoWallClearanceAcceptable(a.spacing?.minWallMarginM ?? 0);
    const bWallOk = isAutoWallClearanceAcceptable(b.spacing?.minWallMarginM ?? 0);
    if (aWallOk && !bWallOk) return -1;
    if (bWallOk && !aWallOk) return 1;

    if (prioritizeLux) {
      if (a.meetsLuxTarget && b.meetsLuxTarget && a.placedCount !== b.placedCount) {
        return a.placedCount - b.placedCount;
      }
      if (a.meetsLuxTarget !== b.meetsLuxTarget) return a.meetsLuxTarget ? -1 : 1;
    } else if (!prioritizeLux && a.placedCount !== b.placedCount) {
      return a.placedCount - b.placedCount;
    }

    const aCount = Math.abs(a.placedCount - nominalCount);
    const bCount = Math.abs(b.placedCount - nominalCount);
    if (aCount !== bCount) return aCount - bCount;
    const aBalance = Math.abs(a.rows - a.cols);
    const bBalance = Math.abs(b.rows - b.cols);
    if (aBalance !== bBalance) return aBalance - bBalance;
    if (a.cols !== b.cols) return b.cols - a.cols;
    return b.rows - a.rows;
  });

  return shortlist[0] ?? null;
}

/** Exposed for placement QA scripts: all scored matrix candidates before pickBest. */
export function enumerateElongatedModuleMatrixCandidates(
  vertices: Point2D[],
  pixelsPerMeter: number,
  requiredCount: number,
  productId: PublicProductId,
  context: PanelLayoutContext,
  ceilingType: CeilingTypeId = "grid_1200_600",
): ModuleMatrixCandidate[] {
  const grid = buildRoomCeilingGrid(vertices, pixelsPerMeter, ceilingType);
  if (!grid || vertices.length < 3 || requiredCount <= 0 || pixelsPerMeter <= 0) {
    return [];
  }
  return collectCandidates(
    grid,
    vertices,
    pixelsPerMeter,
    productId,
    context,
    requiredCount,
    ELONGATED_COUNT_SEARCH_DELTA,
  );
}

/**
 * Module-first placement for 1200×300 panels on 1200×600 grids.
 * Selects evenly spaced ceiling modules, then places fixtures on those modules.
 */
export function placeElongatedPanelsModuleFirst(
  vertices: Point2D[],
  pixelsPerMeter: number,
  requiredCount: number,
  productId: PublicProductId,
  context: PanelLayoutContext,
  ceilingType: CeilingTypeId = "grid_1200_600",
): ElongatedModulePlacementResult {
  if (vertices.length < 3 || requiredCount <= 0 || pixelsPerMeter <= 0) {
    return {
      fixtures: [],
      requestedCount: requiredCount,
      placedCount: 0,
      rotation: 0,
      moduleIndices: [],
    };
  }

  const grid = buildRoomCeilingGrid(vertices, pixelsPerMeter, ceilingType);
  if (!grid) {
    return {
      fixtures: [],
      requestedCount: requiredCount,
      placedCount: 0,
      rotation: 0,
      moduleIndices: [],
    };
  }

  const prioritizeLux = context.elongatedMeetLuxTarget === true;
  const countDelta = prioritizeLux ? 16 : ELONGATED_COUNT_SEARCH_DELTA;
  let allCandidates = collectCandidates(
    grid,
    vertices,
    pixelsPerMeter,
    productId,
    context,
    requiredCount,
    countDelta,
  );
  if (allCandidates.length === 0) {
    for (let center = requiredCount; center >= 1 && allCandidates.length === 0; center -= 6) {
      allCandidates = collectCandidates(
        grid,
        vertices,
        pixelsPerMeter,
        productId,
        context,
        center,
        countDelta,
      );
      if (center <= requiredCount - 48) break;
    }
  }
  let best = pickBest(allCandidates, requiredCount, prioritizeLux);
  if (prioritizeLux && best && !best.meetsLuxTarget) {
    const extra = collectCandidates(
      grid,
      vertices,
      pixelsPerMeter,
      productId,
      context,
      requiredCount,
      Math.max(countDelta, 24),
    );
    best = pickBest(extra, requiredCount, prioritizeLux) ?? best;
  }

  if (!best) {
    return {
      fixtures: [],
      requestedCount: requiredCount,
      placedCount: 0,
      rotation: 0,
      moduleIndices: [],
      warning:
        "Geen nette verdeling van 120×30-panelen mogelijk binnen dit plafondraster. Pas afmetingen aan of verdeel handmatig.",
    };
  }

  const fixtures: PlacedPublicFixture[] = best.points.map((point, index) => ({
    id: nextId(),
    productId,
    x: point.x,
    y: point.y,
    rotation: best.rotation,
  }));

  let warning: string | undefined;
  if (best.adjacentPairs > 0) {
    warning = `Let op: ${best.adjacentPairs} aangrenzende paneelparen — onvoldoende vrije modules voor volledig gespreide plaatsing.`;
  } else if (best.placedCount !== requiredCount) {
    warning = `Theoretisch benodigd: ${requiredCount} panelen. Gekozen nette verdeling: ${best.placedCount} panelen (${best.rows}×${best.cols}).`;
  } else {
    warning =
      "Het 1200×300 paneel vult de 1200×600 plafondmodule niet volledig. Het ligt in een inbouwvoorziening binnen de module.";
  }

  return {
    fixtures,
    requestedCount: requiredCount,
    placedCount: fixtures.length,
    matrixRows: best.rows,
    matrixCols: best.cols,
    rotation: best.rotation,
    moduleIndices: best.modules,
    warning,
  };
}
