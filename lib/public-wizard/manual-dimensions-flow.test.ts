import assert from "node:assert/strict";
import test from "node:test";
import { buildManualRoomScene } from "@/lib/public-wizard/manual-room";
import { calculateRequiredFixtureCount } from "@/lib/public-wizard/calculation";
import { placeFixturesWithLayoutInfo, createRoomPolygon } from "@/lib/public-wizard/placement";
import { describeFixtureMatrix } from "@/lib/public-wizard/ceiling-grid";
import { evaluateLayoutQuality } from "@/lib/public-wizard/layout-quality";
import { isPanelFootprintInsideRoom } from "@/lib/public-wizard/placement-constraints";

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
    {
      areaM2,
      targetLux: 500,
      ceilingHeightM: 2.7,
      ceilingType: "grid_600",
    },
  );
  assert.ok(layout.fixtures.length > 0);
  assert.equal(layout.placedCount, count);
  const xs = scene.vertices.map((v) => v.x);
  const ys = scene.vertices.map((v) => v.y);
  const bounds = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
  const quality = evaluateLayoutQuality(layout.fixtures, bounds);
  assert.equal(quality.rejected, false);
  const matrix = describeFixtureMatrix(layout.fixtures);
  assert.ok(matrix.rows >= 1 && matrix.cols >= 1);
  for (const fixture of layout.fixtures) {
    assert.ok(
      isPanelFootprintInsideRoom(
        { x: fixture.x, y: fixture.y },
        scene.pixelsPerMeter,
        scene.vertices,
        "led_panel_4000",
      ),
    );
  }
});
