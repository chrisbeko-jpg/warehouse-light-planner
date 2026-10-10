import assert from "node:assert/strict";
import test from "node:test";
import { calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import { proposeMixedPanelDownlightPlan } from "@/lib/public-wizard/mixed-lighting-plan";
import { placeElongatedPanelsOnModules } from "@/lib/public-wizard/matrix-placement";
import type { Point2D } from "@/types/floor-plan";

const PPM = 100;

function rect(lengthM: number, widthM: number): Point2D[] {
  const origin = 40;
  return [
    { x: origin, y: origin },
    { x: origin + lengthM * PPM, y: origin },
    { x: origin + lengthM * PPM, y: origin + widthM * PPM },
    { x: origin, y: origin + widthM * PPM },
  ];
}

test("mixed plan is not offered when panel layout already meets lux", () => {
  const vertices = rect(8, 7);
  const layout = placeElongatedPanelsOnModules(
    vertices,
    PPM,
    18,
    "led_panel_1200x300_4000",
    { areaM2: 56, targetLux: 500, ceilingHeightM: 2.7, ceilingType: "grid_1200_600" },
    "grid_1200_600",
  );
  const mixed = proposeMixedPanelDownlightPlan({
    panelFixtures: layout.fixtures,
    vertices,
    pixelsPerMeter: PPM,
    ceilingType: "grid_1200_600",
    downlightProductId: "downlight_4000",
    context: { areaM2: 56, targetLux: 500, ceilingHeightM: 2.7, ceilingType: "grid_1200_600" },
    requiredFixtureCount: 18,
  });
  assert.equal(mixed, null);
});

test("mixed plan adds downlights on empty modules when lux falls short", () => {
  const vertices = rect(8, 7);
  const layout = placeElongatedPanelsOnModules(
    vertices,
    PPM,
    12,
    "led_panel_1200x300_4000",
    { areaM2: 56, targetLux: 500, ceilingHeightM: 2.7, ceilingType: "grid_1200_600" },
    "grid_1200_600",
  );
  const panelLux = calculateIndicativeResult(56, 500, 2.7, layout.fixtures, 12);
  assert.ok(!panelLux.meetsTarget);

  const mixed = proposeMixedPanelDownlightPlan({
    panelFixtures: layout.fixtures,
    vertices,
    pixelsPerMeter: PPM,
    ceilingType: "grid_1200_600",
    downlightProductId: "downlight_4000",
    context: { areaM2: 56, targetLux: 500, ceilingHeightM: 2.7, ceilingType: "grid_1200_600" },
    requiredFixtureCount: 12,
  });
  assert.ok(mixed);
  assert.ok(mixed.addedDownlightCount > 0);
  assert.ok(mixed.indicativeAverageLux > panelLux.indicativeAverageLux);
  assert.ok(mixed.fixtures.some((f) => f.productId === "downlight_4000"));
  assert.ok(mixed.fixtures.some((f) => f.productId.startsWith("led_panel_1200x300")));
});
