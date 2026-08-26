import { PUBLIC_PRODUCT_BY_ID } from "@/lib/public-wizard/products";
import type { MaterialPriceIndication, PlacedPublicFixture, PublicProductId } from "@/types/public-wizard";

/** Central public material pricing — change here only. */
export const PUBLIC_PRICING: Record<PublicProductId, number> = {
  led_panel_3000: 30,
  led_panel_4000: 30,
  downlight_3000: 15,
  downlight_4000: 15,
};

export const MATERIAL_PRICE_DISCLAIMER =
  "Exclusief btw, verzending, montage en eventuele aanvullende materialen.";

export const MATERIAL_PRICE_FOOTNOTE =
  "De definitieve projectprijs ontvangt u na controle van het lichtplan door Lightsale.";

export function calculateMaterialPrice(
  fixtures: PlacedPublicFixture[],
): MaterialPriceIndication {
  const qtyByProduct = new Map<PublicProductId, number>();
  for (const fixture of fixtures) {
    qtyByProduct.set(fixture.productId, (qtyByProduct.get(fixture.productId) ?? 0) + 1);
  }

  const lines = [...qtyByProduct.entries()].map(([productId, quantity]) => {
    const unitEuro = PUBLIC_PRICING[productId] ?? 0;
    const name = PUBLIC_PRODUCT_BY_ID[productId]?.name ?? productId;
    return {
      productId,
      name,
      quantity,
      unitEuro,
      subtotalEuro: quantity * unitEuro,
    };
  });

  const totalEuro = lines.reduce((sum, line) => sum + line.subtotalEuro, 0);
  return { totalEuro, lines };
}

export function formatMaterialPrice(price: MaterialPriceIndication): string {
  return `€${price.totalEuro.toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} excl. btw`;
}

/** @deprecated use calculateMaterialPrice */
export function calculateIndicativePrice(fixtures: PlacedPublicFixture[]): MaterialPriceIndication {
  return calculateMaterialPrice(fixtures);
}

/** @deprecated use formatMaterialPrice */
export function formatPriceRange(price: MaterialPriceIndication): string {
  return formatMaterialPrice(price);
}

export function countProducts(fixtures: PlacedPublicFixture[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of fixtures) {
    const name = PUBLIC_PRODUCT_BY_ID[f.productId]?.name ?? f.productId;
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
}
