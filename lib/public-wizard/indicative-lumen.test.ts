import assert from "node:assert/strict";
import test from "node:test";
import { calculateIndicativeResult, calculateRequiredFixtureCount } from "@/lib/public-wizard/calculation";
import {
  indicativeAverageLuxFromFixtureCount,
  indicativeUtilisationFactor,
  nominalFixtureCountFromLumenMethod,
} from "@/lib/public-wizard/indicative-lumen-method";
import { placeElongatedPanelsModuleFirst } from "@/lib/public-wizard/elongated-module-placement";
import { buildManualRoomScene } from "@/lib/public-wizard/manual-room";

const PRODUCT = "led_panel_1200x300_4000" as const;
const AREA = 48;

test("120×30 catalogue uses 3200 lm per armatuur", () => {
  const n = nominalFixtureCountFromLumenMethod(AREA, 500, PRODUCT, 2.7);
  assert.ok(n >= 1);
  const lux15 = indicativeAverageLuxFromFixtureCount(15, AREA, PRODUCT, 2.7);
  const lux18 = indicativeAverageLuxFromFixtureCount(18, AREA, PRODUCT, 2.7);
  assert.ok(lux18 > lux15);
});

test("plafondhoogte beïnvloedt UF en benodigd aantal (8×6)", () => {
  const heights = [2.7, 3.0, 3.5, 4.5];
  const counts = heights.map((h) => calculateRequiredFixtureCount(AREA, 500, PRODUCT, h));
  const ufs = heights.map((h) => indicativeUtilisationFactor(h));
  assert.ok(ufs[0]! > ufs[3]!);
  assert.ok(counts[3]! >= counts[0]!);
});

test("8×6×2,7 m — geen standaard 2-kolomsmatrix bij 500 lux", () => {
  const scene = buildManualRoomScene({ lengthM: 8, widthM: 6 });
  const nominal = calculateRequiredFixtureCount(AREA, 500, PRODUCT, 2.7);
  const layout = placeElongatedPanelsModuleFirst(
    scene.vertices,
    scene.pixelsPerMeter,
    nominal,
    PRODUCT,
    { areaM2: AREA, targetLux: 500, ceilingHeightM: 2.7, ceilingType: "grid_1200_600" },
  );
  assert.ok(layout.matrixCols! >= 3, `expected ≥3 cols, got ${layout.matrixCols}×${layout.matrixRows}`);
  assert.equal(layout.placedCount, layout.moduleIndices.length);
  const lux = calculateIndicativeResult(AREA, 500, 2.7, layout.fixtures, nominal);
  assert.ok(lux.meetsTarget, `lux ${lux.indicativeAverageLux} below target`);
});

test("8×6 — lagere luxdoelen vereisen minder armaturen", () => {
  const n500 = calculateRequiredFixtureCount(AREA, 500, PRODUCT, 2.7);
  const n250 = calculateRequiredFixtureCount(AREA, 250, PRODUCT, 2.7);
  const n200 = calculateRequiredFixtureCount(AREA, 200, PRODUCT, 2.7);
  assert.ok(n500 > n250);
  assert.ok(n250 >= n200);
});
