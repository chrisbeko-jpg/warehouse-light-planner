import { BRAND } from "@/lib/brand-colors";

export const FLOOR_PLAN_COLORS = {
  backgroundDim: "rgba(17, 17, 17, 0.04)",
  roomFill: "rgba(245, 196, 0, 0.22)",
  roomFillSelected: "rgba(245, 196, 0, 0.38)",
  roomStroke: BRAND.dark,
  roomStrokeSelected: BRAND.black,
  draftStroke: BRAND.yellow,
  draftVertex: BRAND.yellow,
  calibrationLine: BRAND.success,
  calibrationPoint: BRAND.white,
  vertexHandle: BRAND.white,
  vertexHandleStroke: BRAND.black,
  labelText: BRAND.black,
  stageBg: BRAND.bg,
} as const;
