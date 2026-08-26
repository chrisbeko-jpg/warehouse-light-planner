import { create } from "zustand";
import { computePixelsPerMeter } from "@/lib/floor-plan-scale";
import {
  calculateIndicativeResult,
  calculateRequiredFixtureCount,
} from "@/lib/public-wizard/calculation";
import { getAtmosphere } from "@/lib/public-wizard/atmospheres";
import {
  addDownlightAt,
  createRoomPolygon,
  moveFixture,
  placeFixturesInPolygon,
  removeFixture,
} from "@/lib/public-wizard/placement";
import { getRoomFunction } from "@/lib/public-wizard/room-functions";
import type { Point2D } from "@/types/floor-plan";
import type {
  AtmosphereId,
  LeadContactForm,
  PlacedPublicFixture,
  PublicProductId,
  RoomFunctionId,
  WizardStepId,
} from "@/types/public-wizard";

export type PublicEditorMode = "select" | "calibrate" | "drawRoom" | "placeDownlight";

const WIZARD_STEPS: WizardStepId[] = [
  "room",
  "atmosphere",
  "floorplan",
  "editor",
  "result",
  "request",
];

export interface PublicWizardStore {
  step: WizardStepId;
  roomFunction: RoomFunctionId | null;
  ceilingHeightM: number;
  targetLux: number;
  atmosphere: AtmosphereId | null;
  preferredProductId: PublicProductId;
  backgroundDataUrl: string | null;
  backgroundFileName: string | null;
  backgroundWidth: number;
  backgroundHeight: number;
  pixelsPerMeter: number | null;
  calibrationDraft: Point2D[];
  calibrationDistanceMm: string;
  editorMode: PublicEditorMode;
  polygonDraft: Point2D[];
  roomVertices: Point2D[];
  aiRecognitionAttempted: boolean;
  aiRecognitionFailed: boolean;
  fixtures: PlacedPublicFixture[];
  selectedFixtureId: string | null;
  showHeatmap: boolean;
  historyPast: PlacedPublicFixture[][];
  historyFuture: PlacedPublicFixture[][];
  downlightProductId: PublicProductId;
  submitReference: string | null;
  submitEmail: string | null;

  setStep: (step: WizardStepId) => void;
  nextStep: () => boolean;
  prevStep: () => void;
  selectRoomFunction: (id: RoomFunctionId) => void;
  setCeilingHeightM: (value: number) => void;
  setTargetLux: (value: number) => void;
  selectAtmosphere: (id: AtmosphereId) => void;
  setBackground: (dataUrl: string, fileName: string, width: number, height: number) => void;
  setEditorMode: (mode: PublicEditorMode) => void;
  setCalibrationDistanceMm: (value: string) => void;
  resetCalibrationDraft: () => void;
  addCalibrationPoint: (point: Point2D) => void;
  applyCalibration: () => boolean;
  addPolygonDraftPoint: (point: Point2D) => void;
  finishPolygonDraft: () => boolean;
  cancelPolygonDraft: () => void;
  setAiRecognitionState: (attempted: boolean, failed: boolean) => void;
  setRoomVertices: (vertices: Point2D[]) => void;
  generateLightingPlan: () => boolean;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  selectFixture: (id: string | null) => void;
  moveSelectedFixture: (x: number, y: number) => void;
  moveFixtureById: (id: string, x: number, y: number) => void;
  deleteSelectedFixture: () => void;
  addDownlightAtPoint: (x: number, y: number) => void;
  setShowHeatmap: (value: boolean) => void;
  setDownlightProductId: (id: PublicProductId) => void;
  getIndicativeResult: () => ReturnType<typeof calculateIndicativeResult> | null;
  setSubmitResult: (reference: string, email: string) => void;
  resetWizard: () => void;
}

const initialFixtures: PlacedPublicFixture[] = [];

const initialState = {
  step: "room" as WizardStepId,
  roomFunction: null as RoomFunctionId | null,
  ceilingHeightM: 2.7,
  targetLux: 500,
  atmosphere: null as AtmosphereId | null,
  preferredProductId: "led_panel_4000" as PublicProductId,
  backgroundDataUrl: null as string | null,
  backgroundFileName: null as string | null,
  backgroundWidth: 0,
  backgroundHeight: 0,
  pixelsPerMeter: null as number | null,
  calibrationDraft: [] as Point2D[],
  calibrationDistanceMm: "",
  editorMode: "select" as PublicEditorMode,
  polygonDraft: [] as Point2D[],
  roomVertices: [] as Point2D[],
  aiRecognitionAttempted: false,
  aiRecognitionFailed: false,
  fixtures: initialFixtures,
  selectedFixtureId: null as string | null,
  showHeatmap: false,
  historyPast: [] as PlacedPublicFixture[][],
  historyFuture: [] as PlacedPublicFixture[][],
  downlightProductId: "downlight_4000" as PublicProductId,
  submitReference: null as string | null,
  submitEmail: null as string | null,
};

function cloneFixtures(fixtures: PlacedPublicFixture[]): PlacedPublicFixture[] {
  return fixtures.map((f) => ({ ...f }));
}

export const usePublicWizardStore = create<PublicWizardStore>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  nextStep: () => {
    const { step } = get();
    const idx = WIZARD_STEPS.indexOf(step);
    if (idx < 0 || idx >= WIZARD_STEPS.length - 1) return false;
    set({ step: WIZARD_STEPS[idx + 1]! });
    return true;
  },

  prevStep: () => {
    const { step } = get();
    const idx = WIZARD_STEPS.indexOf(step);
    if (idx <= 0) return;
    set({ step: WIZARD_STEPS[idx - 1]! });
  },

  selectRoomFunction: (id) => {
    const def = getRoomFunction(id);
    set({ roomFunction: id, targetLux: def.suggestedLux });
  },

  setCeilingHeightM: (value) => set({ ceilingHeightM: Math.max(2, Math.min(12, value)) }),

  setTargetLux: (value) => set({ targetLux: Math.max(50, Math.min(1000, value)) }),

  selectAtmosphere: (id) => {
    const atmosphere = getAtmosphere(id);
    set({
      atmosphere: id,
      preferredProductId: atmosphere.preferredProductId,
    });
  },

  setBackground: (dataUrl, fileName, width, height) =>
    set({
      backgroundDataUrl: dataUrl,
      backgroundFileName: fileName,
      backgroundWidth: width,
      backgroundHeight: height,
      calibrationDraft: [],
      polygonDraft: [],
      pixelsPerMeter: null,
    }),

  setEditorMode: (mode) =>
    set({
      editorMode: mode,
      polygonDraft: mode === "drawRoom" ? get().polygonDraft : [],
      calibrationDraft: mode === "calibrate" ? get().calibrationDraft : [],
    }),

  setCalibrationDistanceMm: (value) => set({ calibrationDistanceMm: value }),

  resetCalibrationDraft: () => set({ calibrationDraft: [], calibrationDistanceMm: "" }),

  addCalibrationPoint: (point) => {
    const draft = [...get().calibrationDraft, point].slice(0, 2);
    set({ calibrationDraft: draft });
  },

  applyCalibration: () => {
    const { calibrationDraft, calibrationDistanceMm } = get();
    if (calibrationDraft.length !== 2) return false;
    const distanceMm = Number(calibrationDistanceMm);
    if (!Number.isFinite(distanceMm) || distanceMm <= 0) return false;
    const ppm = computePixelsPerMeter(calibrationDraft[0]!, calibrationDraft[1]!, distanceMm);
    if (!ppm || ppm <= 0) return false;
    set({
      pixelsPerMeter: ppm,
      editorMode: "select",
      calibrationDraft: [],
    });
    return true;
  },

  addPolygonDraftPoint: (point) => {
    set({ polygonDraft: [...get().polygonDraft, point] });
  },

  finishPolygonDraft: () => {
    const { polygonDraft, pixelsPerMeter } = get();
    if (polygonDraft.length < 3 || !pixelsPerMeter) return false;
    set({
      roomVertices: polygonDraft,
      polygonDraft: [],
      editorMode: "select",
    });
    return true;
  },

  cancelPolygonDraft: () => set({ polygonDraft: [], editorMode: "select" }),

  setAiRecognitionState: (attempted, failed) =>
    set({ aiRecognitionAttempted: attempted, aiRecognitionFailed: failed }),

  setRoomVertices: (vertices) => set({ roomVertices: vertices }),

  generateLightingPlan: () => {
    const {
      roomVertices,
      pixelsPerMeter,
      targetLux,
      ceilingHeightM,
      preferredProductId,
    } = get();
    if (roomVertices.length < 3 || !pixelsPerMeter) return false;
    const room = createRoomPolygon(roomVertices, pixelsPerMeter);
    const count = calculateRequiredFixtureCount(
      room.areaM2,
      targetLux,
      preferredProductId,
      ceilingHeightM,
    );
    const fixtures = placeFixturesInPolygon(
      roomVertices,
      pixelsPerMeter,
      count,
      preferredProductId,
    );
    set({
      fixtures,
      historyPast: [],
      historyFuture: [],
      selectedFixtureId: null,
    });
    return true;
  },

  pushHistory: () => {
    const { fixtures, historyPast } = get();
    set({
      historyPast: [...historyPast, cloneFixtures(fixtures)].slice(-30),
      historyFuture: [],
    });
  },

  undo: () => {
    const { historyPast, fixtures, historyFuture } = get();
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1]!;
    set({
      fixtures: cloneFixtures(previous),
      historyPast: historyPast.slice(0, -1),
      historyFuture: [cloneFixtures(fixtures), ...historyFuture],
      selectedFixtureId: null,
    });
  },

  redo: () => {
    const { historyFuture, fixtures, historyPast } = get();
    if (historyFuture.length === 0) return;
    const next = historyFuture[0]!;
    set({
      fixtures: cloneFixtures(next),
      historyFuture: historyFuture.slice(1),
      historyPast: [...historyPast, cloneFixtures(fixtures)],
      selectedFixtureId: null,
    });
  },

  selectFixture: (id) => set({ selectedFixtureId: id }),

  moveSelectedFixture: (x, y) => {
    const { selectedFixtureId, fixtures } = get();
    if (!selectedFixtureId) return;
    get().pushHistory();
    set({ fixtures: moveFixture(fixtures, selectedFixtureId, x, y) });
  },

  moveFixtureById: (id, x, y) => {
    get().pushHistory();
    set({ fixtures: moveFixture(get().fixtures, id, x, y), selectedFixtureId: id });
  },

  deleteSelectedFixture: () => {
    const { selectedFixtureId, fixtures } = get();
    if (!selectedFixtureId) return;
    get().pushHistory();
    set({
      fixtures: removeFixture(fixtures, selectedFixtureId),
      selectedFixtureId: null,
    });
  },

  addDownlightAtPoint: (x, y) => {
    const { fixtures, downlightProductId } = get();
    get().pushHistory();
    set({
      fixtures: addDownlightAt(fixtures, x, y, downlightProductId),
      editorMode: "select",
    });
  },

  setShowHeatmap: (value) => set({ showHeatmap: value }),

  setDownlightProductId: (id) => set({ downlightProductId: id }),

  getIndicativeResult: () => {
    const { roomVertices, pixelsPerMeter, targetLux, ceilingHeightM, fixtures } = get();
    if (roomVertices.length < 3 || !pixelsPerMeter) return null;
    const areaM2 = createRoomPolygon(roomVertices, pixelsPerMeter).areaM2;
    return calculateIndicativeResult(areaM2, targetLux, ceilingHeightM, fixtures);
  },

  setSubmitResult: (reference, email) =>
    set({ submitReference: reference, submitEmail: email }),

  resetWizard: () => set({ ...initialState }),
}));

export const WIZARD_STEP_LABELS: { id: WizardStepId; label: string; showInProgress: boolean }[] = [
  { id: "room", label: "Ruimte", showInProgress: true },
  { id: "atmosphere", label: "Sfeer", showInProgress: true },
  { id: "floorplan", label: "Plattegrond", showInProgress: true },
  { id: "editor", label: "Lichtplan", showInProgress: true },
  { id: "result", label: "Resultaat", showInProgress: true },
  { id: "request", label: "Aanvragen", showInProgress: false },
];

export function validateLeadForm(form: LeadContactForm): string | null {
  const required: (keyof LeadContactForm)[] = [
    "companyName",
    "contactPerson",
    "address",
    "postalCode",
    "city",
    "telephone",
    "email",
    "deliveryAddress",
    "deliveryPostalCode",
    "deliveryCity",
  ];
  for (const key of required) {
    const value = form[key];
    if (typeof value !== "string" || !value.trim()) {
      return "Vul alle verplichte velden in.";
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    return "Vul een geldig e-mailadres in.";
  }
  if (!form.privacyConsent) {
    return "Geef toestemming voor het verwerken van uw gegevens.";
  }
  return null;
}
