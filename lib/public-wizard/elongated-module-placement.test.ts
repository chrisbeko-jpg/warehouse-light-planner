import assert from "node:assert/strict";
import test from "node:test";
import { calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import { countAdjacentLuminaires } from "@/lib/public-wizard/luminaire-adjacency";
import { placeElongatedPanelsModuleFirst } from "@/lib/public-wizard/elongated-module-placement";
import { minModuleIndexStepForAxis } from "@/lib/public-wizard/module-spacing";
import { buildManualRoomScene } from "@/lib/public-wizard/manual-room";
import { calculateRequiredFixtureCount } from "@/lib/public-wizard/calculation";
import { placeElongatedPanelsOnModules } from "@/lib/public-wizard/matrix-placement";
import { placeFixturesWithLayoutInfo } from "@/lib/public-wizard/placement";
import { getFixtureFootprintCorners } from "@/lib/public-wizard/placement-constraints";
import {
  buildRoomCeilingGrid,
  moduleBoundsM,
  nearestModuleIndex,
} from "@/lib/public-wizard/room-ceiling-grid";
import type { Point2D } from "@/types/floor-plan";

const PPM = 100;
const CEILING = 2.7;
const PRODUCT = "led_panel_1200x300_4000" as const;
const CTX_120 = { ceilingType: "grid_1200_600" as const };

function rect(lengthM: number, widthM: number): Point2D[] {
  const origin = 40;
  return [
    { x: origin, y: origin },
    { x: origin + lengthM * PPM, y: origin },
    { x: origin + lengthM * PPM, y: origin + widthM * PPM },
    { x: origin, y: origin + widthM * PPM },
  ];
}

function assertElongatedPanelsFlushToModuleMount(
  vertices: Point2D[],
  pixelsPerMeter: number,
  fixtures: Array<{ x: number; y: number; rotation?: number; productId: string }>,
) {
  const grid = buildRoomCeilingGrid(vertices, pixelsPerMeter, "grid_1200_600");
  assert.ok(grid);
  for (const fixture of fixtures) {
    const index = nearestModuleIndex(grid, fixture.x, fixture.y);
    assert.ok(index, "fixture should sit on a ceiling module");
    const mod = moduleBoundsM(grid, index.col, index.row);
    const rotation = fixture.rotation ?? 0;
    const corners = getFixtureFootprintCorners(
      fixture,
      pixelsPerMeter,
      PRODUCT,
      rotation,
    );
    const topM = (corners[0]!.y - grid.roomMinY) / pixelsPerMeter;
    const leftM = (corners[0]!.x - grid.roomMinX) / pixelsPerMeter;
    assert.ok(Math.abs(topM - mod.topM) < 0.02, `top mount ${topM} vs ${mod.topM}`);
    assert.ok(Math.abs(leftM - mod.leftM) < 0.02, `left mount ${leftM} vs ${mod.leftM}`);
  }
}

function assertSeparated(layout: ReturnType<typeof placeElongatedPanelsModuleFirst>) {
  assert.equal(layout.placedCount, layout.moduleIndices.length);
  const adj = countAdjacentLuminaires(
    layout.fixtures.map((f) => ({ x: f.x, y: f.y })),
    PPM,
    PRODUCT,
    layout.rotation,
  );
  assert.equal(adj.totalPairs, 0, `expected separated panels, adjacent=${adj.totalPairs}`);
}

test("D: 8×9 m / 20 panels — no vertical light bands, module indices spaced", () => {
  const vertices = rect(8, 9);
  const layout = placeElongatedPanelsModuleFirst(
    vertices,
    PPM,
    20,
    PRODUCT,
    { areaM2: 72, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
    "grid_1200_600",
  );
  assert.ok(
    layout.placedCount >= 20 && layout.placedCount <= 21,
    "may add one panel when 20× matrix cannot keep ≥40 cm wall clearance",
  );
  assertSeparated(layout);
  assert.equal(layout.matrixRows! * layout.matrixCols!, layout.placedCount);

  const cols = [...new Set(layout.moduleIndices.map((m) => m.col))].sort((a, b) => a - b);
  const rows = [...new Set(layout.moduleIndices.map((m) => m.row))].sort((a, b) => a - b);
  assert.equal(cols.length, layout.matrixCols);
  assert.equal(rows.length, layout.matrixRows);
  const grid = buildRoomCeilingGrid(vertices, PPM, "grid_1200_600");
  assert.ok(grid);
  const minColStep = minModuleIndexStepForAxis(
    PRODUCT,
    layout.fixtures[0]?.rotation ?? 0,
    "col",
    grid.cellWidthM,
    grid.cellHeightM,
  );
  const minRowStep = minModuleIndexStepForAxis(
    PRODUCT,
    layout.fixtures[0]?.rotation ?? 0,
    "row",
    grid.cellWidthM,
    grid.cellHeightM,
  );
  for (let i = 1; i < cols.length; i++) {
    assert.ok(
      cols[i]! - cols[i - 1]! >= minColStep,
      "column modules must respect minimum module step",
    );
  }
  for (let i = 1; i < rows.length; i++) {
    assert.ok(
      rows[i]! - rows[i - 1]! >= minRowStep,
      "row modules must respect minimum module step",
    );
  }

  const lux = calculateIndicativeResult(72, 500, CEILING, layout.fixtures, 20);
  assert.ok(lux.meetsTarget);
});

test("production entry placeElongatedPanelsOnModules matches module-first engine for 8×9", () => {
  const vertices = rect(8, 9);
  const ctx = { areaM2: 72, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 };
  const a = placeElongatedPanelsModuleFirst(vertices, PPM, 20, PRODUCT, ctx, "grid_1200_600");
  const b = placeElongatedPanelsOnModules(vertices, PPM, 20, PRODUCT, ctx, "grid_1200_600");
  assert.equal(a.placedCount, b.placedCount);
  assert.equal(a.matrixRows, b.matrixRows);
  assert.equal(a.matrixCols, b.matrixCols);
});

test("A: 8×6.4 m / 15 panels separated", () => {
  const layout = placeElongatedPanelsOnModules(
    rect(8, 6.4),
    PPM,
    15,
    PRODUCT,
    { areaM2: 51.2, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
    "grid_1200_600",
  );
  assert.equal(layout.placedCount, 15);
  const adj = countAdjacentLuminaires(
    layout.fixtures.map((f) => ({ x: f.x, y: f.y })),
    PPM,
    PRODUCT,
    layout.fixtures[0]?.rotation ?? 0,
  );
  assert.equal(adj.totalPairs, 0);
});

test("B: 8×7 m / 18 panels separated", () => {
  const layout = placeElongatedPanelsOnModules(
    rect(8, 7),
    PPM,
    18,
    PRODUCT,
    { areaM2: 56, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
    "grid_1200_600",
  );
  assert.equal(layout.placedCount, 18);
  const adj = countAdjacentLuminaires(
    layout.fixtures.map((f) => ({ x: f.x, y: f.y })),
    PPM,
    PRODUCT,
    layout.fixtures[0]?.rotation ?? 0,
  );
  assert.equal(adj.totalPairs, 0);
});

test("8×5 m / 12 panels — 3×4 matrix, no edge columns", () => {
  const layout = placeElongatedPanelsOnModules(
    rect(8, 5),
    PPM,
    12,
    PRODUCT,
    { areaM2: 40, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
    "grid_1200_600",
  );
  assert.equal(layout.placedCount, 12);
  assert.equal(layout.matrixCols, 3, "expected 3 columns");
  assert.equal(layout.matrixRows, 4, "expected 4 rows");
  assertSeparated(layout);
  const cols = [...new Set(layout.moduleIndices.map((m) => m.col))];
  assert.equal(cols.length, 3);
  assert.ok(cols[1]! > cols[0]! + 0 && cols[2]! > cols[1]! + 0);
});

test("8×5 m manual scene matches 3×4 for calculated count", () => {
  const scene = buildManualRoomScene({ lengthM: 8, widthM: 5 });
  const count = calculateRequiredFixtureCount(scene.areaM2, 500, PRODUCT, CEILING);
  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    PRODUCT,
    { areaM2: scene.areaM2, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
  );
  assert.equal(layout.matrixCols, 3);
  assert.equal(layout.matrixRows, 4);
});

test("8×7 m / 18 panels — 3×6 separated (6 rows × 3 cols)", () => {
  const layout = placeElongatedPanelsOnModules(
    rect(8, 7),
    PPM,
    18,
    PRODUCT,
    { areaM2: 56, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
    "grid_1200_600",
  );
  assert.equal(layout.placedCount, 18);
  assert.equal(layout.matrixCols, 3);
  assert.equal(layout.matrixRows, 6);
  assert.equal(layout.fixtures[0]?.rotation ?? 0, 0);
  const adj = countAdjacentLuminaires(
    layout.fixtures.map((f) => ({ x: f.x, y: f.y })),
    PPM,
    PRODUCT,
    layout.fixtures[0]?.rotation ?? 0,
  );
  assert.equal(adj.totalPairs, 0);
});

test("8×12 m / 27 calculated — prefers balanced 4×7 over 3×9", () => {
  const scene = buildManualRoomScene({ lengthM: 8, widthM: 12 });
  const count = calculateRequiredFixtureCount(scene.areaM2, 500, PRODUCT, CEILING);
  assert.equal(count, 27);
  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    PRODUCT,
    { areaM2: scene.areaM2, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
  );
  assert.ok(layout.placedCount >= 27 && layout.placedCount <= 30);
  assert.ok(layout.matrixCols! >= 7 || layout.matrixRows! >= 4);
  assert.equal(layout.fixtures[0]?.rotation, 90);
  const adj = countAdjacentLuminaires(
    layout.fixtures.map((f) => ({ x: f.x, y: f.y })),
    scene.pixelsPerMeter,
    PRODUCT,
    layout.fixtures[0]?.rotation ?? 0,
  );
  assert.equal(adj.totalPairs, 0);
});

test("10×12 m calculated count uses balanced elongated matrix", () => {
  const scene = buildManualRoomScene({ lengthM: 10, widthM: 12 });
  const count = calculateRequiredFixtureCount(scene.areaM2, 500, PRODUCT, CEILING);
  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    PRODUCT,
    { areaM2: scene.areaM2, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
  );
  assert.ok(layout.placedCount >= count);
  assert.ok(layout.matrixCols! >= 3);
  assert.ok(layout.matrixRows! >= 3);
});

test("12×15 m calculated count uses scalable balanced matrix", () => {
  const scene = buildManualRoomScene({ lengthM: 12, widthM: 15 });
  const count = calculateRequiredFixtureCount(scene.areaM2, 500, PRODUCT, CEILING);
  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    PRODUCT,
    { areaM2: scene.areaM2, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
  );
  assert.ok(layout.placedCount >= count);
  assert.equal(countAdjacentLuminaires(
    layout.fixtures.map((f) => ({ x: f.x, y: f.y })),
    scene.pixelsPerMeter,
    PRODUCT,
    layout.fixtures[0]?.rotation ?? 0,
  ).totalPairs, 0);
  const cols = layout.matrixCols ?? 0;
  const rows = layout.matrixRows ?? 0;
  assert.ok(cols >= 3 && rows >= 3);
  assert.ok(Math.abs(cols - rows) <= Math.max(cols, rows) - 2);
});

test("15×20 m calculated count uses scalable balanced matrix", () => {
  const scene = buildManualRoomScene({ lengthM: 15, widthM: 20 });
  const count = calculateRequiredFixtureCount(scene.areaM2, 500, PRODUCT, CEILING);
  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    PRODUCT,
    { areaM2: scene.areaM2, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
  );
  assert.ok(layout.placedCount >= count);
  assert.equal(countAdjacentLuminaires(
    layout.fixtures.map((f) => ({ x: f.x, y: f.y })),
    scene.pixelsPerMeter,
    PRODUCT,
    layout.fixtures[0]?.rotation ?? 0,
  ).totalPairs, 0);
});

test("A: 8×8,5 m / 20 panels — 4×5 matrix with flush 120×30 mount", () => {
  const scene = buildManualRoomScene({ lengthM: 8, widthM: 8.5 });
  const count = calculateRequiredFixtureCount(scene.areaM2, 500, PRODUCT, CEILING);
  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    PRODUCT,
    { areaM2: scene.areaM2, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
  );
  assert.ok(layout.placedCount >= 19 && layout.placedCount <= 21);
  assert.ok(layout.matrixCols! * layout.matrixRows! >= 19);
  assert.equal(layout.fixtures[0]?.rotation, 90);
  assertElongatedPanelsFlushToModuleMount(scene.vertices, scene.pixelsPerMeter, layout.fixtures);
});

test("B: 8×7 m / 18 panels — matrix unchanged with profile alignment", () => {
  const layout = placeElongatedPanelsOnModules(
    rect(8, 7),
    PPM,
    18,
    PRODUCT,
    { areaM2: 56, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
    "grid_1200_600",
  );
  assert.equal(layout.matrixCols, 3);
  assert.equal(layout.matrixRows, 6);
  assert.equal(layout.placedCount, 18);
  assertElongatedPanelsFlushToModuleMount(rect(8, 7), PPM, layout.fixtures);
});

test("C: 8×12 m / 27+ panels — large matrix with profile alignment", () => {
  const scene = buildManualRoomScene({ lengthM: 8, widthM: 12 });
  const count = calculateRequiredFixtureCount(scene.areaM2, 500, PRODUCT, CEILING);
  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    PRODUCT,
    { areaM2: scene.areaM2, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
  );
  assert.ok(layout.placedCount >= count);
  assert.ok(layout.placedCount <= count + 3);
  assertElongatedPanelsFlushToModuleMount(scene.vertices, scene.pixelsPerMeter, layout.fixtures);
});

test("G: 600×600 panels still use distributed matrix path", () => {
  const layout = placeFixturesWithLayoutInfo(rect(8, 5), PPM, 12, "led_panel_4000", {
    areaM2: 40,
    targetLux: 500,
    ceilingHeightM: CEILING,
    ceilingType: "grid_600",
  });
  assert.equal(layout.placedCount, 12);
});
