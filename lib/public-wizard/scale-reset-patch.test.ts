import assert from "node:assert/strict";
import test from "node:test";
import { SCALE_RESET_PATCH, SCALE_RESET_PRESERVE_KEYS } from "./scale-reset-patch";

test("scale reset patch clears scale calibration and design data", () => {
  assert.equal(SCALE_RESET_PATCH.pixelsPerMeter, null);
  assert.deepEqual(SCALE_RESET_PATCH.calibrationDraft, []);
  assert.deepEqual(SCALE_RESET_PATCH.calibrationLine, []);
  assert.deepEqual(SCALE_RESET_PATCH.roomVertices, []);
  assert.equal(SCALE_RESET_PATCH.roomAreaM2, null);
  assert.deepEqual(SCALE_RESET_PATCH.fixtures, []);
  assert.equal(SCALE_RESET_PATCH.showHeatmap, false);
  assert.equal(SCALE_RESET_PATCH.lightingPlanGenerated, false);
  assert.equal(SCALE_RESET_PATCH.submitReference, null);
  assert.equal(SCALE_RESET_PATCH.submitEmail, null);
  assert.equal(SCALE_RESET_PATCH.editorMode, "calibrate-scale");
  assert.equal(SCALE_RESET_PATCH.editorPhase, "scale");
});

test("scale reset preserve keys include wizard choices and floor plan", () => {
  assert.ok(SCALE_RESET_PRESERVE_KEYS.includes("roomFunction"));
  assert.ok(SCALE_RESET_PRESERVE_KEYS.includes("targetLux"));
  assert.ok(SCALE_RESET_PRESERVE_KEYS.includes("ceilingHeightM"));
  assert.ok(SCALE_RESET_PRESERVE_KEYS.includes("atmosphere"));
  assert.ok(SCALE_RESET_PRESERVE_KEYS.includes("preferredProductId"));
  assert.ok(SCALE_RESET_PRESERVE_KEYS.includes("backgroundDataUrl"));
  assert.ok(SCALE_RESET_PRESERVE_KEYS.includes("backgroundFileName"));
});
