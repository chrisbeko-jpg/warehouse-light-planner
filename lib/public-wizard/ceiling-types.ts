import type { CeilingTypeId } from "@/types/public-wizard";

export interface CeilingTypeDefinition {
  id: CeilingTypeId;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}

export const CEILING_TYPES: CeilingTypeDefinition[] = [
  {
    id: "grid_600",
    title: "Systeemplafond 60×60",
    description:
      "Voor standaard 600×600 mm plafondmodules. LED-panelen passen in het stramien; downlights worden in het midden van een plafondplaat geplaatst.",
    image: "/images/ceiling-types/plafond-60x60.webp",
    imageAlt: "Systeemplafond met vierkante platen van 60 bij 60 centimeter",
  },
  {
    id: "grid_1200_600",
    title: "Systeemplafond 120×60",
    description:
      "Voor plafondmodules van 1200×600 mm, met passende langwerpige LED-panelen of gecentreerde downlights.",
    image: "/images/ceiling-types/plafond-120x60.webp",
    imageAlt: "Langwerpig systeemplafond met platen van 120 bij 60 centimeter",
  },
  {
    id: "concrete",
    title: "Vast / betonnen plafond",
    description:
      "Geen systeemplafond? De configurator selecteert geschikte opbouwarmaturen en maakt een gelijkmatige verdeling.",
    image: "/images/ceiling-types/plafond-beton.webp",
    imageAlt: "Strak vast plafond met opbouwverlichting",
  },
];

export function getCeilingType(id: CeilingTypeId): CeilingTypeDefinition {
  return CEILING_TYPES.find((item) => item.id === id) ?? CEILING_TYPES[0]!;
}

export function isCeilingTypeId(id: string): id is CeilingTypeId {
  return CEILING_TYPES.some((item) => item.id === id);
}
