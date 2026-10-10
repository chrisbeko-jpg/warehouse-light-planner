import type { AtmosphereId, CeilingTypeId, PublicProductId, RoomFunctionId } from "@/types/public-wizard";

export function cctFromAtmosphere(atmosphere: AtmosphereId): 3000 | 4000 {
  return atmosphere === "warm" ? 3000 : 4000;
}

/** Office rooms use LED panels. Reception and other rooms use large downlights. */
export function selectPanelProduct(ceiling: CeilingTypeId, cct: 3000 | 4000): PublicProductId {
  if (ceiling === "grid_1200_600") {
    return cct === 3000 ? "led_panel_1200x300_3000" : "led_panel_1200x300_4000";
  }
  if (ceiling === "concrete") {
    return cct === 3000 ? "led_panel_surface_3000" : "led_panel_surface_4000";
  }
  return cct === 3000 ? "led_panel_3000" : "led_panel_4000";
}

/** Grid ceilings keep the existing recessed downlight. A solid slab uses the surface version. */
export function selectDownlightProduct(ceiling: CeilingTypeId, cct: 3000 | 4000): PublicProductId {
  if (ceiling === "concrete") {
    return cct === 3000 ? "downlight_surface_3000" : "downlight_surface_4000";
  }
  return cct === 3000 ? "downlight_3000" : "downlight_4000";
}

export function selectConfiguredProduct(
  room: RoomFunctionId,
  ceiling: CeilingTypeId,
  atmosphere: AtmosphereId,
): PublicProductId {
  const cct = cctFromAtmosphere(atmosphere);
  if (room === "workplace_office") return selectPanelProduct(ceiling, cct);
  return selectDownlightProduct(ceiling, cct);
}
