import { test, expect } from "@playwright/test";
import {
  PUBLIC_PRICING,
  calculateMaterialPrice,
  formatMaterialPrice,
  MATERIAL_PRICE_DISCLAIMER,
} from "../lib/public-wizard/pricing";
import {
  computeFitView,
  parseDistanceMeters,
  zoomAtPoint,
} from "../lib/public-wizard/viewport";
import type { PlacedPublicFixture } from "../types/public-wizard";

function fixture(productId: PlacedPublicFixture["productId"], n: number): PlacedPublicFixture[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${productId}-${i}`,
    productId,
    x: i * 10,
    y: i * 10,
    rotation: 0,
  }));
}

test.describe("Material pricing", () => {
  test("LED panels at €30 and downlights at €15", () => {
    expect(PUBLIC_PRICING.led_panel_3000).toBe(30);
    expect(PUBLIC_PRICING.led_panel_4000).toBe(30);
    expect(PUBLIC_PRICING.downlight_3000).toBe(15);
    expect(PUBLIC_PRICING.downlight_4000).toBe(15);
  });

  test("calculates total from placed fixtures", () => {
    const price = calculateMaterialPrice([
      ...fixture("led_panel_4000", 18),
      ...fixture("downlight_4000", 4),
    ]);
    expect(price.totalEuro).toBe(18 * 30 + 4 * 15);
    expect(formatMaterialPrice(price)).toContain("€600,00");
  });

  test("updates when fixtures are added or removed", () => {
    const base = calculateMaterialPrice(fixture("led_panel_4000", 2));
    expect(base.totalEuro).toBe(60);
    const withDownlight = calculateMaterialPrice([
      ...fixture("led_panel_4000", 2),
      ...fixture("downlight_3000", 1),
    ]);
    expect(withDownlight.totalEuro).toBe(75);
  });

  test("includes exclusief btw disclaimer text", () => {
    expect(MATERIAL_PRICE_DISCLAIMER).toContain("Exclusief btw");
  });
});

test.describe("Editor viewport", () => {
  test("fit to screen uses contain behaviour", () => {
    const view = computeFitView(1000, 800, 2000, 1000);
    expect(view.scale).toBeLessThan(1);
    expect(view.positionX).toBeGreaterThan(0);
    expect(view.positionY).toBeGreaterThan(0);
  });

  test("zoom keeps world coordinates stable under cursor", () => {
    const view = { scale: 1, positionX: 0, positionY: 0 };
    const pointer = { x: 100, y: 200 };
    const imagePoint = {
      x: (pointer.x - view.positionX) / view.scale,
      y: (pointer.y - view.positionY) / view.scale,
    };
    const zoomed = zoomAtPoint(view, pointer, 1);
    const restoredX = (pointer.x - zoomed.positionX) / zoomed.scale;
    const restoredY = (pointer.y - zoomed.positionY) / zoomed.scale;
    expect(restoredX).toBeCloseTo(imagePoint.x, 5);
    expect(restoredY).toBeCloseTo(imagePoint.y, 5);
  });

  test("parses Dutch distance input", () => {
    expect(parseDistanceMeters("4,80 m")).toBe(4.8);
    expect(parseDistanceMeters("5")).toBe(5);
  });
});
