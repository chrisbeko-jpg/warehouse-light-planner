import assert from "node:assert/strict";
import test from "node:test";
import { calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import { countAdjacentLuminaires } from "@/lib/public-wizard/luminaire-adjacency";
import { placeElongatedPanelsModuleFirst } from "@/lib/public-wizard/elongated-module-placement";
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

test("G: 600×600 panels still use distributed matrix path", () => {
  const layout = placeFixturesWithLayoutInfo(rect(8, 5), PPM, 12, "led_panel_4000", {
    areaM2: 40,
    targetLux: 500,
    ceilingHeightM: CEILING,
    ceilingType: "grid_600",
  });
  assert.equal(layout.placedCount, 12);
});
