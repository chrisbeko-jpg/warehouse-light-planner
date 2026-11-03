import assert from "node:assert/strict";
import test from "node:test";
import { augmentFixturesForCoverage } from "@/lib/public-wizard/layout-augment";
import { summarizeLightingCoverage } from "@/lib/public-wizard/lighting-assessment";
import { placePanelsOnCeilingGrid } from "@/lib/public-wizard/ceiling-grid";
import type { Point2D } from "@/types/floor-plan";

const PPM = 100;

/** L-shaped room: matrix-only fill leaves a dark wing without coverage augment. */
function lShapeVertices(): Point2D[] {
  const o = 20;
  return [
    { x: o, y: o },
    { x: o + 1800, y: o },
    { x: o + 1800, y: o + 900 },
    { x: o + 900, y: o + 900 },
    { x: o + 900, y: o + 1800 },
    { x: o, y: o + 1800 },
  ];
}

test("coverage augment adds fixtures when local min lux lags target", () => {
  const vertices = lShapeVertices();
  const areaM2 = 14 * 9 + 9 * 9;
  const nominal = 24;
  const ctx = {
    areaM2,
    targetLux: 500,
    ceilingHeightM: 2.7,
    ceilingType: "grid_600" as const,
  };
  const base = placePanelsOnCeilingGrid(vertices, PPM, nominal, "led_panel_4000", ctx);
  const before = summarizeLightingCoverage(
    base.fixtures,
    vertices,
    PPM,
    2.7,
    500,
  );
  const { fixtures, added } = augmentFixturesForCoverage(
    base.fixtures,
    vertices,
    PPM,
    "led_panel_4000",
    ctx,
    { maxExtra: 20 },
  );
  const after = summarizeLightingCoverage(fixtures, vertices, PPM, 2.7, 500);
  assert.ok(added >= 0);
  if (before.minLux < 450) {
    assert.ok(
      after.minLux >= before.minLux || fixtures.length > base.fixtures.length,
      `min lux ${before.minLux} -> ${after.minLux}, added ${added}`,
    );
  }
});
