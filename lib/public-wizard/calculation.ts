import {
  CALCULATION_DISCLAIMER_ELONGATED,
  effectiveLumensPerFixtureIndicative,
  getIndicativeLumenParameters,
  INDICATIVE_LUX_TOLERANCE,
  nominalFixtureCountFromLumenMethod,
} from "@/lib/public-wizard/indicative-lumen-method";
import { getPublicProduct, isElongatedPanel } from "@/lib/public-wizard/products";
import type { IndicativeResult, PlacedPublicFixture, PublicProductId } from "@/types/public-wizard";

/** @deprecated use indicative-lumen-method constants */
export const UTILISATION_FACTOR = 0.6;
export const MAINTENANCE_FACTOR = 0.8;

export const CALCULATION_DISCLAIMER =
  "Deze berekening is indicatief en gebaseerd op de lumenmethode. Het is geen formele EN 12464-1-validatie. De definitieve projectspecificatie wordt door Lightsale gecontroleerd.";

export function calculationDisclaimerForProduct(productId: PublicProductId): string {
  return isElongatedPanel(productId) ? CALCULATION_DISCLAIMER_ELONGATED : CALCULATION_DISCLAIMER;
}

export function effectiveLumensPerFixture(
  productId: PublicProductId,
  ceilingHeightM: number,
): number {
  return effectiveLumensPerFixtureIndicative(productId, ceilingHeightM);
}

export function calculateRequiredFixtureCount(
  areaM2: number,
  targetLux: number,
  productId: PublicProductId,
  ceilingHeightM: number,
): number {
  return nominalFixtureCountFromLumenMethod(areaM2, targetLux, productId, ceilingHeightM);
}

export function calculateIndicativeResult(
  areaM2: number,
  targetLux: number,
  ceilingHeightM: number,
  fixtures: PlacedPublicFixture[],
  requiredFixtureCount?: number,
): IndicativeResult {
  const primaryProduct = fixtures[0]?.productId;
  const params = primaryProduct
    ? getIndicativeLumenParameters(primaryProduct, ceilingHeightM)
    : null;

  const totalWattage = fixtures.reduce(
    (sum, f) => sum + getPublicProduct(f.productId).watts,
    0,
  );
  const totalEffectiveLumens = fixtures.reduce(
    (sum, f) => sum + effectiveLumensPerFixtureIndicative(f.productId, ceilingHeightM),
    0,
  );
  const totalLumens = fixtures.reduce(
    (sum, f) => sum + getPublicProduct(f.productId).lumens,
    0,
  );
  const indicativeAverageLux =
    areaM2 > 0 ? totalEffectiveLumens / areaM2 : 0;

  return {
    areaM2,
    targetLux,
    fixtureCount: fixtures.length,
    requiredFixtureCount,
    totalWattage,
    totalLumens,
    lumensPerFixture: params?.lumensPerFixture,
    utilisationFactor: params?.utilisationFactor,
    maintenanceFactor: params?.maintenanceFactor,
    indicativeAverageLux: Math.round(indicativeAverageLux),
    meetsTarget: indicativeAverageLux >= targetLux * INDICATIVE_LUX_TOLERANCE,
  };
}
