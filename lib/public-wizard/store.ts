import { create } from "zustand";
import { computePixelsPerMeter } from "@/lib/floor-plan-scale";
import {
  calculateIndicativeResult,
  calculateRequiredFixtureCount,
} from "@/lib/public-wizard/calculation";
import {
  cctFromAtmosphere,
  selectConfiguredProduct,
  selectDownlightProduct,
  selectPanelProduct,
} from "@/lib/public-wizard/product-selection";
import {
  createRoomPolygon,
  duplicateFixture,
  findFreeGridPosition,
  moveFixture,
  placeFixturesWithLayoutInfo,
  removeFixture,
  snapFixtureCenter,
} from "@/lib/public-wizard/placement";
import { panelRotationForRoom } from "@/lib/public-wizard/matrix-placement";
import { proposeMixedPanelDownlightPlan } from "@/lib/public-wizard/mixed-lighting-plan";
import { getPublicProduct, isElongatedPanel } from "@/lib/public-wizard/products";
import { getRoomFunction } from "@/lib/public-wizard/room-functions";
import { buildManualRoomScene } from "@/lib/public-wizard/manual-room";
import {
  getNextWizardStep,
  getPrevWizardStep,
  isWizardFlowStep,
} from "@/lib/public-wizard/wizard-navigation";
import type { Point2D } from "@/types/floor-plan";
import { DEFAULT_ROOM_3D_SETTINGS } from "@/lib/public-wizard/room3d-defaults";
import {
  DEFAULT_WINDOW_3D,
  validateWindowOnWall,
  wallSegmentsM,
  makeRoom3DOrigin,
} from "@/lib/public-wizard/room3d-coords";
import type {
  AtmosphereId,
  CeilingTypeId,
  EditorPlanView,
  ManualDimensions,
  PlacedPublicFixture,
  PublicProductId,
  Room3DSettings,
  Room3DWindow,
  RoomFunctionId,
  WizardInputMethod,
  WizardStepId,
} from "@/types/public-wizard";
import {
  computeFitView,
  EDITOR_VIEWPORT,
  parseDistanceMeters,
  type EditorViewState,
} from "@/lib/public-wizard/viewport";
import { SCALE_RESET_PATCH } from "@/lib/public-wizard/scale-reset-patch";

export type PublicEditorMode = "select" | "calibrate-scale" | "draw-room" | "pan";

export type EditorPhase = "scale" | "room" | "plan";

export interface PublicWizardStore {
  step: WizardStepId;
  roomFunction: RoomFunctionId | null;
  inputMethod: WizardInputMethod | null;
  manualDimensions: ManualDimensions | null;
  ceilingHeightM: number;
  targetLux: number;
  atmosphere: AtmosphereId | null;
  ceilingType: CeilingTypeId | null;
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
  requiredFixtureCount: number | null;
  editorMessage: string | null;
  primaryPanelFixtures: PlacedPublicFixture[] | null;
  alternativeMixedFixtures: PlacedPublicFixture[] | null;
  lightingPlanVariant: "panels" | "mixed";
  editorPlanView: EditorPlanView;
  room3D: Room3DSettings;

  setStep: (step: WizardStepId) => void;
  nextStep: () => boolean;
  prevStep: () => void;
  selectRoomFunction: (id: RoomFunctionId) => void;
  selectInputMethod: (method: WizardInputMethod) => void;
  applyManualDimensions: (dimensions: ManualDimensions) => boolean;
  setCeilingHeightM: (value: number) => void;
  setTargetLux: (value: number) => void;
  selectAtmosphere: (id: AtmosphereId) => void;
  selectCeilingType: (id: CeilingTypeId) => void;
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
  goToEditor3D: () => void;
  setEditorPlanView: (view: EditorPlanView) => void;
  patchRoom3D: (patch: Partial<Room3DSettings>) => void;
  setRoom3DFloor: (patch: Partial<Room3DSettings["floor"]>) => void;
  addRoom3DWindow: () => boolean;
  updateRoom3DWindow: (id: string, patch: Partial<Omit<Room3DWindow, "id">>) => boolean;
  removeRoom3DWindow: (id: string) => void;
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
  resetScaleDependentState: () => void;
  reopenRoomDrawing: () => void;
  getIndicativeResult: () => ReturnType<typeof calculateIndicativeResult> | null;
  setLightingPlanVariant: (variant: "panels" | "mixed") => void;
  setSubmitResult: (reference: string, email: string) => void;
  resetWizard: () => void;
}

const initialFixtures: PlacedPublicFixture[] = [];

const initialState = {
  step: "room" as WizardStepId,
  roomFunction: null as RoomFunctionId | null,
  inputMethod: null as WizardInputMethod | null,
  manualDimensions: null as ManualDimensions | null,
  ceilingHeightM: 2.7,
  targetLux: 500,
  atmosphere: null as AtmosphereId | null,
  ceilingType: null as CeilingTypeId | null,
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
  requiredFixtureCount: null as number | null,
  editorMessage: null as string | null,
  primaryPanelFixtures: null as PlacedPublicFixture[] | null,
  alternativeMixedFixtures: null as PlacedPublicFixture[] | null,
  lightingPlanVariant: "panels" as "panels" | "mixed",
  editorPlanView: "2d" as EditorPlanView,
  room3D: { ...DEFAULT_ROOM_3D_SETTINGS, floor: { ...DEFAULT_ROOM_3D_SETTINGS.floor } },
};

function cloneFixtures(fixtures: PlacedPublicFixture[]): PlacedPublicFixture[] {
  return fixtures.map((f) => ({ ...f }));
}

function resolvedProducts(state: {
  roomFunction: RoomFunctionId | null;
  ceilingType: CeilingTypeId | null;
  atmosphere: AtmosphereId | null;
}): { preferredProductId: PublicProductId; downlightProductId: PublicProductId } | null {
  if (!state.roomFunction || !state.ceilingType || !state.atmosphere) return null;
  return {
    preferredProductId: selectConfiguredProduct(state.roomFunction, state.ceilingType, state.atmosphere),
    downlightProductId: selectDownlightProduct(state.ceilingType, cctFromAtmosphere(state.atmosphere)),
  };
}

export const usePublicWizardStore = create<PublicWizardStore>((set, get) => ({
  ...initialState,

  setStep: (step) => {
    const { inputMethod } = get();
    if (!isWizardFlowStep(step, inputMethod)) return;
    set({ step });
  },

  nextStep: () => {
    const { step, inputMethod } = get();
    const next = getNextWizardStep(step, inputMethod);
    if (!next) return false;
    set({ step: next });
    return true;
  },

  prevStep: () => {
    const { step, inputMethod } = get();
    const prev = getPrevWizardStep(step, inputMethod);
    if (!prev) return;
    set({ step: prev });
  },

  selectRoomFunction: (id) => {
    const def = getRoomFunction(id);
    const next = { ...get(), roomFunction: id, targetLux: def.suggestedLux };
    set({
      roomFunction: id,
      targetLux: def.suggestedLux,
      ...resolvedProducts(next),
    });
  },

  selectInputMethod: (method) => {
    set({
      inputMethod: method,
      manualDimensions: method === "dimensions" ? get().manualDimensions : null,
      ...(method === "dimensions"
        ? {
            backgroundDataUrl: null,
            backgroundFileName: null,
            backgroundWidth: 0,
            backgroundHeight: 0,
          }
        : {}),
    });
  },

  applyManualDimensions: (dimensions) => {
    const { atmosphere, roomFunction, ceilingType } = get();
    if (!roomFunction) return false;
    if (!atmosphere) return false;
    if (!ceilingType) return false;

    const scene = buildManualRoomScene({
      lengthM: dimensions.lengthM,
      widthM: dimensions.widthM,
    });

    const defaultViewport = { width: 1280, height: 720 };
    const viewState = computeFitView(
      defaultViewport.width,
      defaultViewport.height,
      scene.width,
      scene.height,
      EDITOR_VIEWPORT.MARGIN,
    );

    set({
      inputMethod: "dimensions",
      manualDimensions: dimensions,
      ceilingHeightM: Math.max(2, Math.min(12, dimensions.ceilingHeightM)),
      backgroundDataUrl: scene.dataUrl,
      backgroundFileName: "handmatige-maatvoering.svg",
      backgroundWidth: scene.width,
      backgroundHeight: scene.height,
      pixelsPerMeter: scene.pixelsPerMeter,
      calibrationDraft: [],
      calibrationDistanceMm: "",
      calibrationLine: [],
      polygonDraft: [],
      roomVertices: scene.vertices,
      roomAreaM2: scene.areaM2,
      fixtures: [],
      selectedFixtureId: null,
      showHeatmap: false,
      historyPast: [],
      historyFuture: [],
      lightingPlanGenerated: false,
      layoutWarning: null,
      requiredFixtureCount: null,
      editorMessage: null,
      aiRecognitionAttempted: true,
      aiRecognitionFailed: false,
      editorPhase: "plan",
      editorMode: "select",
      scaleStepCollapsed: true,
      viewState,
    });

    const planOk = get().generateLightingPlan();
    if (!planOk) {
      console.error("[applyManualDimensions] generateLightingPlan failed", {
        roomVertices: get().roomVertices.length,
        pixelsPerMeter: get().pixelsPerMeter,
        targetLux: get().targetLux,
      });
      return false;
    }
    return true;
  },

  setCeilingHeightM: (value) => set({ ceilingHeightM: Math.max(2, Math.min(12, value)) }),

  setTargetLux: (value) => set({ targetLux: Math.max(50, Math.min(1000, value)) }),

  selectAtmosphere: (id) => {
    if (id === "premium_architectural") return;
    const next = { ...get(), atmosphere: id };
    set({
      atmosphere: id,
      ...resolvedProducts(next),
    });
  },

  selectCeilingType: (id) => {
    const next = { ...get(), ceilingType: id };
    set({
      ceilingType: id,
      ...resolvedProducts(next),
    });
  },

  setBackground: (dataUrl, fileName, width, height) =>
    set({
      inputMethod: "floorplan",
      manualDimensions: null,
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
      roomFunction,
      ceilingType,
      atmosphere,
    } = get();
    if (roomVertices.length < 3 || !pixelsPerMeter || !ceilingType) return false;
    const resolved = resolvedProducts({ roomFunction, ceilingType, atmosphere });
    const productId = resolved?.preferredProductId ?? preferredProductId;
    const room = createRoomPolygon(roomVertices, pixelsPerMeter);
    const count = calculateRequiredFixtureCount(
      room.areaM2,
      targetLux,
      productId,
      ceilingHeightM,
    );
    const layout = placeFixturesWithLayoutInfo(
      roomVertices,
      pixelsPerMeter,
      count,
      productId,
      {
        areaM2: room.areaM2,
        targetLux,
        ceilingHeightM,
        ceilingType,
      },
    );
    const indicative = calculateIndicativeResult(
      room.areaM2,
      targetLux,
      ceilingHeightM,
      layout.fixtures,
      count,
    );
    let layoutWarning = layout.warning ?? null;
    if (!indicative.meetsTarget) {
      const note = `De nette indeling haalt het luxdoel indicatief niet: ${indicative.indicativeAverageLux} lux bij een doel van ${targetLux} lux.`;
      layoutWarning = layoutWarning ? `${layoutWarning} ${note}` : note;
    }

    const downlightProductId = resolved?.downlightProductId ?? get().downlightProductId;
    let alternativeMixedFixtures: PlacedPublicFixture[] | null = null;
    if (
      !indicative.meetsTarget &&
      isElongatedPanel(productId) &&
      ceilingType === "grid_1200_600"
    ) {
      const mixed = proposeMixedPanelDownlightPlan({
        panelFixtures: layout.fixtures,
        vertices: roomVertices,
        pixelsPerMeter,
        ceilingType,
        downlightProductId,
        context: {
          areaM2: room.areaM2,
          targetLux,
          ceilingHeightM,
          ceilingType,
        },
        requiredFixtureCount: count,
      });
      if (mixed) {
        alternativeMixedFixtures = mixed.fixtures;
      }
    }

    set({
      preferredProductId: productId,
      downlightProductId,
      fixtures: layout.fixtures,
      primaryPanelFixtures: cloneFixtures(layout.fixtures),
      alternativeMixedFixtures: alternativeMixedFixtures
        ? cloneFixtures(alternativeMixedFixtures)
        : null,
      lightingPlanVariant: "panels",
      historyPast: [],
      historyFuture: [],
      selectedFixtureId: null,
      lightingPlanGenerated: true,
      layoutWarning,
      requiredFixtureCount: count,
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
      { ceilingType: get().ceilingType ?? undefined, rotation: fixture.rotation },
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
    const { fixtures, preferredProductId, pixelsPerMeter, roomVertices, ceilingType, atmosphere } = get();
    if (!pixelsPerMeter || roomVertices.length < 3) return false;
    const panelId =
      getPublicProduct(preferredProductId).category === "led_panel"
        ? preferredProductId
        : ceilingType && atmosphere
          ? selectPanelProduct(ceilingType, cctFromAtmosphere(atmosphere))
          : preferredProductId;
    const xs = roomVertices.map((vertex) => vertex.x);
    const ys = roomVertices.map((vertex) => vertex.y);
    const roomWidthM = (Math.max(...xs) - Math.min(...xs)) / pixelsPerMeter;
    const roomHeightM = (Math.max(...ys) - Math.min(...ys)) / pixelsPerMeter;
    const rotation = isElongatedPanel(panelId)
      ? panelRotationForRoom(roomWidthM, roomHeightM, panelId)
      : 0;
    const position = findFreeGridPosition(
      roomVertices,
      pixelsPerMeter,
      fixtures,
      panelId,
      undefined,
      { ceilingType: ceilingType ?? undefined, rotation },
    );
    if (!position) {
      set({
        editorMessage:
          "Er is binnen de huidige ruimte geen geschikte vrije positie meer met minimaal 60 cm wandafstand.",
      });
      return false;
    }
    get().pushHistory();
    const newFixture = {
      id: `fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productId: panelId,
      x: position.x,
      y: position.y,
      rotation,
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
      undefined,
      { ceilingType: get().ceilingType ?? undefined },
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
    const next = duplicateFixture(fixtures, selectedFixtureId, pixelsPerMeter, roomVertices, {
      ceilingType: get().ceilingType ?? undefined,
    });
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
      editorPlanView: "2d",
    }),

  goToEditor3D: () =>
    set({
      step: "editor",
      editorMode: "select",
      editorPhase: "plan",
      editorPlanView: "3d",
    }),

  setEditorPlanView: (view) => set({ editorPlanView: view }),

  patchRoom3D: (patch) =>
    set((state) => ({
      room3D: {
        ...state.room3D,
        ...patch,
        floor: patch.floor ? { ...state.room3D.floor, ...patch.floor } : state.room3D.floor,
      },
    })),

  setRoom3DFloor: (patch) =>
    set((state) => ({
      room3D: {
        ...state.room3D,
        floor: { ...state.room3D.floor, ...patch },
      },
    })),

  addRoom3DWindow: () => {
    const { roomVertices, pixelsPerMeter, room3D } = get();
    if (roomVertices.length < 3 || !pixelsPerMeter) return false;
    const walls = wallSegmentsM(roomVertices, makeRoom3DOrigin(roomVertices, pixelsPerMeter));
    if (walls.length === 0) return false;
    const wallIndex = 0;
    const candidate: Room3DWindow = {
      ...DEFAULT_WINDOW_3D,
      id: `win-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      wallIndex,
    };
    const validated = validateWindowOnWall(candidate, walls, room3D.windows);
    if (!validated) return false;
    set({ room3D: { ...room3D, windows: [...room3D.windows, validated] } });
    return true;
  },

  updateRoom3DWindow: (id, patch) => {
    const { roomVertices, pixelsPerMeter, room3D } = get();
    if (roomVertices.length < 3 || !pixelsPerMeter) return false;
    const walls = wallSegmentsM(roomVertices, makeRoom3DOrigin(roomVertices, pixelsPerMeter));
    const current = room3D.windows.find((w) => w.id === id);
    if (!current) return false;
    const merged = { ...current, ...patch };
    const validated = validateWindowOnWall(merged, walls, room3D.windows);
    if (!validated) return false;
    set({
      room3D: {
        ...room3D,
        windows: room3D.windows.map((w) => (w.id === id ? validated : w)),
      },
    });
    return true;
  },

  removeRoom3DWindow: (id) =>
    set((state) => ({
      room3D: {
        ...state.room3D,
        windows: state.room3D.windows.filter((w) => w.id !== id),
      },
    })),

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

  resetScaleDependentState: () => set(SCALE_RESET_PATCH),

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

  setLightingPlanVariant: (variant) => {
    const { primaryPanelFixtures, alternativeMixedFixtures } = get();
    if (variant === "mixed") {
      if (!alternativeMixedFixtures?.length) return;
      set({
        lightingPlanVariant: "mixed",
        fixtures: cloneFixtures(alternativeMixedFixtures),
        selectedFixtureId: null,
      });
      return;
    }
    if (primaryPanelFixtures?.length) {
      set({
        lightingPlanVariant: "panels",
        fixtures: cloneFixtures(primaryPanelFixtures),
        selectedFixtureId: null,
      });
      return;
    }
    set({ lightingPlanVariant: "panels" });
  },

  getIndicativeResult: () => {
    const { roomVertices, pixelsPerMeter, targetLux, ceilingHeightM, fixtures, requiredFixtureCount } =
      get();
    if (roomVertices.length < 3 || !pixelsPerMeter) return null;
    const areaM2 = createRoomPolygon(roomVertices, pixelsPerMeter).areaM2;
    return calculateIndicativeResult(
      areaM2,
      targetLux,
      ceilingHeightM,
      fixtures,
      requiredFixtureCount ?? undefined,
    );
  },

  setSubmitResult: (reference, email) =>
    set({ submitReference: reference, submitEmail: email }),

  resetWizard: () => set({ ...initialState }),
}));

export { WIZARD_STEP_LABELS } from "@/lib/public-wizard/wizard-navigation";

export { validateLeadForm } from "@/lib/public-wizard/lead-form";
