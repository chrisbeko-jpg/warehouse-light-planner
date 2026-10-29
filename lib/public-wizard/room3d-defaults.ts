import type { Room3DSettings } from "@/types/public-wizard";

export const DEFAULT_ROOM_3D_SETTINGS: Room3DSettings = {
  wallColor: "#FFFFFF",
  ceilingColor: "#E5E7EB",
  floor: {
    type: "gray",
    color: "#A3A3A3",
  },
  windows: [],
  showCeiling: true,
  dayLightEnabled: false,
};
