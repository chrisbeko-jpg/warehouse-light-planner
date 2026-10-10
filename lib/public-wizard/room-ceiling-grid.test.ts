import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildRoomCeilingGrid,
  downlightCenterPx,
  elongatedPanelCenterPx,
  fixtureCenterForModule,
  gridPanelCenterPx,
  moduleBoundsM,
  moduleCornersPx,
  nearestModuleIndex,
  snapPointToModule,
} from "@/lib/public-wizard/room-ceiling-grid";
import { getFixtureFootprintCorners } from "@/lib/public-wizard/placement-constraints";

function rect(lengthM: number, widthM: number, ppm = 100, ox = 40, oy = 40) {
  return [
    { x: ox, y: oy },
    { x: ox + lengthM * ppm, y: oy },
    { x: ox + lengthM * ppm, y: oy + widthM * ppm },
    { x: ox, y: oy + widthM * ppm },
  ];
}

test("600×600 panel bounds match module bounds on grid_600", () => {
  const vertices = rect(8, 5);
  const grid = buildRoomCeilingGrid(vertices, 100, "grid_600");
  assert.ok(grid);
  const col = 2;
  const row = 1;
  const center = gridPanelCenterPx(grid, col, row);
  const corners = getFixtureFootprintCorners(center, 100, "led_panel_4000", 0);
  const moduleCorners = moduleCornersPx(grid, col, row);
  for (let index = 0; index < 4; index++) {
    assert.ok(Math.abs(corners[index]!.x - moduleCorners[index]!.x) < 0.5);
    assert.ok(Math.abs(corners[index]!.y - moduleCorners[index]!.y) < 0.5);
  }
});

test("downlight sits at module centre for 600×600 and 1200×600 grids", () => {
  const grid600 = buildRoomCeilingGrid(rect(6.5, 3.2), 100, "grid_600");
  assert.ok(grid600);
  const center600 = downlightCenterPx(grid600, 1, 0);
  const bounds600 = moduleBoundsM(grid600, 1, 0);
  assert.ok(Math.abs(center600.x - (40 + (bounds600.leftM + 0.3) * 100)) < 0.5);
  assert.ok(Math.abs(center600.y - (40 + (bounds600.topM + 0.3) * 100)) < 0.5);

  const grid1200 = buildRoomCeilingGrid(rect(8, 5), 100, "grid_1200_600");
  assert.ok(grid1200);
  const center1200 = downlightCenterPx(grid1200, 0, 0);
  const bounds1200 = moduleBoundsM(grid1200, 0, 0);
  assert.ok(Math.abs(center1200.x - (40 + (bounds1200.leftM + 0.6) * 100)) < 0.5);
  assert.ok(Math.abs(center1200.y - (40 + (bounds1200.topM + 0.3) * 100)) < 0.5);
});

test("1200×300 panel aligns to module long edge start", () => {
  const vertices = rect(8, 5);
  const grid = buildRoomCeilingGrid(vertices, 100, "grid_1200_600");
  assert.ok(grid);
  const center = elongatedPanelCenterPx(grid, 1, 1, "led_panel_1200x300_4000", 0);
  const bounds = moduleBoundsM(grid, 1, 1);
  const leftPx = 40 + bounds.leftM * 100;
  const topPx = 40 + bounds.topM * 100;
  assert.ok(Math.abs(center.x - (leftPx + 60)) < 0.5);
  assert.ok(Math.abs(center.y - (topPx + 15)) < 0.5);
});

test("snapPointToModule picks nearest module centre", () => {
  const vertices = rect(8, 5);
  const grid = buildRoomCeilingGrid(vertices, 100, "grid_600");
  assert.ok(grid);
  const target = gridPanelCenterPx(grid, 3, 2);
  const snapped = snapPointToModule(grid, target.x + 8, target.y + 6, "led_panel_4000", 0);
  assert.ok(snapped);
  assert.ok(Math.abs(snapped.x - target.x) < 0.5);
  assert.ok(Math.abs(snapped.y - target.y) < 0.5);
  const index = nearestModuleIndex(grid, snapped.x, snapped.y);
  assert.deepEqual(index, { col: 3, row: 2 });
});

test("raster and fixture placement share the same module centre", () => {
  const vertices = rect(8, 5);
  const grid = buildRoomCeilingGrid(vertices, 100, "grid_600");
  assert.ok(grid);
  const fromHelper = fixtureCenterForModule(grid, 2, 2, "downlight_4000", 0);
  const fromDownlight = downlightCenterPx(grid, 2, 2);
  assert.equal(fromHelper.x, fromDownlight.x);
  assert.equal(fromHelper.y, fromDownlight.y);
});
