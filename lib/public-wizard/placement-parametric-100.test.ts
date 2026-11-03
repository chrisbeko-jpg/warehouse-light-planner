import assert from "node:assert/strict";
import test from "node:test";
import { placePanelsOnCeilingGrid } from "@/lib/public-wizard/ceiling-grid";
import { calculateRequiredFixtureCount } from "@/lib/public-wizard/calculation";
import type { Point2D } from "@/types/floor-plan";

const PPM = 100;
const PRODUCT = "led_panel_4000" as const;

function rect(lengthM: number, widthM: number): Point2D[] {
  const o = 20;
  return [
    { x: o, y: o },
    { x: o + lengthM * PPM, y: o },
    { x: o + lengthM * PPM, y: o + widthM * PPM },
    { x: o, y: o + widthM * PPM },
  ];
}

test("100 parametrische rechthoeken — footprint binnen ruimte, geen misleidende 60cm-melding", () => {
  let cases = 0;
  const lengths = [5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25];
  const widths = [4, 5, 6, 7, 8, 9, 10, 12, 14];
  for (const l of lengths) {
    for (const w of widths) {
      if (cases >= 100) break;
      const area = l * w;
      if (area < 12 || area > 400) continue;
      const nominal = calculateRequiredFixtureCount(area, 500, PRODUCT, 2.7);
      if (nominal > 120) continue;
      const layout = placePanelsOnCeilingGrid(rect(l, w), PPM, nominal, PRODUCT, {
        areaM2: area,
        targetLux: 500,
        ceilingHeightM: 2.7,
        ceilingType: "grid_600",
      });
      assert.ok(layout.placedCount > 0, `${l}x${w}`);
      assert.ok(!layout.warning?.includes("60 cm"));
      cases++;
    }
  }
  assert.ok(cases >= 100);
});
