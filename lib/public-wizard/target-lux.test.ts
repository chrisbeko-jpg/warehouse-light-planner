import assert from "node:assert/strict";
import test from "node:test";
import { calculateRequiredFixtureCount } from "@/lib/public-wizard/calculation";

test("higher target lux requires more fixtures for the same room", () => {
  const areaM2 = 40;
  const ceilingHeightM = 2.7;
  const productId = "led_panel_4000" as const;
  const lux500 = calculateRequiredFixtureCount(areaM2, 500, productId, ceilingHeightM);
  const lux250 = calculateRequiredFixtureCount(areaM2, 250, productId, ceilingHeightM);
  const lux200 = calculateRequiredFixtureCount(areaM2, 200, productId, ceilingHeightM);
  assert.ok(lux500 > lux250);
  assert.ok(lux250 >= lux200);
});
