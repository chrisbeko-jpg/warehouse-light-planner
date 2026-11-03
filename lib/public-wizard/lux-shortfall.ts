import { calculateRequiredFixtureCount } from "@/lib/public-wizard/calculation";
import type { PublicProductId } from "@/types/public-wizard";

export interface LuxShortfallSummary {
  indicativeLux: number;
  targetLux: number;
  luxGap: number;
  placedCount: number;
  nominalRequiredCount: number;
  suggestedExtraFixtures: number;
}

export function summarizeLuxShortfall(
  areaM2: number,
  targetLux: number,
  ceilingHeightM: number,
  productId: PublicProductId,
  placedCount: number,
  indicativeLux: number,
): LuxShortfallSummary {
  const nominalRequiredCount = calculateRequiredFixtureCount(
    areaM2,
    targetLux,
    productId,
    ceilingHeightM,
  );
  const luxGap = Math.max(0, targetLux - indicativeLux);
  const suggestedExtraFixtures = Math.max(0, nominalRequiredCount - placedCount);
  return {
    indicativeLux,
    targetLux,
    luxGap,
    placedCount,
    nominalRequiredCount,
    suggestedExtraFixtures,
  };
}

export function formatLuxShortfallWarning(summary: LuxShortfallSummary): string {
  return (
    `Verlichtingsniveau lager dan doelwaarde. Deze indeling levert naar verwachting ${summary.indicativeLux} lux. ` +
    `De ingestelde doelwaarde is ${summary.targetLux} lux (tekort ca. ${summary.luxGap} lux). ` +
    `Geplaatst: ${summary.placedCount} panelen. ` +
    `Voor het behalen van deze doelwaarde adviseren wij circa ${summary.suggestedExtraFixtures} extra panelen ` +
    `of een aangepaste lichtverdeling (indicatieve lumenmethode, geen volledige fotometrische toetsing).`
  );
}
