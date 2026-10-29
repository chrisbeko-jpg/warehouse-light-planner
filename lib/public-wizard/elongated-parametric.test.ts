import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateIndicativeResult,
  calculateRequiredFixtureCount,
} from "@/lib/public-wizard/calculation";
import { ELONGATED_COUNT_SEARCH_DELTA } from "@/lib/public-wizard/indicative-lumen-method";
import { computeLayoutCoverageMetrics } from "@/lib/public-wizard/elongated-layout-coverage";
import { polygonBoundsFromVertices } from "@/lib/public-wizard/elongated-matrix-score";
import { placeElongatedPanelsModuleFirst } from "@/lib/public-wizard/elongated-module-placement";
import { buildManualRoomScene } from "@/lib/public-wizard/manual-room";
import { countAdjacentLuminaires } from "@/lib/public-wizard/luminaire-adjacency";

const PRODUCT = "led_panel_1200x300_4000" as const;
const CEILING = 2.7;
const CTX = { ceilingType: "grid_1200_600" as const, targetLux: 500, ceilingHeightM: CEILING };

function rectScene(lengthM: number, widthM: number) {
  return buildManualRoomScene({ lengthM, widthM });
}

function assertGoodSpread(
  lengthM: number,
  widthM: number,
  count: number,
  maxDeadZoneM: number,
) {
  const scene = rectScene(lengthM, widthM);
  const layout = placeElongatedPanelsModuleFirst(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    PRODUCT,
    { areaM2: lengthM * widthM, ...CTX },
  );
  assert.ok(
    layout.placedCount >= count - ELONGATED_COUNT_SEARCH_DELTA &&
      layout.placedCount <= count + ELONGATED_COUNT_SEARCH_DELTA,
    `${lengthM}x${widthM} placed ${layout.placedCount} vs nominal ${count}`,
  );
  const lux = calculateIndicativeResult(
    lengthM * widthM,
    CTX.targetLux,
    CEILING,
    layout.fixtures,
    count,
  );
  assert.ok(lux.meetsTarget, `${lengthM}x${widthM} lux ${lux.indicativeAverageLux}`);
  if (lengthM >= widthM * 0.95 && layout.placedCount >= 12) {
    assert.ok(
      (layout.matrixCols ?? 0) >= 3,
      `${lengthM}x${widthM} should prefer ≥3 columns, got ${layout.matrixCols}×${layout.matrixRows}`,
    );
  }
  const adj = countAdjacentLuminaires(
    layout.fixtures,
    scene.pixelsPerMeter,
    PRODUCT,
    layout.rotation,
  );
  assert.equal(adj.totalPairs, 0, `${lengthM}x${widthM} adjacent bands`);
  const bounds = polygonBoundsFromVertices(scene.vertices);
  const coverage = computeLayoutCoverageMetrics(
    layout.fixtures,
    bounds,
    scene.pixelsPerMeter,
  );
  assert.ok(
    coverage.maxSampleDistanceM <= maxDeadZoneM,
    `${lengthM}x${widthM} n=${count} max dead zone ${coverage.maxSampleDistanceM.toFixed(2)}m > ${maxDeadZoneM}m`,
  );
  return { layout, coverage };
}

test("8×6 m uses professional matrix with full-height spread (joint optimization)", () => {
  const nominal = calculateRequiredFixtureCount(48, 500, PRODUCT, CEILING);
  const { layout } = assertGoodSpread(8, 6, nominal, 2.0);
  assert.ok((layout.matrixCols ?? 0) >= 3);
  const rows = [...new Set(layout.moduleIndices.map((m) => m.row))].sort((a, b) => a - b);
  assert.ok(rows.length >= 5);
  assert.ok(rows[0]! <= 2, `first row index ${rows[0]} too low in grid`);
  assert.ok(rows[rows.length - 1]! >= 7, `last row index ${rows.at(-1)} — clustering`);
});

const ANCHOR_CASES: Array<[number, number, number, number]> = [
  [8, 5, 500, 2.0],
  [8, 6, 500, 2.05],
  [8, 7, 500, 3.15],
  [8, 8.5, 500, 2.15],
  [8, 9, 500, 2.1],
  [8, 12, 500, 2.45],
  [10, 15, 500, 2.6],
  [4, 12, 500, 2.35],
  [12, 4, 500, 2.35],
];

for (const [l, w, lux, maxDead] of ANCHOR_CASES) {
  test(`anchor ${l}×${w} m elongated spread`, () => {
    const scene = rectScene(l, w);
    const count = calculateRequiredFixtureCount(l * w, lux, PRODUCT, CEILING);
    if (count > 95) return;
    assertGoodSpread(l, w, count, maxDead);
  });
}

test("parametric grid: 100+ room/count combinations stay separated and spread", () => {
  const lengths = [6, 7, 8, 8.5, 9, 10, 11, 12, 14, 15];
  const widths = [4, 5, 5.5, 6, 6.5, 7, 8, 8.5, 9, 10, 12];
  let cases = 0;
  let passed = 0;
  for (const lengthM of lengths) {
    for (const widthM of widths) {
      if (lengthM * widthM < 28 || lengthM * widthM > 220) continue;
      const count = calculateRequiredFixtureCount(lengthM * widthM, 500, PRODUCT, CEILING);
      if (count < 6 || count > 90) continue;
      cases++;
      const scene = rectScene(lengthM, widthM);
      const layout = placeElongatedPanelsModuleFirst(
        scene.vertices,
        scene.pixelsPerMeter,
        count,
        PRODUCT,
        { areaM2: lengthM * widthM, ...CTX },
      );
      const adj = countAdjacentLuminaires(
        layout.fixtures,
        scene.pixelsPerMeter,
        PRODUCT,
        layout.rotation,
      );
      if (adj.totalPairs > 0) continue;
      const bounds = polygonBoundsFromVertices(scene.vertices);
      const coverage = computeLayoutCoverageMetrics(
        layout.fixtures,
        bounds,
        scene.pixelsPerMeter,
      );
      const spanM = Math.min(lengthM, widthM);
      const limit = Math.min(3.05, 0.38 * spanM + 1.05);
      if (coverage.maxSampleDistanceM <= limit) {
        passed++;
      }
    }
  }
  assert.ok(cases >= 100, `expected >=100 parametric cases, got ${cases}`);
  assert.ok(passed >= cases * 0.9, `too many failures: ${passed}/${cases}`);
});
