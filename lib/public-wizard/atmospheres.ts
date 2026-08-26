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
    title: "Warm kantoor",
    subtitle: "LED panels · 3000K",
    cctLabel: "3000K",
    preferredProductId: "led_panel_3000",
    presentationText: "Warmer en comfortabeler kantoorgevoel met LED panelen 3000K.",
    imageGradient: "from-amber-700/50 via-amber-900/20 to-zinc-900",
  },
  {
    id: "neutraal",
    title: "Neutraal kantoor",
    subtitle: "LED panels · 4000K",
    cctLabel: "4000K",
    preferredProductId: "led_panel_4000",
    presentationText: "Frisse, functionele kantoorverlichting met LED panelen 4000K.",
    imageGradient: "from-slate-400/30 via-zinc-700/30 to-zinc-900",
  },
  {
    id: "luxe",
    title: "Luxe kantoor",
    subtitle: "Premium warme uitstraling",
    cctLabel: "3000K",
    preferredProductId: "led_panel_3000",
    presentationText: "Premium warme sfeer; indicatief met LED panelen 3000K gecombineerd met accent downlights.",
    imageGradient: "from-yellow-600/30 via-amber-900/40 to-black",
  },
];

export function getAtmosphere(id: AtmosphereId): AtmosphereDefinition {
  return ATMOSPHERES.find((a) => a.id === id) ?? ATMOSPHERES[1]!;
}
