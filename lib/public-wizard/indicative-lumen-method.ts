import { getHeightFactor } from "@/lib/height-factor";
import { getPublicProduct, isElongatedPanel } from "@/lib/public-wizard/products";
import type { PublicProductId } from "@/types/public-wizard";

/** Work plane for office-style indicative calculations (m). */
export const INDICATIVE_WORK_PLANE_HEIGHT_M = 0.75;

/** Documented maintenance factor (lumen method). */
export const INDICATIVE_MAINTENANCE_FACTOR = 0.8;

/** Default utilisation for legacy 600×600 catalogue (confirmed photometry). */
export const LEGACY_UTILISATION_FACTOR = 0.6;

export const INDICATIVE_REFLECTANCE = {
  ceiling: 0.7,
  walls: 0.5,
  floor: 0.2,
} as const;

export const INDICATIVE_LUX_TOLERANCE = 0.95;

export const ELONGATED_COUNT_SEARCH_DELTA = 3;

export const CALCULATION_DISCLAIMER_ELONGATED =
  "Indicatieve lichtberekening op basis van de lumenmethode (N = E×A / Φ×UF×MF). Geen gevalideerde Relux- of DIALux-berekening. Voor definitieve toetsing aan projecteisen is een fotometrische lichtberekening noodzakelijk.";

export interface IndicativeLumenParameters {
  lumensPerFixture: number;
  utilisationFactor: number;
  maintenanceFactor: number;
  mountingHeightM: number;
  method: "elongated_lumen" | "legacy_panel";
}

/** Room-index style indicative UF; decreases as mounting height increases. */
export function indicativeUtilisationFactor(ceilingHeightM: number): number {
  const mountingM = Math.max(0.5, ceilingHeightM - INDICATIVE_WORK_PLANE_HEIGHT_M);
  if (mountingM <= 2.0) return 0.52;
  if (mountingM <= 2.5) return 0.48;
  if (mountingM <= 3.0) return 0.45;
  if (mountingM <= 3.5) return 0.41;
  if (mountingM <= 4.0) return 0.38;
  return 0.34;
}

export function getIndicativeLumenParameters(
  productId: PublicProductId,
  ceilingHeightM: number,
): IndicativeLumenParameters {
  const product = getPublicProduct(productId);
  const mountingHeightM = Math.max(0.5, ceilingHeightM - INDICATIVE_WORK_PLANE_HEIGHT_M);
  if (isElongatedPanel(productId)) {
    return {
      lumensPerFixture: product.lumens,
      utilisationFactor: indicativeUtilisationFactor(ceilingHeightM),
      maintenanceFactor: INDICATIVE_MAINTENANCE_FACTOR,
      mountingHeightM,
      method: "elongated_lumen",
    };
  }
  return {
    lumensPerFixture: product.lumens,
    utilisationFactor: LEGACY_UTILISATION_FACTOR,
    maintenanceFactor: INDICATIVE_MAINTENANCE_FACTOR,
    mountingHeightM,
    method: "legacy_panel",
  };
}

/** Effective lumens reaching the work plane per fixture (indicative). */
export function effectiveLumensPerFixtureIndicative(
  productId: PublicProductId,
  ceilingHeightM: number,
): number {
  const p = getIndicativeLumenParameters(productId, ceilingHeightM);
  if (p.method === "legacy_panel") {
    return p.lumensPerFixture * p.utilisationFactor * p.maintenanceFactor * getHeightFactor(ceilingHeightM);
  }
  return p.lumensPerFixture * p.utilisationFactor * p.maintenanceFactor;
}

/** Nominal count from N = (E×A)/(Φ×UF×MF), rounded (not forced upward). */
export function nominalFixtureCountFromLumenMethod(
  areaM2: number,
  targetLux: number,
  productId: PublicProductId,
  ceilingHeightM: number,
): number {
  if (areaM2 <= 0 || targetLux <= 0) return 0;
  const p = getIndicativeLumenParameters(productId, ceilingHeightM);
  const denominator = p.lumensPerFixture * p.utilisationFactor * p.maintenanceFactor;
  if (denominator <= 0) return 0;
  const raw = (targetLux * areaM2) / denominator;
  return Math.min(120, Math.max(1, Math.round(raw)));
}

export function fixtureCountCandidates(
  nominalCount: number,
  delta = ELONGATED_COUNT_SEARCH_DELTA,
): number[] {
  const counts = new Set<number>();
  for (let d = 0; d <= delta; d++) {
    if (nominalCount - d >= 1) counts.add(nominalCount - d);
    if (d > 0 && nominalCount + d <= 120) counts.add(nominalCount + d);
  }
  return [...counts].sort((a, b) => a - b);
}

export function indicativeAverageLuxFromFixtureCount(
  fixtureCount: number,
  areaM2: number,
  productId: PublicProductId,
  ceilingHeightM: number,
): number {
  if (areaM2 <= 0 || fixtureCount <= 0) return 0;
  const totalEffective = fixtureCount * effectiveLumensPerFixtureIndicative(productId, ceilingHeightM);
  return totalEffective / areaM2;
}
