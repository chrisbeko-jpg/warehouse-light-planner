import assert from "node:assert/strict";
import test from "node:test";
import { fixtureOverlapsObstacle } from "@/lib/public-wizard/plan-obstacles";

const PPM = 100;
const PRODUCT = "led_panel_4000" as const;

test("fixture blocked by round column", () => {
  const center = { x: 200, y: 200 };
  const obstacles = [
    {
      id: "c1",
      kind: "column" as const,
      center: { x: 200, y: 200 },
      radiusM: 0.45,
    },
  ];
  assert.ok(fixtureOverlapsObstacle(center, PPM, PRODUCT, 0, obstacles));
});
