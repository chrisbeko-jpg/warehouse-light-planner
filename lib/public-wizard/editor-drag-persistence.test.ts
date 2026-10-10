import assert from "node:assert/strict";
import { test } from "node:test";
import { usePublicWizardStore } from "@/lib/public-wizard/store";

test("moveFixtureById keeps the snapped position without regenerating the plan", () => {
  const store = usePublicWizardStore.getState();
  store.resetWizard();
  store.selectRoomFunction("workplace_office");
  store.selectAtmosphere("neutraal");
  store.selectCeilingType("grid_600");
  store.applyManualDimensions({ lengthM: 8, widthM: 5, ceilingHeightM: 2.7 });
  const before = usePublicWizardStore.getState().fixtures;
  assert.ok(before.length > 0);
  const target = before[0]!;
  const originalX = target.x;
  const originalY = target.y;

  const movedX = originalX + 120;
  const movedY = originalY;
  usePublicWizardStore.getState().moveFixtureById(target.id, movedX, movedY);
  const afterMove = usePublicWizardStore.getState().fixtures.find((f) => f.id === target.id)!;
  assert.notEqual(afterMove.x, originalX);

  usePublicWizardStore.getState().getIndicativeResult();
  const afterRecalc = usePublicWizardStore.getState().fixtures.find((f) => f.id === target.id)!;
  assert.equal(afterRecalc.x, afterMove.x);
  assert.equal(afterRecalc.y, afterMove.y);
});
