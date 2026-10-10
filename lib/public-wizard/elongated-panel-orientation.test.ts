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

const context864 = {
  areaM2: 51.2,
  targetLux: 500,
  ceilingHeightM: CEILING,
  ceilingType: "grid_1200_600" as const,
};

test("8×6.4 m / 15 elongated panels → 5×3 matrix without touching panels", () => {
  const vertices = rect(8, 6.4);
  const layout = placeElongatedPanelsOnModules(
    vertices,
    PPM,
    15,
    PRODUCT,
    context864,
    "grid_1200_600",
  );

  assert.equal(layout.placedCount, 15);
  assert.equal(layout.matrixRows, 5);
  assert.equal(layout.matrixCols, 3);

  const points = layout.fixtures.map((f) => ({ x: f.x, y: f.y }));
  const rotation = layout.fixtures[0]?.rotation ?? 0;
  const adjacent = countAdjacentLuminaires(points, PPM, PRODUCT, rotation);
  assert.equal(adjacent.totalPairs, 0);

  const lux = calculateIndicativeResult(
    context864.areaM2,
    context864.targetLux,
    CEILING,
    layout.fixtures,
    15,
  );
  assert.ok(lux.meetsTarget);
});

test("8×6.4 m elongated counts keep exact totals with minimal adjacency", () => {
  const vertices = rect(8, 6.4);
  for (const count of [9, 12, 16, 20]) {
    const layout = placeElongatedPanelsOnModules(
      vertices,
      PPM,
      count,
      PRODUCT,
      context864,
      "grid_1200_600",
    );
    assert.equal(layout.placedCount, count, `count ${count}`);
    const rotation = layout.fixtures[0]?.rotation ?? 0;
    const adjacent = countAdjacentLuminaires(
      layout.fixtures.map((f) => ({ x: f.x, y: f.y })),
      PPM,
      PRODUCT,
      rotation,
    );
    assert.ok(adjacent.totalPairs <= count, `count ${count} adjacent ${adjacent.totalPairs}`);
  }
});

test("other room sizes use exact elongated matrices", () => {
  const rooms: Array<[number, number]> = [
    [8, 5],
    [10, 7.5],
    [12, 4],
    [6, 6],
  ];
  for (const [lengthM, widthM] of rooms) {
    const areaM2 = lengthM * widthM;
    const count = calculateRequiredFixtureCount(areaM2, 500, PRODUCT, CEILING);
    const layout = placeElongatedPanelsOnModules(
      rect(lengthM, widthM),
      PPM,
      count,
      PRODUCT,
      { areaM2, targetLux: 500, ceilingHeightM: CEILING, ceilingType: "grid_1200_600" },
      "grid_1200_600",
    );
    assert.ok(
      Math.abs(layout.placedCount - count) <= 3,
      `${lengthM}×${widthM} calc ${count} placed ${layout.placedCount}`,
    );
    assert.equal(
      (layout.matrixRows ?? 0) * (layout.matrixCols ?? 0),
      layout.placedCount,
    );
  }
});
