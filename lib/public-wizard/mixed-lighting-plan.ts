import { calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import type { PanelLayoutContext } from "@/lib/public-wizard/ceiling-grid";
import { getFixtureFootprintCorners } from "@/lib/public-wizard/placement-constraints";
import {
  buildRoomCeilingGrid,
  downlightCenterPx,
  listAllModuleIndices,
  nearestModuleIndex,
} from "@/lib/public-wizard/room-ceiling-grid";
import type { Point2D } from "@/types/floor-plan";
import type { CeilingTypeId, PlacedPublicFixture, PublicProductId } from "@/types/public-wizard";

export interface MixedLightingProposal {
  fixtures: PlacedPublicFixture[];
  addedDownlightCount: number;
  indicativeAverageLux: number;
  meetsTarget: boolean;
}

function nextId(): string {
  return `fx-mix-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pointInFixtureFootprint(
  point: Point2D,
  fixture: PlacedPublicFixture,
  pixelsPerMeter: number,
): boolean {
  const corners = getFixtureFootprintCorners(
    { x: fixture.x, y: fixture.y },
    pixelsPerMeter,
    fixture.productId,
    fixture.rotation,
  );
  let inside = false;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const xi = corners[i]!.x;
    const yi = corners[i]!.y;
    const xj = corners[j]!.x;
    const yj = corners[j]!.y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function moduleUsedByPanels(
  moduleCenter: Point2D,
  panelFixtures: PlacedPublicFixture[],
  pixelsPerMeter: number,
): boolean {
  return panelFixtures.some((fixture) => pointInFixtureFootprint(moduleCenter, fixture, pixelsPerMeter));
}

/**
 * Optional LED panels + downlights when panel-only layout does not meet lux.
 * Downlights only on modules not occupied by panels — not to fill aesthetic gaps alone.
 */
export function proposeMixedPanelDownlightPlan(options: {
  panelFixtures: PlacedPublicFixture[];
  vertices: Point2D[];
  pixelsPerMeter: number;
  ceilingType: CeilingTypeId;
  downlightProductId: PublicProductId;
  context: PanelLayoutContext;
  requiredFixtureCount: number;
  maxSupplementalDownlights?: number;
}): MixedLightingProposal | null {
  const {
    panelFixtures,
    vertices,
    pixelsPerMeter,
    ceilingType,
    downlightProductId,
    context,
    requiredFixtureCount,
    maxSupplementalDownlights = 24,
  } = options;

  if (vertices.length < 3 || pixelsPerMeter <= 0 || panelFixtures.length === 0) return null;

  const panelOnlyLux = calculateIndicativeResult(
    context.areaM2,
    context.targetLux,
    context.ceilingHeightM,
    panelFixtures,
    requiredFixtureCount,
  );
  if (panelOnlyLux.meetsTarget) return null;

  const grid = buildRoomCeilingGrid(vertices, pixelsPerMeter, ceilingType);
  if (!grid) return null;

  const emptyModuleCenters: Point2D[] = [];
  for (const { col, row } of listAllModuleIndices(grid)) {
    const center = downlightCenterPx(grid, col, row);
    if (!moduleUsedByPanels(center, panelFixtures, pixelsPerMeter)) {
      emptyModuleCenters.push(center);
    }
  }
  if (emptyModuleCenters.length === 0) return null;

  emptyModuleCenters.sort((a, b) => a.x - b.x || a.y - b.y);
  const stride = Math.max(1, Math.floor(emptyModuleCenters.length / Math.min(maxSupplementalDownlights, 12)));
  const candidateCenters = emptyModuleCenters.filter((_, index) => index % stride === 0);

  const supplemental: PlacedPublicFixture[] = [];
  let best: MixedLightingProposal | null = null;

  for (const center of candidateCenters) {
    if (supplemental.length >= maxSupplementalDownlights) break;
    supplemental.push({
      id: nextId(),
      productId: downlightProductId,
      x: center.x,
      y: center.y,
      rotation: 0,
    });
    const combined = [...panelFixtures, ...supplemental];
    const lux = calculateIndicativeResult(
      context.areaM2,
      context.targetLux,
      context.ceilingHeightM,
      combined,
      requiredFixtureCount,
    );
    best = {
      fixtures: combined,
      addedDownlightCount: supplemental.length,
      indicativeAverageLux: lux.indicativeAverageLux,
      meetsTarget: lux.meetsTarget,
    };
    if (lux.meetsTarget) break;
  }

  if (!best || best.addedDownlightCount === 0) return null;
  if (!best.meetsTarget && best.indicativeAverageLux <= panelOnlyLux.indicativeAverageLux) {
    return null;
  }

  for (const fixture of best.fixtures) {
    if (fixture.productId === downlightProductId) {
      const index = nearestModuleIndex(grid, fixture.x, fixture.y);
      if (!index) continue;
      const expected = downlightCenterPx(grid, index.col, index.row);
      fixture.x = expected.x;
      fixture.y = expected.y;
    }
  }

  return best;
}
