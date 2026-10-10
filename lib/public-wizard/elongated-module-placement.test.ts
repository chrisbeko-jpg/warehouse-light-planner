import assert from "node:assert/strict";
import test from "node:test";
import { calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import { countAdjacentLuminaires } from "@/lib/public-wizard/luminaire-adjacency";
import { placeElongatedPanelsModuleFirst } from "@/lib/public-wizard/elongated-module-placement";
import { buildManualRoomScene } from "@/lib/public-wizard/manual-room";
import { calculateRequiredFixtureCount } from "@/lib/public-wizard/calculation";
import { placeElongatedPanelsOnModules } from "@/lib/public-wizard/matrix-placement";
import { placeFixturesWithLayoutInfo } from "@/lib/public-wizard/placement";
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
  const layout = placeElongatedPanelsModuleFirst(
    rect(8, 9),
    PPM,
    20,
    PRODUCT,
    { areaM2: 72, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
    "grid_1200_600",
  );
  assert.equal(layout.placedCount, 20);
  assertSeparated(layout);
  assert.equal(layout.matrixRows! * layout.matrixCols!, 20);

  const cols = [...new Set(layout.moduleIndices.map((m) => m.col))].sort((a, b) => a - b);
  const rows = [...new Set(layout.moduleIndices.map((m) => m.row))].sort((a, b) => a - b);
  assert.equal(cols.length, layout.matrixCols);
  assert.equal(rows.length, layout.matrixRows);
  for (let i = 1; i < cols.length; i++) {
    assert.ok(cols[i]! - cols[i - 1]! >= 2, "column modules must skip at least one module horizontally");
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
  assert.equal(layout.matrixCols, 4);
  assert.equal(layout.matrixRows, 7);
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

test("G: 600×600 panels still use distributed matrix path", () => {
  const layout = placeFixturesWithLayoutInfo(rect(8, 5), PPM, 12, "led_panel_4000", {
    areaM2: 40,
    targetLux: 500,
    ceilingHeightM: CEILING,
    ceilingType: "grid_600",
  });
  assert.equal(layout.placedCount, 12);
});
