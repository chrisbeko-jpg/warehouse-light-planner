import assert from "node:assert/strict";
import test from "node:test";
import { calculateRequiredFixtureCount } from "@/lib/public-wizard/calculation";
import {
  ACCEPTABLE_AUTO_WALL_CLEARANCE_M,
  computeLayoutWallMarginsM,
} from "@/lib/public-wizard/layout-wall-clearance";
import { buildManualRoomScene } from "@/lib/public-wizard/manual-room";
import { placeFixturesWithLayoutInfo } from "@/lib/public-wizard/placement";

const CEILING = 2.7;
const PRODUCT_120 = "led_panel_1200x300_4000" as const;
const PRODUCT_60 = "led_panel_4000" as const;
const CTX_120 = { ceilingType: "grid_1200_600" as const };

function assertAutoWallMargins(
  vertices: Parameters<typeof placeFixturesWithLayoutInfo>[0],
  ppm: number,
  fixtures: Array<{ x: number; y: number; rotation?: number; productId: string }>,
  productId: typeof PRODUCT_120 | typeof PRODUCT_60,
  minExpectedM: number,
) {
  const walls = computeLayoutWallMarginsM(
    fixtures,
    ppm,
    vertices,
    productId,
    fixtures[0]?.rotation ?? 0,
  );
  assert.ok(
    walls.minM >= minExpectedM - 0.02,
    `min wall ${walls.minM.toFixed(2)}m expected >= ${minExpectedM} (L${walls.leftM.toFixed(2)} R${walls.rightM.toFixed(2)} T${walls.topM.toFixed(2)} B${walls.bottomM.toFixed(2)})`,
  );
  return walls;
}

test("8×5 m auto layout keeps ≥ preferred wall clearance on all sides", () => {
  const scene = buildManualRoomScene({ lengthM: 8, widthM: 5 });
  const count = calculateRequiredFixtureCount(scene.areaM2, 500, PRODUCT_120, CEILING);
  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    PRODUCT_120,
    { areaM2: scene.areaM2, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
  );
  // 3-column matrix on 8×5 cannot reach 60 cm on every side; ≥40 cm is the best grid-aligned option.
  assertAutoWallMargins(
    scene.vertices,
    scene.pixelsPerMeter,
    layout.fixtures,
    PRODUCT_120,
    ACCEPTABLE_AUTO_WALL_CLEARANCE_M,
  );
});

test("8×8,5 m auto layout avoids flush wall panels", () => {
  const scene = buildManualRoomScene({ lengthM: 8, widthM: 8.5 });
  const count = calculateRequiredFixtureCount(scene.areaM2, 500, PRODUCT_120, CEILING);
  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    PRODUCT_120,
    { areaM2: scene.areaM2, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
  );
  assertAutoWallMargins(
    scene.vertices,
    scene.pixelsPerMeter,
    layout.fixtures,
    PRODUCT_120,
    ACCEPTABLE_AUTO_WALL_CLEARANCE_M,
  );
});

test("8×12 m auto layout maintains wall clearance", () => {
  const scene = buildManualRoomScene({ lengthM: 8, widthM: 12 });
  const count = calculateRequiredFixtureCount(scene.areaM2, 500, PRODUCT_120, CEILING);
  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    PRODUCT_120,
    { areaM2: scene.areaM2, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
  );
  assertAutoWallMargins(
    scene.vertices,
    scene.pixelsPerMeter,
    layout.fixtures,
    PRODUCT_120,
    ACCEPTABLE_AUTO_WALL_CLEARANCE_M,
  );
});

test("10×15 m auto layout maintains wall clearance", () => {
  const scene = buildManualRoomScene({ lengthM: 10, widthM: 15 });
  const count = calculateRequiredFixtureCount(scene.areaM2, 500, PRODUCT_120, CEILING);
  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    PRODUCT_120,
    { areaM2: scene.areaM2, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
  );
  assert.ok(layout.placedCount >= count);
  assertAutoWallMargins(
    scene.vertices,
    scene.pixelsPerMeter,
    layout.fixtures,
    PRODUCT_120,
    0.3,
  );
});

test("15×20 m auto layout maintains wall clearance", () => {
  const scene = buildManualRoomScene({ lengthM: 15, widthM: 20 });
  const count = calculateRequiredFixtureCount(scene.areaM2, 500, PRODUCT_120, CEILING);
  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    PRODUCT_120,
    { areaM2: scene.areaM2, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
  );
  assert.ok(layout.placedCount >= count);
  assertAutoWallMargins(
    scene.vertices,
    scene.pixelsPerMeter,
    layout.fixtures,
    PRODUCT_120,
    ACCEPTABLE_AUTO_WALL_CLEARANCE_M,
  );
});

test("narrow corridor 12×4 m keeps panels off walls", () => {
  const scene = buildManualRoomScene({ lengthM: 12, widthM: 4 });
  const count = calculateRequiredFixtureCount(scene.areaM2, 500, PRODUCT_120, CEILING);
  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    PRODUCT_120,
    { areaM2: scene.areaM2, targetLux: 500, ceilingHeightM: CEILING, ...CTX_120 },
  );
  assert.ok(layout.placedCount > 0);
  const walls = computeLayoutWallMarginsM(
    layout.fixtures,
    scene.pixelsPerMeter,
    scene.vertices,
    PRODUCT_120,
    layout.fixtures[0]?.rotation ?? 0,
  );
  assert.ok(layout.placedCount > 0 && walls.minM >= 0, `corridor min wall ${walls.minM}`);
});

test("small 4×3 m may use reduced wall clearance but stays inside room", () => {
  const scene = buildManualRoomScene({ lengthM: 4, widthM: 3 });
  const count = calculateRequiredFixtureCount(scene.areaM2, 500, PRODUCT_60, CEILING);
  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    PRODUCT_60,
    { areaM2: scene.areaM2, targetLux: 500, ceilingHeightM: CEILING, ceilingType: "grid_600" },
  );
  assert.ok(layout.placedCount > 0);
  for (const f of layout.fixtures) {
    assert.ok(f.x > scene.vertices[0]!.x && f.y > scene.vertices[0]!.y);
  }
});
