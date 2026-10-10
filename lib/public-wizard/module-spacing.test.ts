import assert from "node:assert/strict";
import test from "node:test";
import { minModuleIndexStepForAxis, selectEvenlySpacedIndices } from "@/lib/public-wizard/module-spacing";

test("selectEvenlySpacedIndices centers selections with maximum step", () => {
  const indices = selectEvenlySpacedIndices(13, 4, 2);
  assert.deepEqual(indices, [0, 4, 8, 12]);
});

test("minModuleIndexStep requires skip when fixture spans module pitch", () => {
  assert.equal(minModuleIndexStepForAxis("led_panel_1200x300_4000", 0, "col", 1.2, 0.6), 2);
  assert.equal(minModuleIndexStepForAxis("led_panel_1200x300_4000", 90, "row", 0.6, 1.2), 2);
});
