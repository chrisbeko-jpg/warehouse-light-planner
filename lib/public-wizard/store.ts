import { create } from "zustand";
import { computePixelsPerMeter } from "@/lib/floor-plan-scale";
import {
  calculateIndicativeResult,
  calculateRequiredFixtureCount,
} from "@/lib/public-wizard/calculation";
import { getAtmosphere } from "@/lib/public-wizard/atmospheres";
import {
  createRoomPolygon,
  duplicateFixture,
  findFreeGridPosition,
  moveFixture,
  placeFixturesWithLayoutInfo,
  removeFixture,
  snapFixtureCenter,
} from "@/lib/public-wizard/placement";
import { getRoomFunction } from "@/lib/public-wizard/room-functions";
import type { Point2D } from "@/types/floor-plan";
import type {
  AtmosphereId,
  PlacedPublicFixture,
  PublicProductId,
  RoomFunctionId,
  WizardStepId,
} from "@/types/public-wizard";
import { computeFitView, parseDistanceMeters, type EditorViewState } from "@/lib/public-wizard/viewport";

export type PublicEditorMode = "select" | "calibrate-scale" | "draw-room" | "pan";

export type EditorPhase = "scale" | "room" | "plan";

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
  viewState: EditorViewState;
  editorPhase: EditorPhase;
  sidePanelCollapsed: boolean;
  scaleStepCollapsed: boolean;
  calibrationLine: Point2D[];
  roomAreaM2: number | null;
  lightingPlanGenerated: boolean;
  layoutWarning: string | null;
  editorMessage: string | null;

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
  moveFixtureByIdWithHistory: (id: string, x: number, y: number) => void;
  deleteSelectedFixture: () => void;
  addPanel: () => boolean;
  addDownlight: () => boolean;
  duplicateSelectedFixture: () => void;
  goToEditor: () => void;
  clearEditorMessage: () => void;
  setShowHeatmap: (value: boolean) => void;
  setDownlightProductId: (id: PublicProductId) => void;
  setViewState: (view: EditorViewState) => void;
  updateViewState: (patch: Partial<EditorViewState>) => void;
  fitViewToScreen: (viewportWidth: number, viewportHeight: number) => void;
  setEditorPhase: (phase: EditorPhase) => void;
  setSidePanelCollapsed: (value: boolean) => void;
  setScaleStepCollapsed: (value: boolean) => void;
  setCalibrationLine: (points: Point2D[]) => void;
  reopenScaleCalibration: () => void;
  reopenRoomDrawing: () => void;
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
  viewState: { scale: 1, positionX: 0, positionY: 0 } as EditorViewState,
  editorPhase: "scale" as EditorPhase,
  sidePanelCollapsed: false,
  scaleStepCollapsed: false,
  calibrationLine: [] as Point2D[],
  roomAreaM2: null as number | null,
  lightingPlanGenerated: false,
  layoutWarning: null as string | null,
  editorMessage: null as string | null,
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
    if (id === "premium_architectural") return;
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
      roomVertices: [],
      roomAreaM2: null,
      fixtures: [],
      lightingPlanGenerated: false,
      editorPhase: "scale",
      editorMode: "calibrate-scale",
      calibrationLine: [],
      showHeatmap: false,
    }),

  setEditorMode: (mode) =>
    set({
      editorMode: mode,
      polygonDraft: mode === "draw-room" ? get().polygonDraft : [],
      calibrationDraft: mode === "calibrate-scale" ? get().calibrationDraft : [],
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
    const meters = parseDistanceMeters(calibrationDistanceMm);
    if (!meters) return false;
    const ppm = computePixelsPerMeter(calibrationDraft[0]!, calibrationDraft[1]!, meters * 1000);
    if (!ppm || ppm <= 0) return false;
    set({
      pixelsPerMeter: ppm,
      editorMode: "draw-room",
      editorPhase: "room",
      scaleStepCollapsed: true,
      calibrationDraft: [],
      calibrationLine: calibrationDraft,
      calibrationDistanceMm: "",
    });
    return true;
  },

  addPolygonDraftPoint: (point) => {
    set({ polygonDraft: [...get().polygonDraft, point] });
  },

  finishPolygonDraft: () => {
    const { polygonDraft, pixelsPerMeter } = get();
    if (polygonDraft.length < 3 || !pixelsPerMeter) return false;
    const areaM2 = createRoomPolygon(polygonDraft, pixelsPerMeter).areaM2;
    set({
      roomVertices: polygonDraft,
      polygonDraft: [],
      editorMode: "select",
      editorPhase: "plan",
      roomAreaM2: areaM2,
    });
    return true;
  },

  cancelPolygonDraft: () => set({ polygonDraft: [], editorMode: "select" }),

  setAiRecognitionState: (attempted, failed) =>
    set({ aiRecognitionAttempted: attempted, aiRecognitionFailed: failed }),

  setRoomVertices: (vertices) => {
    const { pixelsPerMeter } = get();
    const areaM2 =
      vertices.length >= 3 && pixelsPerMeter
        ? createRoomPolygon(vertices, pixelsPerMeter).areaM2
        : null;
    set({
      roomVertices: vertices,
      roomAreaM2: areaM2,
      editorPhase: vertices.length >= 3 ? "plan" : get().editorPhase,
      editorMode: "select",
    });
  },

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
    const layout = placeFixturesWithLayoutInfo(
      roomVertices,
      pixelsPerMeter,
      count,
      preferredProductId,
    );
    set({
      fixtures: layout.fixtures,
      historyPast: [],
      historyFuture: [],
      selectedFixtureId: null,
      lightingPlanGenerated: true,
      layoutWarning: layout.warning ?? null,
      editorMode: "select",
      editorPhase: "plan",
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
    const { fixtures, pixelsPerMeter, roomVertices } = get();
    if (!pixelsPerMeter) return;
    const fixture = fixtures.find((f) => f.id === id);
    if (!fixture) return;
    const previous = { x: fixture.x, y: fixture.y };
    const snapped = snapFixtureCenter(
      x,
      y,
      pixelsPerMeter,
      roomVertices,
      fixture.productId,
      previous,
      fixtures,
      id,
    );
    if (!snapped) {
      set({ editorMessage: "Geen geldige rasterpositie. Armatuur teruggezet." });
      return;
    }
    set({
      fixtures: moveFixture(fixtures, id, snapped.x, snapped.y),
      selectedFixtureId: id,
      editorMessage: null,
    });
  },

  moveFixtureByIdWithHistory: (id, x, y) => {
    const before = cloneFixtures(get().fixtures);
    get().moveFixtureById(id, x, y);
    const source = before.find((f) => f.id === id);
    const updated = get().fixtures.find((f) => f.id === id);
    if (!source || !updated) return;
    if (source.x === updated.x && source.y === updated.y) return;
    set({
      historyPast: [...get().historyPast, before],
      historyFuture: [],
    });
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

  addPanel: () => {
    const { fixtures, preferredProductId, pixelsPerMeter, roomVertices } = get();
    if (!pixelsPerMeter || roomVertices.length < 3) return false;
    const position = findFreeGridPosition(
      roomVertices,
      pixelsPerMeter,
      fixtures,
      preferredProductId,
    );
    if (!position) {
      set({
        editorMessage: "Er is geen vrije rasterpositie beschikbaar. Verplaats eerst een bestaand armatuur.",
      });
      return false;
    }
    get().pushHistory();
    const newFixture = {
      id: `fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productId: preferredProductId,
      x: position.x,
      y: position.y,
      rotation: 0,
    };
    set({
      fixtures: [...fixtures, newFixture],
      selectedFixtureId: newFixture.id,
      editorMode: "select",
      editorMessage: null,
    });
    return true;
  },

  addDownlight: () => {
    const { fixtures, downlightProductId, pixelsPerMeter, roomVertices } = get();
    if (!pixelsPerMeter || roomVertices.length < 3) return false;
    const position = findFreeGridPosition(
      roomVertices,
      pixelsPerMeter,
      fixtures,
      downlightProductId,
    );
    if (!position) {
      set({
        editorMessage: "Er is geen vrije rasterpositie beschikbaar. Verplaats eerst een bestaand armatuur.",
      });
      return false;
    }
    get().pushHistory();
    const newFixture = {
      id: `fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productId: downlightProductId,
      x: position.x,
      y: position.y,
      rotation: 0,
    };
    set({
      fixtures: [...fixtures, newFixture],
      selectedFixtureId: newFixture.id,
      editorMode: "select",
      editorMessage: null,
    });
    return true;
  },

  duplicateSelectedFixture: () => {
    const { selectedFixtureId, fixtures, pixelsPerMeter, roomVertices } = get();
    if (!selectedFixtureId || !pixelsPerMeter) return;
    get().pushHistory();
    const next = duplicateFixture(fixtures, selectedFixtureId, pixelsPerMeter, roomVertices);
    if (next.length === fixtures.length) {
      set({
        editorMessage: "Er is geen vrije rasterpositie beschikbaar. Verplaats eerst een bestaand armatuur.",
      });
      return;
    }
    const added = next[next.length - 1]!;
    set({
      fixtures: next,
      selectedFixtureId: added.id,
      editorMessage: null,
    });
  },

  goToEditor: () =>
    set({
      step: "editor",
      editorMode: "select",
      editorPhase: "plan",
    }),

  clearEditorMessage: () => set({ editorMessage: null }),

  setShowHeatmap: (value) => set({ showHeatmap: value }),

  setDownlightProductId: (id) => set({ downlightProductId: id }),

  setViewState: (view) => set({ viewState: view }),

  updateViewState: (patch) =>
    set({ viewState: { ...get().viewState, ...patch } }),

  fitViewToScreen: (viewportWidth, viewportHeight) => {
    const { backgroundWidth, backgroundHeight } = get();
    if (!backgroundWidth || !backgroundHeight) return;
    set({
      viewState: computeFitView(viewportWidth, viewportHeight, backgroundWidth, backgroundHeight),
    });
  },

  setEditorPhase: (phase) => set({ editorPhase: phase }),

  setSidePanelCollapsed: (value) => set({ sidePanelCollapsed: value }),

  setScaleStepCollapsed: (value) => set({ scaleStepCollapsed: value }),

  setCalibrationLine: (points) => set({ calibrationLine: points }),

  reopenScaleCalibration: () =>
    set({
      editorMode: "calibrate-scale",
      editorPhase: "scale",
      calibrationDraft: [],
      scaleStepCollapsed: false,
    }),

  reopenRoomDrawing: () =>
    set({
      editorMode: "draw-room",
      editorPhase: "room",
      polygonDraft: get().roomVertices.length >= 3 ? [...get().roomVertices] : [],
      fixtures: [],
      lightingPlanGenerated: false,
      showHeatmap: false,
      selectedFixtureId: null,
    }),

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

export { validateLeadForm } from "@/lib/public-wizard/lead-form";
