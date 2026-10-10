import assert from "node:assert/strict";
import test from "node:test";
import { mergeWizardContent } from "@/lib/cms/merge";
import { DEFAULT_WIZARD_CONTENT } from "@/lib/cms/defaults";
import { calculateIndicativeResult, calculateRequiredFixtureCount } from "@/lib/public-wizard/calculation";
import { buildCeilingRaster, centeredModuleCentersM } from "@/lib/public-wizard/ceiling-raster";
import { describeFixtureMatrix } from "@/lib/public-wizard/ceiling-grid";
import { placeDownlightsSymmetrically, placeElongatedPanelsOnModules } from "@/lib/public-wizard/matrix-placement";
import { placeFixturesWithLayoutInfo } from "@/lib/public-wizard/placement";
import { minPanelOuterEdgeClearanceM } from "@/lib/public-wizard/placement-constraints";
import { calculateMaterialPrice } from "@/lib/public-wizard/pricing";
import { getPublicProduct, getUnitPrice, setActiveProductCatalog } from "@/lib/public-wizard/products";
import { selectConfiguredProduct } from "@/lib/public-wizard/product-selection";
import {
  buildRoomCeilingGrid,
  downlightCenterPx,
  nearestModuleIndex,
} from "@/lib/public-wizard/room-ceiling-grid";
import { getNextWizardStep } from "@/lib/public-wizard/wizard-navigation";
import type { Point2D } from "@/types/floor-plan";
import type { AtmosphereId, CeilingTypeId, PublicProductId, RoomFunctionId } from "@/types/public-wizard";

const CEILING_HEIGHT = 2.7;

function rect(lengthM: number, widthM: number, ppm = 100): Point2D[] {
  const origin = 40;
  return [
    { x: origin, y: origin },
    { x: origin + lengthM * ppm, y: origin },
    { x: origin + lengthM * ppm, y: origin + widthM * ppm },
    { x: origin, y: origin + widthM * ppm },
  ];
}

function assertAlignedMatrix(fixtures: Array<{ x: number; y: number }>) {
  const matrix = describeFixtureMatrix(fixtures);
  assert.equal(matrix.isComplete, true, `expected full matrix, got ${fixtures.length} fixtures`);
  const ys = [...new Set(fixtures.map((fixture) => Math.round(fixture.y)))].sort((a, b) => a - b);
  const xs = [...new Set(fixtures.map((fixture) => Math.round(fixture.x)))].sort((a, b) => a - b);
  for (const y of ys) {
    const row = fixtures.filter((fixture) => Math.round(fixture.y) === y);
    assert.equal(row.length, xs.length);
    assert.equal(new Set(row.map((fixture) => Math.round(fixture.x))).size, xs.length);
  }
  if (xs.length > 2) {
    const gaps = xs.slice(1).map((value, index) => value - xs[index]!);
    assert.ok(gaps.every((gap) => Math.abs(gap - gaps[0]!) < 2));
  }
  if (ys.length > 2) {
    const gaps = ys.slice(1).map((value, index) => value - ys[index]!);
    assert.ok(gaps.every((gap) => Math.abs(gap - gaps[0]!) < 2));
  }
}

test("wizard goes from atmosphere to ceiling to input", () => {
  assert.equal(getNextWizardStep("atmosphere", null), "ceiling");
  assert.equal(getNextWizardStep("ceiling", "dimensions"), "inputMethod");
  assert.equal(getNextWizardStep("ceiling", "floorplan"), "inputMethod");
});

test("room and ceiling select the configured product and price", () => {
  const cases: Array<{
    room: RoomFunctionId;
    ceiling: CeilingTypeId;
    atmosphere: AtmosphereId;
    product: PublicProductId;
    price: number;
  }> = [
    { room: "workplace_office", ceiling: "grid_600", atmosphere: "neutraal", product: "led_panel_4000", price: 50 },
    { room: "workplace_office", ceiling: "grid_600", atmosphere: "warm", product: "led_panel_3000", price: 50 },
    { room: "workplace_office", ceiling: "grid_1200_600", atmosphere: "neutraal", product: "led_panel_1200x300_4000", price: 50 },
    { room: "workplace_office", ceiling: "concrete", atmosphere: "warm", product: "led_panel_surface_3000", price: 75 },
    { room: "reception_hall", ceiling: "grid_600", atmosphere: "neutraal", product: "downlight_4000", price: 15 },
    { room: "reception_hall", ceiling: "grid_1200_600", atmosphere: "warm", product: "downlight_3000", price: 15 },
    { room: "reception_hall", ceiling: "concrete", atmosphere: "neutraal", product: "downlight_surface_4000", price: 90 },
    { room: "other_spaces", ceiling: "concrete", atmosphere: "warm", product: "downlight_surface_3000", price: 90 },
    { room: "other_spaces", ceiling: "grid_600", atmosphere: "neutraal", product: "downlight_4000", price: 15 },
  ];

  for (const item of cases) {
    const productId = selectConfiguredProduct(item.room, item.ceiling, item.atmosphere);
    assert.equal(productId, item.product);
    assert.equal(getUnitPrice(productId), item.price);
    assert.equal(getPublicProduct(productId).cct, item.atmosphere === "warm" ? 3000 : 4000);
  }
});

test("6.50 × 3.20 m reception downlights stay on one centred row when three are requested", () => {
  const lengthM = 6.5;
  const widthM = 3.2;
  const vertices = rect(lengthM, widthM);
  const areaM2 = lengthM * widthM;
  const productId = "downlight_4000" as const;
  const layout = placeDownlightsSymmetrically(vertices, 100, 3, productId, {
    areaM2,
    targetLux: 250,
    ceilingHeightM: CEILING_HEIGHT,
    ceilingType: "grid_600",
  });

  assert.equal(layout.placedCount, 3);
  assert.equal(layout.matrixRows, 1);
  assert.equal(layout.matrixCols, 3);
  assertAlignedMatrix(layout.fixtures);

  const ys = layout.fixtures.map((fixture) => fixture.y);
  assert.ok(Math.max(...ys) - Math.min(...ys) < 1);

  const xs = layout.fixtures.map((fixture) => fixture.x).sort((a, b) => a - b);
  const gaps = [xs[1]! - xs[0]!, xs[2]! - xs[1]!];
  assert.ok(Math.abs(gaps[0]! - gaps[1]!) < 1);
  assert.ok(Math.abs(gaps[0]! - 60) < 1);

  const grid = buildRoomCeilingGrid(vertices, 100, "grid_600");
  assert.ok(grid);
  for (const fixture of layout.fixtures) {
    const index = nearestModuleIndex(grid, fixture.x, fixture.y);
    assert.ok(index);
    const expected = downlightCenterPx(grid, index.col, index.row);
    assert.ok(Math.abs(fixture.x - expected.x) < 0.5);
    assert.ok(Math.abs(fixture.y - expected.y) < 0.5);
  }
});

test("6.50 × 3.20 m at 250 lux uses the product count in a symmetric matrix", () => {
  const lengthM = 6.5;
  const widthM = 3.2;
  const vertices = rect(lengthM, widthM);
  const areaM2 = lengthM * widthM;
  const productId = selectConfiguredProduct("reception_hall", "grid_600", "neutraal");
  const required = calculateRequiredFixtureCount(areaM2, 250, productId, CEILING_HEIGHT);
  const layout = placeFixturesWithLayoutInfo(vertices, 100, required, productId, {
    areaM2,
    targetLux: 250,
    ceilingHeightM: CEILING_HEIGHT,
    ceilingType: "grid_600",
  });

  assert.ok(required >= 1);
  assert.equal(layout.placedCount, layout.fixtures.length);
  assertAlignedMatrix(layout.fixtures);
  const result = calculateIndicativeResult(areaM2, 250, CEILING_HEIGHT, layout.fixtures, required);
  assert.equal(result.fixtureCount, layout.placedCount);
  if (!result.meetsTarget) {
    assert.ok(result.indicativeAverageLux < 250);
  }
});

test("concrete ceiling keeps the same row and prices surface downlights at 90 euro", () => {
  const vertices = rect(6.5, 3.2);
  const productId = selectConfiguredProduct("reception_hall", "concrete", "neutraal");
  assert.equal(productId, "downlight_surface_4000");
  const layout = placeDownlightsSymmetrically(vertices, 100, 3, productId, {
    areaM2: 20.8,
    targetLux: 250,
    ceilingHeightM: CEILING_HEIGHT,
    ceilingType: "concrete",
  });
  assert.equal(layout.matrixRows, 1);
  assert.equal(layout.matrixCols, 3);
  assertAlignedMatrix(layout.fixtures);
  const price = calculateMaterialPrice(layout.fixtures);
  assert.equal(price.totalEuro, 270);
  assert.equal(price.lines[0]?.name.includes("opbouw"), true);
});

test("1200×300 panels keep 600 mm wall clearance and do not touch", () => {
  const vertices = rect(12, 8);
  const productId = "led_panel_1200x300_4000" as const;
  const areaM2 = 96;
  const required = calculateRequiredFixtureCount(areaM2, 500, productId, CEILING_HEIGHT);
  const layout = placeElongatedPanelsOnModules(vertices, 100, required, productId, {
    areaM2,
    targetLux: 500,
    ceilingHeightM: CEILING_HEIGHT,
    ceilingType: "grid_1200_600",
  });
  assert.ok(layout.placedCount > 0);
  assertAlignedMatrix(layout.fixtures);
  const product = getPublicProduct(productId);
  for (const fixture of layout.fixtures) {
    assert.equal(fixture.rotation, 0);
    assert.ok(
      minPanelOuterEdgeClearanceM(
        { x: fixture.x, y: fixture.y },
        100,
        vertices,
        productId,
        fixture.rotation,
      ) >= 0.6 - 0.001,
    );
  }
  const xs = [...new Set(layout.fixtures.map((fixture) => fixture.x))].sort((a, b) => a - b);
  if (xs.length > 1) {
    const gapM = (xs[1]! - xs[0]!) / 100;
    assert.ok(gapM >= 1.2 - 0.02);
  }
  const price = calculateMaterialPrice(layout.fixtures);
  assert.equal(price.lines[0]?.unitEuro, 50);
});

test("60×60 raster centres the leftover strip", () => {
  const vertices = rect(6.5, 3.2);
  const raster = buildCeilingRaster(vertices, 100, "grid_600");
  assert.equal(raster.helper, false);
  assert.equal(raster.cellWidthM, 0.6);
  const vertical = raster.segments.filter((segment) => segment.x1 === segment.x2).map((segment) => segment.x1);
  vertical.sort((a, b) => a - b);
  const left = vertical[0]! - 40;
  const right = 40 + 650 - vertical[vertical.length - 1]!;
  assert.ok(Math.abs(left - right) < 1);
  assert.ok(Math.abs(left - 25) < 1);
});

test("concrete raster is marked as a helper grid", () => {
  const raster = buildCeilingRaster(rect(6.5, 3.2), 100, "concrete");
  assert.equal(raster.helper, true);
  assert.equal(raster.cellWidthM, 0.6);
});

test("120×60 modules centre inside the room", () => {
  const centers = centeredModuleCentersM(6.5, 1.2);
  assert.ok(centers.length >= 4);
  const edge = centers[0]! - 0.6;
  const farEdge = 6.5 - (centers[centers.length - 1]! + 0.6);
  assert.ok(Math.abs(edge - farEdge) < 0.001);
});

test("published CMS price overrides the catalogue price", () => {
  const base = DEFAULT_WIZARD_CONTENT.products.find((product) => product.id === "led_panel_surface_4000")!;
  const merged = mergeWizardContent({
    products: [{ ...base, unitPriceEuro: 82 }],
  });
  const saved = merged.products.find((product) => product.id === "led_panel_surface_4000")!;
  assert.equal(saved.unitPriceEuro, 82);
  assert.equal(merged.products.find((product) => product.id === "downlight_4000")?.unitPriceEuro, 15);

  setActiveProductCatalog(merged.products);
  try {
    assert.equal(getUnitPrice("led_panel_surface_4000"), 82);
    const price = calculateMaterialPrice([
      { id: "a", productId: "led_panel_surface_4000", x: 0, y: 0, rotation: 0 },
    ]);
    assert.equal(price.totalEuro, 82);
  } finally {
    setActiveProductCatalog(null);
  }
  assert.equal(getUnitPrice("led_panel_surface_4000"), 75);
});
