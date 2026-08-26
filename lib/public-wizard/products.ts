import type { PublicFixtureCategory, PublicProductId } from "@/types/public-wizard";

export interface PublicProductDefinition {
  id: PublicProductId;
  name: string;
  category: PublicFixtureCategory;
  cct: 3000 | 4000;
  lumens: number;
  watts: number;
  beamAngleDeg: number;
  widthM: number;
  heightM: number;
  diameterM?: number;
}

/** Central public catalogue — four products only. */
export const PUBLIC_PRODUCTS: PublicProductDefinition[] = [
  {
    id: "led_panel_3000",
    name: "LED Panel 3000K",
    category: "led_panel",
    cct: 3000,
    lumens: 3600,
    watts: 36,
    beamAngleDeg: 90,
    widthM: 0.595,
    heightM: 0.595,
  },
  {
    id: "led_panel_4000",
    name: "LED Panel 4000K",
    category: "led_panel",
    cct: 4000,
    lumens: 3800,
    watts: 36,
    beamAngleDeg: 90,
    widthM: 0.595,
    heightM: 0.595,
  },
  {
    id: "downlight_3000",
    name: "Downlight 3000K",
    category: "downlight",
    cct: 3000,
    lumens: 1800,
    watts: 18,
    beamAngleDeg: 120,
    widthM: 0.22,
    heightM: 0.22,
    diameterM: 0.22,
  },
  {
    id: "downlight_4000",
    name: "Downlight 4000K",
    category: "downlight",
    cct: 4000,
    lumens: 1900,
    watts: 18,
    beamAngleDeg: 120,
    widthM: 0.22,
    heightM: 0.22,
    diameterM: 0.22,
  },
];

export const PUBLIC_PRODUCT_BY_ID: Record<PublicProductId, PublicProductDefinition> =
  Object.fromEntries(PUBLIC_PRODUCTS.map((p) => [p.id, p])) as Record<
    PublicProductId,
    PublicProductDefinition
  >;

export function getPublicProduct(id: PublicProductId): PublicProductDefinition {
  return PUBLIC_PRODUCT_BY_ID[id];
}
