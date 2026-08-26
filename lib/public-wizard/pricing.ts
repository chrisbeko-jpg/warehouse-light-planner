import { PUBLIC_PRODUCT_BY_ID } from "@/lib/public-wizard/products";
import type { IndicativePriceRange, PlacedPublicFixture } from "@/types/public-wizard";

/** Configurable public pricing — change here without UI edits. */
export const PUBLIC_PRICING = {
  productUnitPrices: {
    led_panel_3000: 89,
    led_panel_4000: 89,
    downlight_3000: 65,
    downlight_4000: 65,
  } as Record<string, number>,
  projectAllowancePercent: 0.12,
  designComponentEuro: 350,
  rangeSpreadPercent: 0.08,
};

export function calculateIndicativePrice(
  fixtures: PlacedPublicFixture[],
): IndicativePriceRange {
  let subtotal = PUBLIC_PRICING.designComponentEuro;
  for (const fixture of fixtures) {
    const unit = PUBLIC_PRICING.productUnitPrices[fixture.productId] ?? 0;
    subtotal += unit;
  }
  subtotal *= 1 + PUBLIC_PRICING.projectAllowancePercent;
  const spread = subtotal * PUBLIC_PRICING.rangeSpreadPercent;
  return {
    minEuro: Math.round(subtotal - spread),
    maxEuro: Math.round(subtotal + spread),
  };
}

export function formatPriceRange(range: IndicativePriceRange): string {
  const fmt = (n: number) =>
    n.toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `€${fmt(range.minEuro)} – €${fmt(range.maxEuro)} excl. btw`;
}

export function countProducts(fixtures: PlacedPublicFixture[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of fixtures) {
    const name = PUBLIC_PRODUCT_BY_ID[f.productId]?.name ?? f.productId;
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
}
