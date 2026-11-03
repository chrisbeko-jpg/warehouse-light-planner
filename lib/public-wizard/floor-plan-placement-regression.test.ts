import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateIndicativeResult,
  calculateRequiredFixtureCount,
} from "@/lib/public-wizard/calculation";
import { placePanelsOnCeilingGrid } from "@/lib/public-wizard/ceiling-grid";
import { summarizeLightingCoverage } from "@/lib/public-wizard/lighting-assessment";
import type { Point2D } from "@/types/floor-plan";

const PPM = 100;
const CEILING = 2.7;
const PRODUCT = "led_panel_4000" as const;

/** ~350,1 m² — regressie referentie open kantoor (rechthoekige benadering). */
function rectVertices(lengthM: number, widthM: number): Point2D[] {
  const o = 50;
  return [
    { x: o, y: o },
    { x: o + lengthM * PPM, y: o },
    { x: o + lengthM * PPM, y: o + widthM * PPM },
    { x: o, y: o + widthM * PPM },
  ];
}

test("350 m² kantoor — nominaal ~101 panelen, augment vult aan waar modules vrij zijn", () => {
  const lengthM = 25.003;
  const widthM = 14.002;
  const areaM2 = lengthM * widthM;
  assert.ok(Math.abs(areaM2 - 350.1) < 0.15);
  const vertices = rectVertices(lengthM, widthM);
  const nominal = calculateRequiredFixtureCount(areaM2, 500, PRODUCT, CEILING);
  assert.ok(nominal >= 90 && nominal <= 110, `nominal ${nominal}`);

  const layout = placePanelsOnCeilingGrid(vertices, PPM, nominal, PRODUCT, {
    areaM2,
    targetLux: 500,
    ceilingHeightM: CEILING,
    ceilingType: "grid_600",
  });

  assert.ok(
    layout.placedCount >= nominal - 1,
    `placed ${layout.placedCount} vs nominal ${nominal}`,
  );
  assert.ok(!layout.warning?.includes("60 cm"), "geen misleidende 60cm-wandmelding");

  const lux = calculateIndicativeResult(
    areaM2,
    500,
    CEILING,
    layout.fixtures,
    nominal,
  );
  const coverage = summarizeLightingCoverage(
    layout.fixtures,
    vertices,
    PPM,
    CEILING,
    500,
  );
  assert.ok(coverage.sampleCount > 20);
  assert.ok(coverage.averageLux > 0);
  assert.ok(lux.indicativeAverageLux > 300);
});
