import assert from "node:assert/strict";
import test from "node:test";
import { scoreDistributedFixtureLayout } from "@/lib/public-wizard/distributed-placement";
import {
  buildRoomCeilingGrid,
  elongatedPanelCenterPx,
} from "@/lib/public-wizard/room-ceiling-grid";
import { countAdjacentLuminaires } from "@/lib/public-wizard/luminaire-adjacency";
import { panelRotationForRoom, placeElongatedPanelsOnModules } from "@/lib/public-wizard/matrix-placement";
import type { Point2D } from "@/types/floor-plan";

const PPM = 100;
const PRODUCT = "led_panel_1200x300_4000" as const;

function rect(lengthM: number, widthM: number): Point2D[] {
  const origin = 40;
  return [
    { x: origin, y: origin },
    { x: origin + lengthM * PPM, y: origin },
    { x: origin + lengthM * PPM, y: origin + widthM * PPM },
    { x: origin, y: origin + widthM * PPM },
  ];
}

/** Force 3×5 touching-row layout (light bands) on 8×6.4 m. */
function buildTouchingRowLayout864(): { points: Point2D[]; rotation: number } {
  const vertices = rect(8, 6.4);
  const rotation = panelRotationForRoom(8, 6.4, PRODUCT);
  const grid = buildRoomCeilingGrid(vertices, PPM, "grid_1200_600");
  assert.ok(grid);
  const rowIndices = [2, 5, 8];
  const colStart = 0;
  const points: Point2D[] = [];
  for (const row of rowIndices) {
    for (let c = colStart; c < colStart + 5; c++) {
      points.push(elongatedPanelCenterPx(grid, c, row, PRODUCT, rotation));
    }
  }
  return { points, rotation };
}

test("countAdjacentLuminaires detects horizontal light bands", () => {
  const { points, rotation } = buildTouchingRowLayout864();
  const adjacent = countAdjacentLuminaires(points, PPM, PRODUCT, rotation);
  assert.ok(adjacent.horizontal >= 10);
  assert.equal(points.length, 15);
});

test("5×3 separated layout scores higher than 3×5 touching rows for same room", () => {
  const vertices = rect(8, 6.4);
  const bounds = { minX: 40, maxX: 840, minY: 40, maxY: 680 };
  const context = {
    areaM2: 51.2,
    targetLux: 500,
    ceilingHeightM: 2.7,
    ceilingType: "grid_1200_600" as const,
  };

  const { points: badPoints, rotation } = buildTouchingRowLayout864();
  const good = placeElongatedPanelsOnModules(vertices, PPM, 15, PRODUCT, context, "grid_1200_600");
  const goodPoints = good.fixtures.map((f) => ({ x: f.x, y: f.y }));

  const goodScore = scoreDistributedFixtureLayout({
    points: goodPoints,
    rows: good.matrixRows ?? 5,
    cols: good.matrixCols ?? 3,
    rowStep: 1,
    colStep: 2,
    calculatedCount: 15,
    bounds,
    vertices,
    pixelsPerMeter: PPM,
    productId: PRODUCT,
    context,
    rotation: good.fixtures[0]?.rotation ?? rotation,
  });

  const badScore = scoreDistributedFixtureLayout({
    points: badPoints,
    rows: 3,
    cols: 5,
    rowStep: 2,
    colStep: 1,
    calculatedCount: 15,
    bounds,
    vertices,
    pixelsPerMeter: PPM,
    productId: PRODUCT,
    context,
    rotation,
  });

  assert.ok(goodScore > badScore, `good ${goodScore} vs bad ${badScore}`);
});
