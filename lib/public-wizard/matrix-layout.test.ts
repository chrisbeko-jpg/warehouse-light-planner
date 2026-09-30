import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateIndicativeResult,
  calculateRequiredFixtureCount,
} from "@/lib/public-wizard/calculation";
import {
  describeFixtureMatrix,
  placePanelsOnCeilingGrid,
} from "@/lib/public-wizard/ceiling-grid";
import { calculateMaterialPrice } from "@/lib/public-wizard/pricing";
import { minPanelOuterEdgeClearanceM } from "@/lib/public-wizard/placement-constraints";
import type { Point2D } from "@/types/floor-plan";

const PRODUCT = "led_panel_4000" as const;
const CEILING = 2.7;

function rect(originX: number, originY: number, lengthM: number, widthM: number, ppm: number): Point2D[] {
  const w = lengthM * ppm;
  const h = widthM * ppm;
  return [
    { x: originX, y: originY },
    { x: originX + w, y: originY },
    { x: originX + w, y: originY + h },
    { x: originX, y: originY + h },
  ];
}

function assertCompleteMatrix(
  vertices: Point2D[],
  ppm: number,
  fixtures: Array<{ x: number; y: number }>,
) {
  const matrix = describeFixtureMatrix(fixtures);
  assert.equal(matrix.isComplete, true, `expected full matrix, got ${matrix.rows}×${matrix.cols} for ${fixtures.length} panels`);
  for (const fixture of fixtures) {
    assert.ok(
      minPanelOuterEdgeClearanceM({ x: fixture.x, y: fixture.y }, ppm, vertices, PRODUCT) >=
        0.6 - 0.001,
    );
  }
}

function layoutForRoom(
  lengthM: number,
  widthM: number,
  targetLux: number,
  ppm = 100,
) {
  const vertices = rect(50, 50, lengthM, widthM, ppm);
  const areaM2 = lengthM * widthM;
  const required = calculateRequiredFixtureCount(areaM2, targetLux, PRODUCT, CEILING);
  const layout = placePanelsOnCeilingGrid(vertices, ppm, required, PRODUCT, {
    areaM2,
    targetLux,
    ceilingHeightM: CEILING,
  });
  return { vertices, areaM2, required, layout, ppm };
}

test("7,65 × 6,30 m at 500 lux prefers a full 4×4 matrix over 14 incomplete panels", () => {
  const { vertices, areaM2, required, layout, ppm } = layoutForRoom(7.65, 6.3, 500);
  assert.ok(required >= 12 && required <= 16);
  assertCompleteMatrix(vertices, ppm, layout.fixtures);
  const matrix = describeFixtureMatrix(layout.fixtures);
  assert.equal(matrix.rows, 4);
  assert.equal(matrix.cols, 4);
  assert.equal(layout.placedCount, 16);
  assert.ok(layout.placedCount >= required);

  const result = calculateIndicativeResult(areaM2, 500, CEILING, layout.fixtures, required);
  assert.equal(result.fixtureCount, 16);
  assert.ok(result.indicativeAverageLux >= 500 * 0.95);

  const price = calculateMaterialPrice(layout.fixtures);
  assert.equal(price.totalEuro, 16 * 50);
});

test("8 × 5 m uses complete matrices for 200, 250 and 500 lux", () => {
  for (const lux of [200, 250, 500] as const) {
    const { vertices, layout, ppm } = layoutForRoom(8, 5, lux);
    assertCompleteMatrix(vertices, ppm, layout.fixtures);
    assert.ok(layout.placedCount >= layout.requestedCount - 1);
  }
});

test("5 × 5 m square room yields a square matrix", () => {
  const { vertices, layout, ppm } = layoutForRoom(5, 5, 500);
  assertCompleteMatrix(vertices, ppm, layout.fixtures);
  const matrix = describeFixtureMatrix(layout.fixtures);
  assert.equal(matrix.rows, matrix.cols);
});

test("12 × 4 m narrow room matrix follows room aspect", () => {
  const { vertices, layout, ppm } = layoutForRoom(12, 4, 500);
  assertCompleteMatrix(vertices, ppm, layout.fixtures);
  const matrix = describeFixtureMatrix(layout.fixtures);
  assert.ok(matrix.cols >= matrix.rows);
});

test("4 × 3 m small room does not force oversized matrix", () => {
  const { vertices, areaM2, required, layout, ppm } = layoutForRoom(4, 3, 500);
  assertCompleteMatrix(vertices, ppm, layout.fixtures);
  assert.ok(layout.placedCount <= Math.ceil(required * 1.28));
  const result = calculateIndicativeResult(areaM2, 500, CEILING, layout.fixtures, required);
  assert.ok(result.indicativeAverageLux > 0);
});

test("required 9 prefers 3×3 over 4×4", () => {
  const vertices = rect(50, 50, 8, 5, 100);
  const areaM2 = 40;
  const layout = placePanelsOnCeilingGrid(vertices, 100, 9, PRODUCT, {
    areaM2,
    targetLux: 500,
    ceilingHeightM: CEILING,
  });
  const matrix = describeFixtureMatrix(layout.fixtures);
  assert.equal(matrix.rows * matrix.cols, 9);
});
