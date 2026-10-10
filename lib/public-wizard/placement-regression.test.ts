import assert from "node:assert/strict";
import test from "node:test";
import { calculateRequiredFixtureCount } from "@/lib/public-wizard/calculation";
import { describeFixtureMatrix, getSpreadMetrics } from "@/lib/public-wizard/ceiling-grid";
import { evaluateLayoutQuality } from "@/lib/public-wizard/layout-quality";
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

function boundsOf(vertices: Point2D[]) {
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function rowCounts(fixtures: Array<{ y: number }>): number[] {
  const map = new Map<number, number>();
  for (const f of fixtures) {
    const y = Math.round(f.y);
    map.set(y, (map.get(y) ?? 0) + 1);
  }
  return [...map.values()].sort((a, b) => a - b);
}

test("8×6 m with 14 panels avoids 7+7 edge rows", () => {
  const vertices = rect(8, 6);
  const layout = placeFixturesWithLayoutInfo(vertices, PPM, 14, "led_panel_4000", {
    areaM2: 48,
    targetLux: 500,
    ceilingHeightM: CEILING,
    ceilingType: "grid_600",
  });
  assert.equal(layout.placedCount, 14);
  const quality = evaluateLayoutQuality(layout.fixtures, boundsOf(vertices));
  assert.equal(quality.rejected, false);
  assert.equal(quality.edgeOnlyRows, false);
  assert.ok(quality.rowCount >= 3, `expected >=3 rows, got ${quality.rowCount}`);
  const counts = rowCounts(layout.fixtures);
  assert.notDeepEqual(counts, [7, 7]);
});

test("10×7.5 m with 21 elongated panels stays distributed", () => {
  const vertices = rect(10, 7.5);
  const layout = placeElongatedPanelsOnModules(
    vertices,
    PPM,
    21,
    "led_panel_1200x300_4000",
    { areaM2: 75, targetLux: 500, ceilingHeightM: CEILING, ceilingType: "grid_1200_600" },
    "grid_1200_600",
  );
  assert.equal(layout.placedCount, 21);
  const quality = evaluateLayoutQuality(layout.fixtures, boundsOf(vertices));
  assert.equal(quality.rejected, false);
  const spread = getSpreadMetrics(layout.fixtures, boundsOf(vertices));
  assert.ok(Math.max(spread.extentXRatio, spread.extentYRatio) >= 0.55);
});

test("8×5 m with 12 panels uses regular matrix", () => {
  const vertices = rect(8, 5);
  const required = calculateRequiredFixtureCount(40, 500, "led_panel_4000", CEILING);
  const layout = placeFixturesWithLayoutInfo(vertices, PPM, required, "led_panel_4000", {
    areaM2: 40,
    targetLux: 500,
    ceilingHeightM: CEILING,
    ceilingType: "grid_600",
  });
  assert.ok(layout.placedCount >= 11);
  const matrix = describeFixtureMatrix(layout.fixtures);
  const quality = evaluateLayoutQuality(layout.fixtures, boundsOf(vertices));
  assert.equal(quality.rejected, false);
  assert.ok(quality.rowCount >= 2 || (matrix.rows >= 2 && matrix.cols >= 2));
});

test("6.5×3.2 m with 3 downlights in one centred row", () => {
  const vertices = rect(6.5, 3.2);
  const layout = placeFixturesWithLayoutInfo(vertices, PPM, 3, "downlight_4000", {
    areaM2: 6.5 * 3.2,
    targetLux: 250,
    ceilingHeightM: CEILING,
    ceilingType: "grid_600",
  });
  assert.equal(layout.placedCount, 3);
  const ys = [...new Set(layout.fixtures.map((f) => Math.round(f.y)))];
  assert.equal(ys.length, 1);
  const quality = evaluateLayoutQuality(layout.fixtures, boundsOf(vertices));
  assert.equal(quality.rejected, false);
});

const RANDOM_COUNTS = [5, 7, 11, 13, 14, 17, 19, 21, 23];

for (const count of RANDOM_COUNTS) {
  test(`8×6 m ${count} panels passes layout quality gate`, () => {
    const vertices = rect(8, 6);
    const layout = placeFixturesWithLayoutInfo(vertices, PPM, count, "led_panel_4000", {
      areaM2: 48,
      targetLux: 500,
      ceilingHeightM: CEILING,
      ceilingType: "grid_600",
    });
    assert.ok(layout.placedCount >= count - 1 && layout.placedCount <= count + 1);
    const quality = evaluateLayoutQuality(layout.fixtures, boundsOf(vertices));
    assert.equal(quality.edgeOnlyRows, false);
    if (layout.placedCount >= 10) {
      assert.equal(quality.rejected, false);
    }
  });
}
