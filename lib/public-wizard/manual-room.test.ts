import assert from "node:assert/strict";
import test from "node:test";
import { buildManualRoomScene } from "@/lib/public-wizard/manual-room";
import { createRoomPolygon } from "@/lib/public-wizard/placement";

test("buildManualRoomScene creates scale-accurate rectangle geometry", () => {
  const scene = buildManualRoomScene({ lengthM: 8, widthM: 5 });
  assert.equal(scene.areaM2, 40);
  assert.ok(scene.pixelsPerMeter > 0);
  const polygon = createRoomPolygon(scene.vertices, scene.pixelsPerMeter);
  assert.ok(Math.abs(polygon.areaM2 - 40) < 0.1);
  assert.ok(scene.dataUrl.startsWith("data:image/svg+xml"));
});
