import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateIndicativeResult,
  calculateRequiredFixtureCount,
} from "@/lib/public-wizard/calculation";
import {
  buildValidGridCenters,
  placePanelsOnCeilingGrid,
} from "@/lib/public-wizard/ceiling-grid";
import { CEILING_GRID_M } from "@/lib/public-wizard/grid";
import {
  findFreeGridPosition,
  placeFixturesInPolygon,
  snapFixtureCenter,
} from "@/lib/public-wizard/placement";
import {
  isPanelPlacementValid,
  minPanelOuterEdgeClearanceM,
} from "@/lib/public-wizard/placement-constraints";
import type { Point2D } from "@/types/floor-plan";

const PPM = 100;
const PRODUCT = "led_panel_4000" as const;
const MIN_EDGE_M = 0.6;

function rectPolygon(originX: number, originY: number, widthM: number, heightM: number): Point2D[] {
  const w = widthM * PPM;
  const h = heightM * PPM;
  return [
    { x: originX, y: originY },
    { x: originX + w, y: originY },
    { x: originX + w, y: originY + h },
    { x: originX, y: originY + h },
  ];
}

function assertAllPanelsClearWalls(vertices: Point2D[], fixtures: { x: number; y: number }[]) {
  for (const fixture of fixtures) {
    const center = { x: fixture.x, y: fixture.y };
    assert.equal(isPanelPlacementValid(center, PPM, vertices, PRODUCT), true);
    assert.ok(
      minPanelOuterEdgeClearanceM(center, PPM, vertices, PRODUCT) >= MIN_EDGE_M - 0.001,
    );
  }
}

test("8 × 5 m room keeps every panel at least 600 mm from walls", () => {
  const vertices = rectPolygon(50, 50, 8, 5);
  const required = calculateRequiredFixtureCount(40, 500, PRODUCT, 2.7);
  const layout = placePanelsOnCeilingGrid(vertices, PPM, required, PRODUCT);
  assert.ok(layout.fixtures.length > 0);
  assertAllPanelsClearWalls(vertices, layout.fixtures);
});

test("small room places fewer panels instead of violating wall clearance", () => {
  const vertices = rectPolygon(50, 50, 2.4, 2.4);
  const areaM2 = 2.4 * 2.4;
  const required = calculateRequiredFixtureCount(areaM2, 500, PRODUCT, 2.7);
  assert.ok(required > 1);
  const layout = placePanelsOnCeilingGrid(vertices, PPM, required, PRODUCT);
  assert.ok(layout.placedCount < required);
  assertAllPanelsClearWalls(vertices, layout.fixtures);
  assert.match(layout.warning ?? "", /Gekozen nette verdeling/i);
});

test("narrow room prefers a multi-row layout over a single row at the wall", () => {
  const vertices = rectPolygon(50, 50, 6, 3.6);
  const layout = placePanelsOnCeilingGrid(vertices, PPM, 6, PRODUCT);
  assert.equal(layout.fixtures.length, 6);
  assertAllPanelsClearWalls(vertices, layout.fixtures);
  const ys = [...new Set(layout.fixtures.map((f) => Math.round(f.y)))];
  assert.ok(ys.length > 1);
});

test("drag snap rejects wall zone and keeps previous position", () => {
  const vertices = rectPolygon(50, 50, 8, 5);
  const fixtures = placeFixturesInPolygon(vertices, PPM, 4, PRODUCT);
  const source = fixtures[0]!;
  const nearWall = { x: vertices[0]!.x + 10, y: source.y };
  const snapped = snapFixtureCenter(
    nearWall.x,
    nearWall.y,
    PPM,
    vertices,
    PRODUCT,
    source,
    fixtures,
    source.id,
  );
    assert.ok(snapped);
    assert.equal(isPanelPlacementValid(nearWall, PPM, vertices, PRODUCT), false);
    assert.equal(isPanelPlacementValid(snapped!, PPM, vertices, PRODUCT), true);
});

test("add panel only picks valid grid positions with wall clearance", () => {
  const vertices = rectPolygon(50, 50, 8, 5);
  const fixtures = placeFixturesInPolygon(vertices, PPM, 6, PRODUCT);
  const free = findFreeGridPosition(vertices, PPM, fixtures, PRODUCT);
  assert.ok(free);
  assert.equal(isPanelPlacementValid(free!, PPM, vertices, PRODUCT), true);
  const gridPx = CEILING_GRID_M * PPM;
  assert.ok(Math.abs(free!.x % gridPx) < 0.01 || Math.abs(free!.x % gridPx - gridPx) < 0.01);
  assert.ok(Math.abs(free!.y % gridPx) < 0.01 || Math.abs(free!.y % gridPx - gridPx) < 0.01);
});

test("indicative lux uses placed count when fewer than required", () => {
  const vertices = rectPolygon(50, 50, 2.4, 2.4);
  const areaM2 = 2.4 * 2.4;
  const required = calculateRequiredFixtureCount(areaM2, 500, PRODUCT, 2.7);
  const layout = placePanelsOnCeilingGrid(vertices, PPM, required, PRODUCT);
  const withRequired = calculateIndicativeResult(
    areaM2,
    500,
    2.7,
    layout.fixtures,
    required,
  );
  assert.equal(withRequired.fixtureCount, layout.placedCount);
  assert.equal(withRequired.requiredFixtureCount, required);
  if (layout.placedCount < required) {
    const fantasy = calculateIndicativeResult(areaM2, 500, 2.7, layout.fixtures);
    assert.equal(withRequired.indicativeAverageLux, fantasy.indicativeAverageLux);
    assert.equal(withRequired.meetsTarget, false);
  }
});

test("valid grid centers all satisfy panel footprint clearance", () => {
  const vertices = rectPolygon(50, 50, 8, 5);
  const centers = buildValidGridCenters(vertices, PPM, PRODUCT);
  assert.ok(centers.length > 0);
  for (const center of centers) {
    assert.equal(isPanelPlacementValid(center, PPM, vertices, PRODUCT), true);
  }
});
