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
    description: "Plafondplaten van 60 × 60 cm.",
    image: "/ledpaneel/images/kantoorverlichting-helder.webp",
    imageAlt: "Systeemplafond met vierkante platen van 60 bij 60 centimeter",
  },
  {
    id: "grid_1200_600",
    title: "Systeemplafond 120×60",
    description: "Plafondplaten van 120 × 60 cm.",
    image: "/ledpaneel/images/kantoor-project-verlichting.webp",
    imageAlt: "Langwerpig systeemplafond met platen van 120 bij 60 centimeter",
  },
  {
    id: "concrete",
    title: "Betonnen / vast plafond",
    description: "Geen systeemplafond? Wij gebruiken passende opbouwarmaturen.",
    image: "/ledpaneel/images/entree-verlichting.webp",
    imageAlt: "Strak vast plafond met opbouwverlichting",
  },
];

export function getCeilingType(id: CeilingTypeId): CeilingTypeDefinition {
  return CEILING_TYPES.find((item) => item.id === id) ?? CEILING_TYPES[0]!;
}

export function isCeilingTypeId(id: string): id is CeilingTypeId {
  return CEILING_TYPES.some((item) => item.id === id);
}
