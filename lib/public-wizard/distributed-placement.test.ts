import assert from "node:assert/strict";
import test from "node:test";
import { calculateRequiredFixtureCount } from "@/lib/public-wizard/calculation";
import { describeFixtureMatrix, getSpreadMetrics } from "@/lib/public-wizard/ceiling-grid";
import { placeElongatedPanelsOnModules } from "@/lib/public-wizard/matrix-placement";
import { placeFixturesWithLayoutInfo } from "@/lib/public-wizard/placement";
import { calculateMaterialPrice } from "@/lib/public-wizard/pricing";
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

function uniqueRounded(points: Array<{ x: number; y: number }>): number {
  return new Set(points.map((p) => `${Math.round(p.x)}:${Math.round(p.y)}`)).size;
}

test("10×7.5 m 120×60 ceiling spreads 21 elongated panels across the room", () => {
  const vertices = rect(10, 7.5);
  const areaM2 = 75;
  const productId = "led_panel_1200x300_4000" as const;
  const context = {
    areaM2,
    targetLux: 500,
    ceilingHeightM: CEILING,
    ceilingType: "grid_1200_600" as const,
  };

  const layout = placeElongatedPanelsOnModules(vertices, PPM, 21, productId, context, "grid_1200_600");
  assert.equal(layout.placedCount, 21);
  assert.equal(uniqueRounded(layout.fixtures), 21);

  const spread = getSpreadMetrics(layout.fixtures, boundsOf(vertices));
  assert.ok(spread.extentXRatio >= 0.68, `extentXRatio ${spread.extentXRatio}`);
  assert.ok(spread.extentYRatio >= 0.68, `extentYRatio ${spread.extentYRatio}`);

  const xs = [...new Set(layout.fixtures.map((f) => Math.round(f.x)))].sort((a, b) => a - b);
  const ys = [...new Set(layout.fixtures.map((f) => Math.round(f.y)))].sort((a, b) => a - b);
  if (xs.length >= 3) {
    const colGaps = xs.slice(1).map((x, i) => x - xs[i]!);
    assert.ok(Math.max(...colGaps) - Math.min(...colGaps) <= PPM * 0.6 + 2);
  }
  if (ys.length >= 3) {
    const rowGaps = ys.slice(1).map((y, i) => y - ys[i]!);
    assert.ok(Math.max(...rowGaps) - Math.min(...rowGaps) <= PPM * 0.6 + 2);
  }
});

test("10×7.5 m calculated count uses distributed module layout", () => {
  const vertices = rect(10, 7.5);
  const productId = "led_panel_1200x300_4000" as const;
  const required = calculateRequiredFixtureCount(75, 500, productId, CEILING);
  const layout = placeFixturesWithLayoutInfo(vertices, PPM, required, productId, {
    areaM2: 75,
    targetLux: 500,
    ceilingHeightM: CEILING,
    ceilingType: "grid_1200_600",
  });
  assert.ok(layout.placedCount > 0);
  const spread = getSpreadMetrics(layout.fixtures, boundsOf(vertices));
  assert.ok(spread.extentXRatio >= 0.65);
  assert.ok(spread.extentYRatio >= 0.65);
  assert.equal(uniqueRounded(layout.fixtures), layout.placedCount);
  const price = calculateMaterialPrice(layout.fixtures);
  assert.ok(price.totalEuro > 0);
});

test("8×5 m 600×600 panels spread across room", () => {
  const vertices = rect(8, 5);
  const productId = "led_panel_4000" as const;
  const required = calculateRequiredFixtureCount(40, 500, productId, CEILING);
  const layout = placeFixturesWithLayoutInfo(vertices, PPM, required, productId, {
    areaM2: 40,
    targetLux: 500,
    ceilingHeightM: CEILING,
    ceilingType: "grid_600",
  });
  assert.ok(layout.placedCount >= required - 2);
  const spread = getSpreadMetrics(layout.fixtures, boundsOf(vertices));
  const matrix = describeFixtureMatrix(layout.fixtures);
  if (matrix.rows > 1 && matrix.cols > 1) {
    assert.ok(spread.extentXRatio >= 0.55);
    assert.ok(spread.extentYRatio >= 0.55);
  } else {
    assert.ok(Math.max(spread.extentXRatio, spread.extentYRatio) >= 0.55);
  }
});
