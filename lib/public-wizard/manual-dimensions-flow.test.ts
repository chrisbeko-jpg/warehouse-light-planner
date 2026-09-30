import assert from "node:assert/strict";
import test from "node:test";
import { buildManualRoomScene } from "@/lib/public-wizard/manual-room";
import { calculateRequiredFixtureCount } from "@/lib/public-wizard/calculation";
import { placeFixturesWithLayoutInfo, createRoomPolygon } from "@/lib/public-wizard/placement";

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
  assert.equal(layout.fixtures.length, count);

  const xs = layout.fixtures.map((f) => f.x);
  const ys = layout.fixtures.map((f) => f.y);
  const spreadX = Math.max(...xs) - Math.min(...xs);
  const spreadY = Math.max(...ys) - Math.min(...ys);
  assert.ok(spreadX > scene.pixelsPerMeter * 2);
  assert.ok(spreadY > scene.pixelsPerMeter * 1.5);
});
