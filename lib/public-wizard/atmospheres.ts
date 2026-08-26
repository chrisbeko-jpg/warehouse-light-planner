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
    title: "Warm & comfortabel",
    subtitle: "LED-panelen · 3000K",
    cctLabel: "3000K",
    preferredProductId: "led_panel_3000",
    presentationText: "Warmer en comfortabeler kantoorgevoel met LED-panelen 3000K.",
    imageGradient: "from-emerald-100 to-white",
  },
  {
    id: "neutraal",
    title: "Helder & functioneel",
    subtitle: "LED-panelen · 4000K",
    cctLabel: "4000K",
    preferredProductId: "led_panel_4000",
    presentationText: "Frisse, functionele kantoorverlichting met LED-panelen 4000K.",
    imageGradient: "from-slate-100 to-white",
  },
  {
    id: "luxe",
    title: "Luxe & architectonisch",
    subtitle: "Pendelprofielen / design uitstraling",
    cctLabel: "3000K",
    preferredProductId: "led_panel_3000",
    presentationText: "Premium warme sfeer met architectonische uitstraling; indicatief met LED-panelen 3000K.",
    imageGradient: "from-emerald-50 to-stone-100",
  },
];

export function getAtmosphere(id: AtmosphereId): AtmosphereDefinition {
  return ATMOSPHERES.find((a) => a.id === id) ?? ATMOSPHERES[1]!;
}
