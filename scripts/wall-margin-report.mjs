import { calculateRequiredFixtureCount } from "../lib/public-wizard/calculation.ts";
import { buildManualRoomScene } from "../lib/public-wizard/manual-room.ts";
import { placeFixturesWithLayoutInfo } from "../lib/public-wizard/placement.ts";
import { computeLayoutWallMarginsM } from "../lib/public-wizard/layout-wall-clearance.ts";
import { calculateIndicativeResult } from "../lib/public-wizard/calculation.ts";

const PRODUCT = "led_panel_1200x300_4000";
const cases = [
  [8, 5],
  [8, 8.5],
  [8, 12],
  [10, 15],
  [15, 20],
  [12, 4],
  [4, 3],
];

for (const [l, w] of cases) {
  const scene = buildManualRoomScene({ lengthM: l, widthM: w });
  const product = w <= 4 && l <= 5 ? "led_panel_4000" : PRODUCT;
  const ceilingType = product === "led_panel_4000" ? "grid_600" : "grid_1200_600";
  const count = calculateRequiredFixtureCount(scene.areaM2, 500, product, 2.7);
  const ctx = {
    areaM2: scene.areaM2,
    targetLux: 500,
    ceilingHeightM: 2.7,
    ceilingType,
  };
  const layout = placeFixturesWithLayoutInfo(
    scene.vertices,
    scene.pixelsPerMeter,
    count,
    product,
    ctx,
  );
  const rot = layout.fixtures[0]?.rotation ?? 0;
  const walls = computeLayoutWallMarginsM(
    layout.fixtures,
    scene.pixelsPerMeter,
    scene.vertices,
    product,
    rot,
  );
  const lux = calculateIndicativeResult(
    scene.areaM2,
    500,
    2.7,
    layout.fixtures,
    count,
  );
  console.log(
    JSON.stringify({
      room: `${l}x${w}`,
      required: count,
      placed: layout.placedCount,
      matrix: `${layout.matrixRows ?? "?"}x${layout.matrixCols ?? "?"}`,
      rotation: rot,
      minWallM: Number(walls.minM.toFixed(3)),
      walls: {
        L: Number(walls.leftM.toFixed(2)),
        R: Number(walls.rightM.toFixed(2)),
        T: Number(walls.topM.toFixed(2)),
        B: Number(walls.bottomM.toFixed(2)),
      },
      indicativeLux: Math.round(lux.indicativeAverageLux),
      meetsLux: lux.meetsTarget,
    }),
  );
}
