import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateIndicativeResult,
  calculateRequiredFixtureCount,
} from "@/lib/public-wizard/calculation";
import {
  chooseBestMatrix,
  describeFixtureMatrix,
  getSpreadMetrics,
  placePanelsOnCeilingGrid,
} from "@/lib/public-wizard/ceiling-grid";
import { calculateMaterialPrice } from "@/lib/public-wizard/pricing";
import { isPanelFootprintInsideRoom } from "@/lib/public-wizard/placement-constraints";
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

function boundsOf(vertices: Point2D[]) {
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function assertSpreadLayout(vertices: Point2D[], ppm: number, fixtures: Array<{ x: number; y: number }>) {
  assert.ok(fixtures.length > 0);
  for (const fixture of fixtures) {
    assert.ok(
      isPanelFootprintInsideRoom({ x: fixture.x, y: fixture.y }, ppm, vertices, PRODUCT),
      "panel footprint must stay inside room",
    );
  }
  const spread = getSpreadMetrics(fixtures, boundsOf(vertices));
  const matrix = describeFixtureMatrix(fixtures);
  if (matrix.rows <= 1) {
    assert.ok(spread.extentXRatio >= 0.45, `extentX ${spread.extentXRatio}`);
  } else if (matrix.cols <= 1) {
    assert.ok(spread.extentYRatio >= 0.45, `extentY ${spread.extentYRatio}`);
  } else {
    assert.ok(spread.extentXRatio >= 0.45, `extentX ${spread.extentXRatio}`);
    assert.ok(spread.extentYRatio >= 0.45, `extentY ${spread.extentYRatio}`);
  }
}

function layoutForRoom(lengthM: number, widthM: number, targetLux: number, ppm = 100) {
  const vertices = rect(50, 50, lengthM, widthM, ppm);
  const areaM2 = lengthM * widthM;
  const required = calculateRequiredFixtureCount(areaM2, targetLux, PRODUCT, CEILING);
  const layout = placePanelsOnCeilingGrid(vertices, ppm, required, PRODUCT, {
    areaM2,
    targetLux,
    ceilingHeightM: CEILING,
    ceilingType: "grid_600",
  });
  return { vertices, areaM2, required, layout, ppm };
}

test("7,65 × 6,30 m at 500 lux places required count with room-wide spread", () => {
  const { vertices, areaM2, required, layout, ppm } = layoutForRoom(7.65, 6.3, 500);
  assert.ok(required >= 12 && required <= 16);
  assertSpreadLayout(vertices, ppm, layout.fixtures);
  assert.equal(layout.placedCount, required);
  const result = calculateIndicativeResult(areaM2, 500, CEILING, layout.fixtures, required);
  assert.equal(result.fixtureCount, required);
  const price = calculateMaterialPrice(layout.fixtures);
  assert.equal(price.totalEuro, required * 50);
});

test("7,65 × 6,30 with 16 panels spreads across the ceiling", () => {
  const vertices = rect(50, 50, 7.65, 6.3, 100);
  const areaM2 = 7.65 * 6.3;
  const layout = placePanelsOnCeilingGrid(vertices, 100, 16, PRODUCT, {
    areaM2,
    targetLux: 500,
    ceilingHeightM: CEILING,
    ceilingType: "grid_600",
  });
  assertSpreadLayout(vertices, 100, layout.fixtures);
  assert.equal(layout.placedCount, 16);
  const matrix = describeFixtureMatrix(layout.fixtures);
  assert.equal(matrix.panelCount, 16);
});

test("8 × 5 with 12 panels uses exact count with spread", () => {
  const vertices = rect(50, 50, 8, 5, 100);
  const layout = placePanelsOnCeilingGrid(vertices, 100, 12, PRODUCT, {
    areaM2: 40,
    targetLux: 500,
    ceilingHeightM: CEILING,
    ceilingType: "grid_600",
  });
  assertSpreadLayout(vertices, 100, layout.fixtures);
  assert.equal(layout.placedCount, 12);
});

test("chooseBestMatrix prefers 4×4 for 16 panels in nearly square room", () => {
  const first = chooseBestMatrix(16, 7.65, 6.3)[0]!;
  assert.equal(first.rows, 4);
  assert.equal(first.cols, 4);
});

test("8 × 5 m uses spread layouts for 200, 250 and 500 lux", () => {
  for (const lux of [200, 250, 500] as const) {
    const { vertices, layout, ppm, required } = layoutForRoom(8, 5, lux);
    assertSpreadLayout(vertices, ppm, layout.fixtures);
    assert.equal(layout.placedCount, required);
  }
});

test("5 × 5 m square room spreads fixtures with balanced margins", () => {
  const { vertices, layout, ppm } = layoutForRoom(5, 5, 500);
  assertSpreadLayout(vertices, ppm, layout.fixtures);
  const spread = getSpreadMetrics(layout.fixtures, boundsOf(vertices));
  assert.ok(Math.abs(spread.leftMarginPx - spread.rightMarginPx) < spread.leftMarginPx * 0.6 + 50);
});

test("12 × 4 m narrow room spreads along the long axis", () => {
  const { vertices, layout, ppm } = layoutForRoom(12, 4, 500);
  assertSpreadLayout(vertices, ppm, layout.fixtures);
  const spread = getSpreadMetrics(layout.fixtures, boundsOf(vertices));
  assert.ok(spread.extentXRatio >= spread.extentYRatio);
});

test("4 × 3 m small room does not force oversized matrix", () => {
  const { vertices, areaM2, required, layout, ppm } = layoutForRoom(4, 3, 500);
  assertSpreadLayout(vertices, ppm, layout.fixtures);
  assert.ok(layout.placedCount <= Math.ceil(required * 1.05));
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
    ceilingType: "grid_600",
  });
  assert.equal(layout.placedCount, 9);
  const matrix = describeFixtureMatrix(layout.fixtures);
  assert.equal(matrix.panelCount, 9);
});
