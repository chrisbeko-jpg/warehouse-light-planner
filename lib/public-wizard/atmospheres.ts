import type { AtmosphereId, PublicProductId } from "@/types/public-wizard";

export interface AtmosphereDefinition {
  id: AtmosphereId;
  title: string;
  subtitle: string;
  cctLabel: string;
  preferredProductId: PublicProductId;
  presentationText: string;
  imageGradient: string;
}

export const ATMOSPHERES: AtmosphereDefinition[] = [
  {
    id: "warm",
    title: "Warm wit",
    subtitle: "3000K",
    cctLabel: "3000K",
    preferredProductId: "led_panel_3000",
    presentationText: "Een warme lichtkleur voor een comfortabele uitstraling.",
    imageGradient: "from-emerald-100 to-white",
  },
  {
    id: "neutraal",
    title: "Neutraal wit",
    subtitle: "4000K",
    cctLabel: "4000K",
    preferredProductId: "led_panel_4000",
    presentationText: "Een heldere, neutrale lichtkleur voor functionele werkomgevingen.",
    imageGradient: "from-slate-100 to-white",
  },
  {
    id: "premium_architectural",
    title: "Premium / architecturaal",
    subtitle: "Maatwerk armaturen",
    cctLabel: "3000K",
    preferredProductId: "led_panel_3000",
    presentationText:
      "Voor projecten met specifieke architecturale armaturen en uitgebreid lichtadvies.",
    imageGradient: "from-stone-200 to-stone-100",
  },
];

export function getAtmosphere(id: AtmosphereId): AtmosphereDefinition {
  const normalized = (id as string) === "luxe" ? "premium_architectural" : id;
  return ATMOSPHERES.find((a) => a.id === normalized) ?? ATMOSPHERES[1]!;
}
