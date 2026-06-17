import { getHeightFactor } from "@/lib/height-factor";
import type { LuxLevel, PlacedRectangle, WarehouseDimensions, LightingResults } from "@/types";

const LUMENS_PER_MODULE = 9000;
const OPAQUE_HEIGHT_THRESHOLD = 6;

export function calculateRectangleArea(rectangles: PlacedRectangle[]): number {
  return rectangles.reduce((sum, rect) => sum + rect.width * rect.height, 0);
}

export function calculateLighting(
  dimensions: WarehouseDimensions,
  lux: LuxLevel,
  rectangles: PlacedRectangle[],
): LightingResults {
  const grossArea = dimensions.length * dimensions.width;
  const heightFactor = getHeightFactor(dimensions.height);

  const shelves = rectangles.filter((r) => r.type === "shelf");
  const obstructions = rectangles.filter((r) => r.type === "obstruction");

  const shelfArea = calculateRectangleArea(shelves);
  const obstructionArea = calculateRectangleArea(obstructions);
  const netArea = Math.max(0, grossArea - shelfArea - obstructionArea);

  const requiredLumens = netArea * lux;
  const requiredGrossLumens = heightFactor > 0 ? requiredLumens / heightFactor : 0;
  const moduleCount =
    netArea > 0 ? Math.ceil(requiredGrossLumens / LUMENS_PER_MODULE) : 0;

  const fixtureAdvice =
    dimensions.height <= OPAQUE_HEIGHT_THRESHOLD
      ? "120° armatuur (tot en met 6 m magazijnhoogte)"
      : "90° armatuur (boven 6 m magazijnhoogte)";

  return {
    grossArea,
    shelfArea,
    obstructionArea,
    netArea,
    requiredLumens,
    requiredGrossLumens,
    heightFactor,
    moduleCount,
    fixtureAdvice,
  };
}

export function formatArea(value: number): string {
  return `${value.toFixed(1)} m²`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("nl-NL", { maximumFractionDigits: 0 });
}
