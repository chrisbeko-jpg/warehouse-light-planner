import { calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import type { PanelLayoutContext } from "@/lib/public-wizard/ceiling-grid";
import {
  buildRoomCeilingGrid,
  gridPanelCenterPx,
  listAllModuleIndices,
} from "@/lib/public-wizard/room-ceiling-grid";
import { isPanelFootprintInsideRoom } from "@/lib/public-wizard/placement-constraints";
import { isFixturePlacementAllowed } from "@/lib/public-wizard/plan-obstacles";
import type { Point2D } from "@/types/floor-plan";
import type { PlacedPublicFixture, PublicProductId } from "@/types/public-wizard";

function nextId(): string {
  return `fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function occupied(point: Point2D, fixtures: PlacedPublicFixture[], tolerance = 3): boolean {
  return fixtures.some(
    (f) => Math.abs(f.x - point.x) < tolerance && Math.abs(f.y - point.y) < tolerance,
  );
}

/** Add panels on free ceiling modules until target count or no valid slots remain. */
export function augmentFixturesToTargetCount(
  fixtures: PlacedPublicFixture[],
  targetCount: number,
  vertices: Point2D[],
  pixelsPerMeter: number,
  productId: PublicProductId,
  context: PanelLayoutContext,
): PlacedPublicFixture[] {
  if (fixtures.length >= targetCount || vertices.length < 3) return fixtures;

  const ceilingType = context.ceilingType ?? "grid_600";
  const grid = buildRoomCeilingGrid(vertices, pixelsPerMeter, ceilingType);
  if (!grid) return fixtures;

  const obstacles = context.obstacles ?? [];
  const rotation = fixtures[0]?.rotation ?? 0;
  let current = [...fixtures];
  const candidates: Point2D[] = [];

  for (const { col, row } of listAllModuleIndices(grid)) {
    const point = gridPanelCenterPx(grid, col, row);
    if (occupied(point, current)) continue;
    const inside = isPanelFootprintInsideRoom(
      point,
      pixelsPerMeter,
      vertices,
      productId,
      rotation,
    );
    if (
      !isFixturePlacementAllowed(
        point,
        pixelsPerMeter,
        vertices,
        productId,
        rotation,
        obstacles,
        inside,
      )
    ) {
      continue;
    }
    candidates.push(point);
  }

  while (current.length < targetCount && candidates.length > 0) {
    let bestIndex = -1;
    let bestLux = -Infinity;
    const area = context.areaM2;
    const { targetLux, ceilingHeightM } = context;

    for (let i = 0; i < candidates.length; i++) {
      const point = candidates[i]!;
      const trial: PlacedPublicFixture[] = [
        ...current,
        { id: "trial", productId, x: point.x, y: point.y, rotation },
      ];
      const lux = calculateIndicativeResult(
        area,
        targetLux,
        ceilingHeightM,
        trial,
        targetCount,
      ).indicativeAverageLux;
      if (lux > bestLux) {
        bestLux = lux;
        bestIndex = i;
      }
    }

    if (bestIndex < 0) break;
    const chosen = candidates.splice(bestIndex, 1)[0]!;
    current = [
      ...current,
      { id: nextId(), productId, x: chosen.x, y: chosen.y, rotation },
    ];
  }

  return current;
}

export function dynamicMatrixSearchLimits(requiredCount: number): {
  maxMatrixDim: number;
  maxTotal: number;
  countSearchDelta: number;
} {
  const countSearchDelta = requiredCount > 60 ? 6 : requiredCount > 30 ? 5 : 3;
  const maxTotal = Math.min(220, requiredCount + countSearchDelta + 2);
  const maxMatrixDim = Math.min(24, Math.ceil(Math.sqrt(maxTotal)) + 3);
  return { maxMatrixDim, maxTotal, countSearchDelta };
}
