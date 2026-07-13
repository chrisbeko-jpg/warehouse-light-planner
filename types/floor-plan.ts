export const FLOOR_PLAN_SCHEMA_VERSION = 1 as const;

export const ROOM_TYPES = [
  "kantoor",
  "magazijn",
  "productie",
  "gang",
  "sanitair",
  "technisch",
  "overig",
] as const;

export const CEILING_TYPES = [
  "systeemplafond",
  "open",
  "beton",
  "gipsplaat",
  "overig",
] as const;

export type RoomType = (typeof ROOM_TYPES)[number];
export type CeilingType = (typeof CEILING_TYPES)[number];

export type FloorPlanEditorMode =
  | "select"
  | "pan"
  | "calibrate"
  | "drawRoom";

export interface Point2D {
  x: number;
  y: number;
}

export interface BackgroundImage {
  dataUrl: string;
  width: number;
  height: number;
  mimeType: string;
  fileName: string;
}

export interface ScaleCalibration {
  pointA: Point2D;
  pointB: Point2D;
  distanceMm: number;
}

export interface Room {
  id: string;
  name: string;
  roomType: RoomType;
  ceilingHeight: number;
  ceilingType: CeilingType;
  targetLux: number;
  vertices: Point2D[];
  areaM2: number;
}

export interface ViewState {
  scale: number;
  positionX: number;
  positionY: number;
}

export interface FloorPlanProject {
  version: typeof FLOOR_PLAN_SCHEMA_VERSION;
  exportedAt: string;
  projectName: string;
  background: BackgroundImage | null;
  calibration: ScaleCalibration | null;
  pixelsPerMeter: number | null;
  rooms: Room[];
  viewState: ViewState;
}

export interface FloorPlanPersistedState {
  projectName: string;
  background: BackgroundImage | null;
  calibration: ScaleCalibration | null;
  pixelsPerMeter: number | null;
  rooms: Room[];
  selectedRoomId: string | null;
  viewState: ViewState;
  editorMode: FloorPlanEditorMode;
  polygonDraft: Point2D[];
  calibrationDraft: Point2D[];
  calibrationDistanceMm: string;
}
