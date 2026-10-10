import assert from "node:assert/strict";
import test from "node:test";
import { calculateIndicativeResult, calculateRequiredFixtureCount } from "@/lib/public-wizard/calculation";
import { countAdjacentLuminaires } from "@/lib/public-wizard/luminaire-adjacency";
import { placeElongatedPanelsOnModules } from "@/lib/public-wizard/matrix-placement";
import type { Point2D } from "@/types/floor-plan";

const PPM = 100;
const CEILING = 2.7;
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

function assertSeparatedColumnLayout(
  layout: ReturnType<typeof placeElongatedPanelsOnModules>,
  expectedRows: number,
  expectedCols: number,
) {
  assert.equal(layout.placedCount, expectedRows * expectedCols);
  assert.equal(layout.matrixRows, expectedRows);
  assert.equal(layout.matrixCols, expectedCols);
  const rotation = layout.fixtures[0]?.rotation ?? 0;
  const adjacent = countAdjacentLuminaires(
    layout.fixtures.map((f) => ({ x: f.x, y: f.y })),
    PPM,
    PRODUCT,
    rotation,
  );
  assert.equal(adjacent.totalPairs, 0, `expected no touching panels, got ${adjacent.totalPairs}`);
}

test("A: 8×7 m / 18 panels → 6×3 column matrix", () => {
  const layout = placeElongatedPanelsOnModules(
    rect(8, 7),
    PPM,
    18,
    PRODUCT,
    { areaM2: 56, targetLux: 500, ceilingHeightM: CEILING, ceilingType: "grid_1200_600" },
    "grid_1200_600",
  );
  assertSeparatedColumnLayout(layout, 6, 3);
  const lux = calculateIndicativeResult(56, 500, CEILING, layout.fixtures, 18);
  assert.ok(lux.meetsTarget);
});

test("B: 8×6.4 m / 15 panels → 5×3 without adjacency", () => {
  const layout = placeElongatedPanelsOnModules(
    rect(8, 6.4),
    PPM,
    15,
    PRODUCT,
    { areaM2: 51.2, targetLux: 500, ceilingHeightM: CEILING, ceilingType: "grid_1200_600" },
    "grid_1200_600",
  );
  assertSeparatedColumnLayout(layout, 5, 3);
});

test("C: 10×7.5 m / 21 panels spreads without compact block", () => {
  const layout = placeElongatedPanelsOnModules(
    rect(10, 7.5),
    PPM,
    21,
    PRODUCT,
    { areaM2: 75, targetLux: 500, ceilingHeightM: CEILING, ceilingType: "grid_1200_600" },
    "grid_1200_600",
  );
  assert.equal(layout.placedCount, 21);
  const rotation = layout.fixtures[0]?.rotation ?? 0;
  const adjacent = countAdjacentLuminaires(
    layout.fixtures.map((f) => ({ x: f.x, y: f.y })),
    PPM,
    PRODUCT,
    rotation,
  );
  assert.equal(adjacent.totalPairs, 0);
  assert.ok((layout.matrixRows ?? 0) >= (layout.matrixCols ?? 0));
});

test("D: 12×4 m uses logical elongated matrix for calculated count", () => {
  const areaM2 = 48;
  const count = calculateRequiredFixtureCount(areaM2, 500, PRODUCT, CEILING);
  const layout = placeElongatedPanelsOnModules(
    rect(12, 4),
    PPM,
    count,
    PRODUCT,
    { areaM2, targetLux: 500, ceilingHeightM: CEILING, ceilingType: "grid_1200_600" },
    "grid_1200_600",
  );
  assert.ok(Math.abs(layout.placedCount - count) <= 3);
  assert.equal((layout.matrixRows ?? 0) * (layout.matrixCols ?? 0), layout.placedCount);
});

test("E: 6×6 m symmetric elongated placement", () => {
  const areaM2 = 36;
  const count = calculateRequiredFixtureCount(areaM2, 500, PRODUCT, CEILING);
  const layout = placeElongatedPanelsOnModules(
    rect(6, 6),
    PPM,
    count,
    PRODUCT,
    { areaM2, targetLux: 500, ceilingHeightM: CEILING, ceilingType: "grid_1200_600" },
    "grid_1200_600",
  );
  assert.ok(Math.abs(layout.placedCount - count) <= 3);
  assert.equal((layout.matrixRows ?? 0) * (layout.matrixCols ?? 0), layout.placedCount);
});
