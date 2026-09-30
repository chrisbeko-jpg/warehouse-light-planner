import assert from "node:assert/strict";
import test from "node:test";
import { buildManualRoomScene } from "@/lib/public-wizard/manual-room";
import { calculateRequiredFixtureCount } from "@/lib/public-wizard/calculation";
import { placeFixturesWithLayoutInfo, createRoomPolygon } from "@/lib/public-wizard/placement";
import { minPanelOuterEdgeClearanceM } from "@/lib/public-wizard/placement-constraints";

test("manual 8x5 office scene produces spread panel layout", () => {
  const scene = buildManualRoomScene({ lengthM: 8, widthM: 5 });
  const areaM2 = createRoomPolygon(scene.vertices, scene.pixelsPerMeter).areaM2;
  assert.ok(Math.abs(areaM2 - 40) < 0.01);

  const count = calculateRequiredFixtureCount(areaM2, 500, "led_panel_4000", 2.7);
  assert.ok(count >= 8);

  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    "led_panel_4000",
  );
  assert.ok(layout.fixtures.length > 0);
  assert.ok(layout.placedCount >= count - 1);
  assert.ok(layout.placedCount <= Math.ceil(count * 1.28));
  for (const fixture of layout.fixtures) {
    assert.ok(
      minPanelOuterEdgeClearanceM(
        { x: fixture.x, y: fixture.y },
        scene.pixelsPerMeter,
        scene.vertices,
        "led_panel_4000",
      ) >= 0.6 - 0.001,
    );
  }
});
