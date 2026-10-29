import assert from "node:assert/strict";
import test from "node:test";
import { usePublicWizardStore } from "@/lib/public-wizard/store";

function resetStore() {
  usePublicWizardStore.getState().resetWizard();
}

test("switching 2D/3D view does not mutate fixture positions", () => {
  resetStore();
  const store = usePublicWizardStore.getState();
  store.selectRoomFunction("workplace_office");
  store.selectAtmosphere("neutraal");
  store.selectCeilingType("grid_600");
  store.selectInputMethod("dimensions");
  store.applyManualDimensions({ lengthM: 8, widthM: 5, ceilingHeightM: 2.7 });
  const before = usePublicWizardStore.getState().fixtures.map((f) => ({ x: f.x, y: f.y, id: f.id }));
  assert.ok(before.length > 0);
  store.setEditorPlanView("3d");
  store.setEditorPlanView("2d");
  const after = usePublicWizardStore.getState().fixtures;
  assert.equal(after.length, before.length);
  for (let i = 0; i < before.length; i++) {
    assert.equal(after[i]!.x, before[i]!.x);
    assert.equal(after[i]!.y, before[i]!.y);
  }
});

test("floor finish choice persists in room3D state", () => {
  resetStore();
  usePublicWizardStore.getState().setRoom3DFloor({ type: "parquet", color: "#c9a66b" });
  const floor = usePublicWizardStore.getState().room3D.floor;
  assert.equal(floor.type, "parquet");
  assert.equal(floor.color, "#c9a66b");
});
