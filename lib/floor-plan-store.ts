import { create } from "zustand";
import { persist } from "zustand/middleware";
import { computePixelsPerMeter } from "@/lib/floor-plan-scale";
import { calculatePolygonAreaM2 } from "@/lib/polygon-area";
import type {
  BackgroundImage,
  FloorPlanEditorMode,
  Point2D,
  Room,
  RoomType,
  CeilingType,
  ViewState,
} from "@/types/floor-plan";

const STORAGE_KEY = "floor-plan-editor-storage";

const DEFAULT_VIEW: ViewState = {
  scale: 1,
  positionX: 0,
  positionY: 0,
};

let roomCounter = 0;

function createRoomId(): string {
  roomCounter += 1;
  return `room-${Date.now()}-${roomCounter}`;
}

function defaultRoomName(existingCount: number): string {
  return `Ruimte ${existingCount + 1}`;
}

function recomputeRoomArea(room: Room, pixelsPerMeter: number | null): Room {
  if (!pixelsPerMeter || pixelsPerMeter <= 0) {
    return { ...room, areaM2: 0 };
  }
  return {
    ...room,
    areaM2: calculatePolygonAreaM2(room.vertices, pixelsPerMeter),
  };
}

export interface FloorPlanState {
  projectName: string;
  background: BackgroundImage | null;
  calibration: import("@/types/floor-plan").ScaleCalibration | null;
  pixelsPerMeter: number | null;
  rooms: Room[];
  selectedRoomId: string | null;
  viewState: ViewState;
  editorMode: FloorPlanEditorMode;
  polygonDraft: Point2D[];
  calibrationDraft: Point2D[];
  calibrationDistanceMm: string;
  uploadError: string | null;

  setProjectName: (name: string) => void;
  setBackground: (background: BackgroundImage | null) => void;
  setUploadError: (message: string | null) => void;
  setEditorMode: (mode: FloorPlanEditorMode) => void;
  setViewState: (viewState: ViewState) => void;
  updateViewState: (partial: Partial<ViewState>) => void;
  setCalibrationDistanceMm: (value: string) => void;
  resetCalibrationDraft: () => void;
  addCalibrationPoint: (point: Point2D) => void;
  applyCalibration: () => boolean;
  addPolygonDraftPoint: (point: Point2D) => void;
  undoPolygonDraftPoint: () => void;
  cancelPolygonDraft: () => void;
  finishPolygonDraft: () => boolean;
  selectRoom: (roomId: string | null) => void;
  updateRoom: (roomId: string, updates: Partial<Omit<Room, "id">>) => void;
  updateRoomVertex: (roomId: string, vertexIndex: number, point: Point2D) => void;
  deleteRoom: (roomId: string) => void;
  renameRoom: (roomId: string, name: string) => void;
  importProject: (payload: {
    projectName: string;
    background: BackgroundImage | null;
    calibration: import("@/types/floor-plan").ScaleCalibration | null;
    pixelsPerMeter: number | null;
    rooms: Room[];
    viewState: ViewState;
  }) => void;
  resetProject: () => void;
  recomputeAllRoomAreas: () => void;
}

const initialState = {
  projectName: "Nieuw plattegrondproject",
  background: null as BackgroundImage | null,
  calibration: null,
  pixelsPerMeter: null as number | null,
  rooms: [] as Room[],
  selectedRoomId: null as string | null,
  viewState: DEFAULT_VIEW,
  editorMode: "select" as FloorPlanEditorMode,
  polygonDraft: [] as Point2D[],
  calibrationDraft: [] as Point2D[],
  calibrationDistanceMm: "",
  uploadError: null as string | null,
};

export const useFloorPlanStore = create<FloorPlanState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setProjectName: (name) => set({ projectName: name }),

      setBackground: (background) =>
        set({
          background,
          uploadError: null,
          polygonDraft: [],
          calibrationDraft: [],
          viewState: DEFAULT_VIEW,
        }),

      setUploadError: (message) => set({ uploadError: message }),

      setEditorMode: (mode) =>
        set({
          editorMode: mode,
          polygonDraft: mode === "drawRoom" ? get().polygonDraft : [],
          calibrationDraft: mode === "calibrate" ? get().calibrationDraft : [],
        }),

      setViewState: (viewState) => set({ viewState }),

      updateViewState: (partial) =>
        set((state) => ({
          viewState: { ...state.viewState, ...partial },
        })),

      setCalibrationDistanceMm: (value) => set({ calibrationDistanceMm: value }),

      resetCalibrationDraft: () => set({ calibrationDraft: [], calibrationDistanceMm: "" }),

      addCalibrationPoint: (point) => {
        const draft = [...get().calibrationDraft, point].slice(0, 2);
        set({ calibrationDraft: draft });
      },

      applyCalibration: () => {
        const { calibrationDraft, calibrationDistanceMm } = get();
        if (calibrationDraft.length !== 2) {
          return false;
        }

        const distanceMm = Number.parseFloat(calibrationDistanceMm.replace(",", "."));
        if (!Number.isFinite(distanceMm) || distanceMm <= 0) {
          return false;
        }

        const pixelsPerMeter = computePixelsPerMeter(
          calibrationDraft[0],
          calibrationDraft[1],
          distanceMm,
        );
        if (pixelsPerMeter <= 0) {
          return false;
        }

        const calibration = {
          pointA: calibrationDraft[0],
          pointB: calibrationDraft[1],
          distanceMm,
        };

        set((state) => ({
          calibration,
          pixelsPerMeter,
          calibrationDraft: [],
          calibrationDistanceMm: "",
          editorMode: "select",
          rooms: state.rooms.map((room) => recomputeRoomArea(room, pixelsPerMeter)),
        }));

        return true;
      },

      addPolygonDraftPoint: (point) => {
        const { polygonDraft } = get();
        if (polygonDraft.length >= 3) {
          const closeThreshold = 12 / Math.max(get().viewState.scale, 0.25);
          const first = polygonDraft[0];
          if (Math.hypot(point.x - first.x, point.y - first.y) <= closeThreshold) {
            get().finishPolygonDraft();
            return;
          }
        }

        set({ polygonDraft: [...polygonDraft, point] });
        if (polygonDraft.length === 0) {
          set({ selectedRoomId: null });
        }
      },

      undoPolygonDraftPoint: () =>
        set((state) => ({
          polygonDraft: state.polygonDraft.slice(0, -1),
        })),

      cancelPolygonDraft: () => set({ polygonDraft: [], editorMode: "select" }),

      finishPolygonDraft: () => {
        const { polygonDraft, rooms, pixelsPerMeter } = get();
        if (polygonDraft.length < 3) {
          return false;
        }

        const room: Room = recomputeRoomArea(
          {
            id: createRoomId(),
            name: defaultRoomName(rooms.length),
            roomType: "overig" as RoomType,
            ceilingHeight: 3,
            ceilingType: "systeemplafond" as CeilingType,
            targetLux: 300,
            vertices: polygonDraft,
            areaM2: 0,
          },
          pixelsPerMeter,
        );

        set({
          rooms: [...rooms, room],
          selectedRoomId: room.id,
          polygonDraft: [],
          editorMode: "select",
        });

        return true;
      },

      selectRoom: (roomId) => set({ selectedRoomId: roomId }),

      updateRoom: (roomId, updates) =>
        set((state) => ({
          rooms: state.rooms.map((room) =>
            room.id === roomId ? { ...room, ...updates } : room,
          ),
        })),

      updateRoomVertex: (roomId, vertexIndex, point) =>
        set((state) => ({
          rooms: state.rooms.map((room) => {
            if (room.id !== roomId) {
              return room;
            }
            const vertices = room.vertices.map((vertex, index) =>
              index === vertexIndex ? point : vertex,
            );
            return recomputeRoomArea({ ...room, vertices }, state.pixelsPerMeter);
          }),
        })),

      deleteRoom: (roomId) =>
        set((state) => ({
          rooms: state.rooms.filter((room) => room.id !== roomId),
          selectedRoomId:
            state.selectedRoomId === roomId ? null : state.selectedRoomId,
        })),

      renameRoom: (roomId, name) => get().updateRoom(roomId, { name }),

      importProject: (payload) =>
        set({
          projectName: payload.projectName,
          background: payload.background,
          calibration: payload.calibration,
          pixelsPerMeter: payload.pixelsPerMeter,
          rooms: payload.rooms,
          viewState: payload.viewState ?? DEFAULT_VIEW,
          selectedRoomId: null,
          editorMode: "select",
          polygonDraft: [],
          calibrationDraft: [],
          calibrationDistanceMm: "",
          uploadError: null,
        }),

      resetProject: () => set({ ...initialState }),

      recomputeAllRoomAreas: () =>
        set((state) => ({
          rooms: state.rooms.map((room) =>
            recomputeRoomArea(room, state.pixelsPerMeter),
          ),
        })),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        projectName: state.projectName,
        background: state.background,
        calibration: state.calibration,
        pixelsPerMeter: state.pixelsPerMeter,
        rooms: state.rooms,
        selectedRoomId: state.selectedRoomId,
        viewState: state.viewState,
        editorMode: state.editorMode,
        polygonDraft: state.polygonDraft,
        calibrationDraft: state.calibrationDraft,
        calibrationDistanceMm: state.calibrationDistanceMm,
      }),
    },
  ),
);
