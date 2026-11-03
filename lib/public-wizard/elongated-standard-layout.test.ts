import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateIndicativeResult,
  calculateRequiredFixtureCount,
} from "@/lib/public-wizard/calculation";
import { placeElongatedPanelsModuleFirst } from "@/lib/public-wizard/elongated-module-placement";
import { buildManualRoomScene } from "@/lib/public-wizard/manual-room";
import { countAdjacentLuminaires } from "@/lib/public-wizard/luminaire-adjacency";
import { isElongatedPanel } from "@/lib/public-wizard/products";

const PRODUCT = "led_panel_1200x300_4000" as const;
assert.ok(isElongatedPanel(PRODUCT));

const ROOMS: Array<{ lengthM: number; widthM: number; lux: number; ceilingM: number }> = [
  { lengthM: 8, widthM: 5, lux: 500, ceilingM: 2.7 },
  { lengthM: 8, widthM: 6, lux: 500, ceilingM: 2.7 },
  { lengthM: 8, widthM: 7, lux: 500, ceilingM: 2.7 },
  { lengthM: 8, widthM: 9, lux: 500, ceilingM: 2.7 },
  { lengthM: 8, widthM: 12, lux: 500, ceilingM: 2.7 },
  { lengthM: 10, widthM: 15, lux: 500, ceilingM: 2.7 },
  { lengthM: 15, widthM: 20, lux: 500, ceilingM: 2.7 },
];

for (const { lengthM, widthM, lux, ceilingM } of ROOMS) {
  test(`standard elongated layout ${lengthM}×${widthM} m`, () => {
    const area = lengthM * widthM;
    const scene = buildManualRoomScene({ lengthM, widthM });
    const nominal = calculateRequiredFixtureCount(area, lux, PRODUCT, ceilingM);
    const layout = placeElongatedPanelsModuleFirst(
      scene.vertices,
      scene.pixelsPerMeter,
      nominal,
      PRODUCT,
      {
        areaM2: area,
        targetLux: lux,
        ceilingHeightM: ceilingM,
        ceilingType: "grid_1200_600",
      },
    );
    assert.ok(layout.placedCount >= 6);
    assert.equal(layout.placedCount, layout.moduleIndices.length);
    if (layout.placedCount >= 12 && lengthM >= widthM * 0.9) {
      assert.ok((layout.matrixCols ?? 0) >= 3, `expected ≥3 cols, got ${layout.matrixCols}×${layout.matrixRows}`);
    }
    const adj = countAdjacentLuminaires(
      layout.fixtures,
      scene.pixelsPerMeter,
      PRODUCT,
      layout.rotation,
    );
    assert.equal(adj.totalPairs, 0);

    const luxLayout = placeElongatedPanelsModuleFirst(
      scene.vertices,
      scene.pixelsPerMeter,
      nominal,
      PRODUCT,
      {
        areaM2: area,
        targetLux: lux,
        ceilingHeightM: ceilingM,
        ceilingType: "grid_1200_600",
        elongatedMeetLuxTarget: true,
      },
    );
    const standardLux = calculateIndicativeResult(
      area,
      lux,
      ceilingM,
      layout.fixtures,
      nominal,
    );
    const luxResult = calculateIndicativeResult(
      area,
      lux,
      ceilingM,
      luxLayout.fixtures,
      nominal,
    );
    assert.ok(luxLayout.placedCount >= layout.placedCount);
    if (area <= 120) {
      assert.ok(luxResult.meetsTarget, `lux-first ${lengthM}×${widthM} ${luxResult.indicativeAverageLux} lux`);
    } else {
      assert.ok(
        luxResult.indicativeAverageLux >= standardLux.indicativeAverageLux ||
          luxLayout.placedCount > layout.placedCount,
        `lux-first ${lengthM}×${widthM} should not reduce capacity (${luxResult.indicativeAverageLux} vs ${standardLux.indicativeAverageLux} lux)`,
      );
    }
  });
}

test("8×6 standaard 3×5 en lux-first meer panelen", () => {
  const scene = buildManualRoomScene({ lengthM: 8, widthM: 6 });
  const nominal = calculateRequiredFixtureCount(48, 500, PRODUCT, 2.7);
  const standard = placeElongatedPanelsModuleFirst(
    scene.vertices,
    scene.pixelsPerMeter,
    nominal,
    PRODUCT,
    { areaM2: 48, targetLux: 500, ceilingHeightM: 2.7, ceilingType: "grid_1200_600" },
  );
  assert.equal(standard.placedCount, 15);
  assert.equal(standard.matrixCols, 3);
  assert.equal(standard.matrixRows, 5);

  const luxFirst = placeElongatedPanelsModuleFirst(
    scene.vertices,
    scene.pixelsPerMeter,
    nominal,
    PRODUCT,
    {
      areaM2: 48,
      targetLux: 500,
      ceilingHeightM: 2.7,
      ceilingType: "grid_1200_600",
      elongatedMeetLuxTarget: true,
    },
  );
  assert.ok(luxFirst.placedCount > 15);
  assert.ok((luxFirst.matrixCols ?? 0) >= 3);
});
