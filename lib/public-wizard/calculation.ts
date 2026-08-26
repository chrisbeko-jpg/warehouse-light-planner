import { getHeightFactor } from "@/lib/height-factor";
import { getPublicProduct } from "@/lib/public-wizard/products";
import type { IndicativeResult, PlacedPublicFixture, PublicProductId } from "@/types/public-wizard";

/** Sensible defaults — not exposed in public UI. */
export const UTILISATION_FACTOR = 0.6;
export const MAINTENANCE_FACTOR = 0.8;

export const CALCULATION_DISCLAIMER =
  "Deze berekening is indicatief en gebaseerd op de lumenmethode. De definitieve projectspecificatie wordt door Lightsale gecontroleerd.";

export function effectiveLumensPerFixture(
  productId: PublicProductId,
  ceilingHeightM: number,
): number {
  const product = getPublicProduct(productId);
  const heightFactor = getHeightFactor(ceilingHeightM);
  return product.lumens * UTILISATION_FACTOR * MAINTENANCE_FACTOR * heightFactor;
}

export function calculateRequiredFixtureCount(
  areaM2: number,
  targetLux: number,
  productId: PublicProductId,
  ceilingHeightM: number,
): number {
  if (areaM2 <= 0) return 0;
  const requiredLumens = areaM2 * targetLux;
  const perFixture = effectiveLumensPerFixture(productId, ceilingHeightM);
  if (perFixture <= 0) return 0;
  return Math.min(120, Math.max(1, Math.ceil(requiredLumens / perFixture)));
}

export function calculateIndicativeResult(
  areaM2: number,
  targetLux: number,
  ceilingHeightM: number,
  fixtures: PlacedPublicFixture[],
): IndicativeResult {
  const totalWattage = fixtures.reduce(
    (sum, f) => sum + getPublicProduct(f.productId).watts,
    0,
  );
  const totalEffectiveLumens = fixtures.reduce(
    (sum, f) => sum + effectiveLumensPerFixture(f.productId, ceilingHeightM),
    0,
  );
  const indicativeAverageLux =
    areaM2 > 0 ? totalEffectiveLumens / areaM2 : 0;

  return {
    areaM2,
    targetLux,
    fixtureCount: fixtures.length,
    totalWattage,
    indicativeAverageLux: Math.round(indicativeAverageLux),
    meetsTarget: indicativeAverageLux >= targetLux * 0.95,
  };
}
