import { getHeightFactor } from "@/lib/height-factor";
import type { LuxLevel, LightInstallationSummary, FixtureType } from "@/types";

export const MODULE_WATTAGE_MAX = 60;
export const MODULE_WATTAGE_MIN = 30;
export const LUMENS_PER_MODULE_AT_60W = 9000;
export const OPAQUE_HEIGHT_THRESHOLD = 6;

export function getFixtureType(warehouseHeight: number): FixtureType {
  return warehouseHeight <= OPAQUE_HEIGHT_THRESHOLD ? "opaque" : "90degree";
}

export function calculateLightInstallationSummary(
  totalModules: number,
  netArea: number,
  targetLux: LuxLevel,
  warehouseHeight: number,
  blankPlates: number = 0,
  measuredAverageLux?: number,
): LightInstallationSummary {
  const fixtureType = getFixtureType(warehouseHeight);
  const heightFactor = getHeightFactor(warehouseHeight);
  const totalPositions = totalModules + blankPlates;
  const installedPowerW = totalModules * MODULE_WATTAGE_MAX;
  const totalLumensAt60W = totalModules * LUMENS_PER_MODULE_AT_60W;
  const effectiveLumensAt60W = totalLumensAt60W * heightFactor;
  const averageLuxAt60W =
    measuredAverageLux ?? (netArea > 0 ? effectiveLumensAt60W / netArea : 0);

  let advisedWattsPerModule = MODULE_WATTAGE_MAX;
  let advice = "";

  if (netArea <= 0 || totalModules === 0) {
    advice = "Geen netto oppervlak of geen lichtlijnen om te berekenen.";
  } else if (averageLuxAt60W > targetLux) {
    advisedWattsPerModule = Math.round(
      (MODULE_WATTAGE_MAX * targetLux) / averageLuxAt60W,
    );
    advisedWattsPerModule = Math.max(
      MODULE_WATTAGE_MIN,
      Math.min(MODULE_WATTAGE_MAX, advisedWattsPerModule),
    );
    advice = `Advies: dim modules terug naar circa ${advisedWattsPerModule}W per module.`;
  } else if (averageLuxAt60W < targetLux) {
    advice = "Advies: extra lichtlijn of hogere output nodig.";
  } else {
    advice = "Huidige configuratie komt overeen met gewenst lux-niveau bij 60W.";
  }

  const expectedLuxAfterDimming =
    averageLuxAt60W * (advisedWattsPerModule / MODULE_WATTAGE_MAX);

  return {
    totalPositions,
    totalModules,
    blankPlates,
    installedPowerW,
    totalLumensAt60W,
    effectiveLumensAt60W,
    heightFactor,
    averageLuxAt60W,
    targetLux,
    advisedWattsPerModule,
    advisedTotalPowerW: totalModules * advisedWattsPerModule,
    expectedLuxAfterDimming,
    advice,
    fixtureType,
  };
}

export function getHeatmapRadii(fixtureType: FixtureType) {
  if (fixtureType === "90degree") {
    return { radiusX: 2.5, radiusY: 1.2 };
  }
  return { radiusX: 4.5, radiusY: 3.5 };
}
