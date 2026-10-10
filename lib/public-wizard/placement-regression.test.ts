import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateIndicativeResult,
  calculateRequiredFixtureCount,
} from "@/lib/public-wizard/calculation";
import { describeFixtureMatrix } from "@/lib/public-wizard/ceiling-grid";
import { isCompleteRectangularMatrix } from "@/lib/public-wizard/layout-quality";
import { placeFixturesWithLayoutInfo } from "@/lib/public-wizard/placement";
import { placeElongatedPanelsOnModules } from "@/lib/public-wizard/matrix-placement";
import type { Point2D } from "@/types/floor-plan";

const PPM = 100;
const CEILING = 2.7;

function rect(lengthM: number, widthM: number): Point2D[] {
  const origin = 40;
  return [
    { x: origin, y: origin },
    { x: origin + lengthM * PPM, y: origin },
    { x: origin + lengthM * PPM, y: origin + widthM * PPM },
    { x: origin, y: origin + widthM * PPM },
  ];
}

function assertCompleteMatrix(fixtures: Array<{ x: number; y: number }>) {
  assert.equal(isCompleteRectangularMatrix(fixtures), true);
  const matrix = describeFixtureMatrix(fixtures);
  assert.equal(matrix.isComplete, true);
  assert.equal(matrix.panelCount, matrix.rows * matrix.cols);
}

test("A: 8×7 m with 16 panels forms a 4×4 matrix", () => {
  const vertices = rect(8, 7);
  const layout = placeFixturesWithLayoutInfo(vertices, PPM, 16, "led_panel_4000", {
    areaM2: 56,
    targetLux: 500,
    ceilingHeightM: CEILING,
    ceilingType: "grid_600",
  });
  assert.equal(layout.placedCount, 16);
  assertCompleteMatrix(layout.fixtures);
  const matrix = describeFixtureMatrix(layout.fixtures);
  assert.equal(matrix.rows, 4);
  assert.equal(matrix.cols, 4);
});

test("B: 8×7 m calculated count picks a full matrix meeting lux", () => {
  const vertices = rect(8, 7);
  const areaM2 = 56;
  const calculated = calculateRequiredFixtureCount(areaM2, 500, "led_panel_4000", CEILING);
  const layout = placeFixturesWithLayoutInfo(vertices, PPM, calculated, "led_panel_4000", {
    areaM2,
    targetLux: 500,
    ceilingHeightM: CEILING,
    ceilingType: "grid_600",
  });
  assertCompleteMatrix(layout.fixtures);
  assert.ok(Math.abs(layout.placedCount - calculated) <= 3);
  const lux = calculateIndicativeResult(areaM2, 500, CEILING, layout.fixtures, calculated);
  assert.ok(lux.meetsTarget);
});

test("C: 10×7.5 m with 21 calculated uses a complete elongated matrix", () => {
  const vertices = rect(10, 7.5);
  const areaM2 = 75;
  const calculated = 21;
  const layout = placeElongatedPanelsOnModules(
    vertices,
    PPM,
    calculated,
    "led_panel_1200x300_4000",
    { areaM2, targetLux: 500, ceilingHeightM: CEILING, ceilingType: "grid_1200_600" },
    "grid_1200_600",
  );
  assertCompleteMatrix(layout.fixtures);
  assert.ok(Math.abs(layout.placedCount - calculated) <= 3);
});

test("D: 8×6 m calculated 14 compares nearby full matrices", () => {
  const vertices = rect(8, 6);
  const areaM2 = 48;
  const calculated = calculateRequiredFixtureCount(areaM2, 500, "led_panel_4000", CEILING);
  const layout = placeFixturesWithLayoutInfo(vertices, PPM, calculated, "led_panel_4000", {
    areaM2,
    targetLux: 500,
    ceilingHeightM: CEILING,
    ceilingType: "grid_600",
  });
  assertCompleteMatrix(layout.fixtures);
  assert.ok(layout.placedCount >= calculated - 3 && layout.placedCount <= calculated + 3);
  const lux = calculateIndicativeResult(areaM2, 500, CEILING, layout.fixtures, calculated);
  assert.ok(lux.meetsTarget);
  const matrix = describeFixtureMatrix(layout.fixtures);
  assert.ok(!(matrix.rows === 2 && matrix.cols >= 6));
});

test("E: 6.5×3.2 m downlights in one straight row", () => {
  const vertices = rect(6.5, 3.2);
  const layout = placeFixturesWithLayoutInfo(vertices, PPM, 3, "downlight_4000", {
    areaM2: 6.5 * 3.2,
    targetLux: 250,
    ceilingHeightM: CEILING,
    ceilingType: "grid_600",
  });
  assert.equal(layout.placedCount, 3);
  assertCompleteMatrix(layout.fixtures);
  assert.equal(describeFixtureMatrix(layout.fixtures).rows, 1);
});

test("F: 1200×300 panels stay on grid with complete matrix", () => {
  const vertices = rect(10, 7.5);
  const layout = placeElongatedPanelsOnModules(
    vertices,
    PPM,
    20,
    "led_panel_1200x300_4000",
    { areaM2: 75, targetLux: 500, ceilingHeightM: CEILING, ceilingType: "grid_1200_600" },
    "grid_1200_600",
  );
  assertCompleteMatrix(layout.fixtures);
  assert.equal(layout.placedCount, 20);
  assert.equal(describeFixtureMatrix(layout.fixtures).rows * describeFixtureMatrix(layout.fixtures).cols, 20);
});
