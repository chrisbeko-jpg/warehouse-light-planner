import assert from "node:assert/strict";
import test from "node:test";
import {
  getNextWizardStep,
  getPrevWizardStep,
  getVisibleProgressSteps,
  isWizardFlowStep,
  isWizardProgressStepReachable,
} from "@/lib/public-wizard/wizard-navigation";

test("wizard navigation branches floorplan vs dimensions", () => {
  assert.equal(getNextWizardStep("inputMethod", "floorplan"), "floorplan");
  assert.equal(getNextWizardStep("inputMethod", "dimensions"), "dimensions");
  assert.equal(getNextWizardStep("floorplan", "floorplan"), "editor");
  assert.equal(getNextWizardStep("dimensions", "dimensions"), "editor");
});

test("progress navigation cannot jump forward to editor from dimensions", () => {
  assert.equal(isWizardProgressStepReachable("editor", "dimensions", "dimensions"), false);
  assert.equal(isWizardFlowStep("editor", "dimensions"), true);
});

test("visible progress shows only the selected input branch", () => {
  const floorplanProgress = getVisibleProgressSteps("floorplan").map((s) => s.id);
  assert.ok(floorplanProgress.includes("floorplan"));
  assert.ok(!floorplanProgress.includes("dimensions"));

  const dimensionsProgress = getVisibleProgressSteps("dimensions").map((s) => s.id);
  assert.ok(dimensionsProgress.includes("dimensions"));
  assert.ok(!dimensionsProgress.includes("floorplan"));
});

test("prev step from editor follows input method", () => {
  assert.equal(getPrevWizardStep("editor", "dimensions"), "dimensions");
  assert.equal(getPrevWizardStep("editor", "floorplan"), "floorplan");
});
