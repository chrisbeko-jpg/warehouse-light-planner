import type { PublicWizardStore } from "@/lib/public-wizard/store";

/** Fields cleared when the user confirms a scale reset (scale-dependent design data). */
export const SCALE_RESET_PATCH: Pick<
  PublicWizardStore,
  | "pixelsPerMeter"
  | "calibrationDraft"
  | "calibrationDistanceMm"
  | "calibrationLine"
  | "polygonDraft"
  | "roomVertices"
  | "roomAreaM2"
  | "fixtures"
  | "selectedFixtureId"
  | "showHeatmap"
  | "historyPast"
  | "historyFuture"
  | "lightingPlanGenerated"
  | "layoutWarning"
  | "editorMessage"
  | "aiRecognitionAttempted"
  | "aiRecognitionFailed"
  | "submitReference"
  | "submitEmail"
  | "scaleStepCollapsed"
  | "editorMode"
  | "editorPhase"
> = {
  pixelsPerMeter: null,
  calibrationDraft: [],
  calibrationDistanceMm: "",
  calibrationLine: [],
  polygonDraft: [],
  roomVertices: [],
  roomAreaM2: null,
  fixtures: [],
  selectedFixtureId: null,
  showHeatmap: false,
  historyPast: [],
  historyFuture: [],
  lightingPlanGenerated: false,
  layoutWarning: null,
  editorMessage: null,
  aiRecognitionAttempted: false,
  aiRecognitionFailed: false,
  submitReference: null,
  submitEmail: null,
  scaleStepCollapsed: false,
  editorMode: "calibrate-scale",
  editorPhase: "scale",
};

/** Wizard choices and uploaded floor plan fields that must survive a scale reset. */
export const SCALE_RESET_PRESERVE_KEYS = [
  "roomFunction",
  "ceilingHeightM",
  "targetLux",
  "atmosphere",
  "preferredProductId",
  "backgroundDataUrl",
  "backgroundFileName",
  "backgroundWidth",
  "backgroundHeight",
  "downlightProductId",
  "step",
] as const satisfies readonly (keyof PublicWizardStore)[];
