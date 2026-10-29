import type { Point2D } from "@/types/floor-plan";

export type WizardStepId =
  | "room"
  | "atmosphere"
  | "ceiling"
  | "inputMethod"
  | "floorplan"
  | "dimensions"
  | "editor"
  | "result"
  | "request";

/** Suspended ceiling or a solid slab. Drives fixture family, grid and price. */
export type CeilingTypeId = "grid_600" | "grid_1200_600" | "concrete";

export type WizardInputMethod = "floorplan" | "dimensions";

export type RoomFunctionId = "workplace_office" | "reception_hall" | "other_spaces";

export interface ManualDimensions {
  lengthM: number;
  widthM: number;
  ceilingHeightM: number;
}

export type AtmosphereId = "warm" | "neutraal" | "premium_architectural";

export type PublicProductId =
  | "led_panel_3000"
  | "led_panel_4000"
  | "led_panel_1200x300_3000"
  | "led_panel_1200x300_4000"
  | "led_panel_surface_3000"
  | "led_panel_surface_4000"
  | "downlight_3000"
  | "downlight_4000"
  | "downlight_surface_3000"
  | "downlight_surface_4000";

export type FixtureMounting = "recessed" | "surface";

export type PublicFixtureCategory = "led_panel" | "downlight";

export type LeadStatus =
  | "nieuw"
  | "in_behandeling"
  | "offerte_gemaakt"
  | "verzonden"
  | "gewonnen"
  | "verloren";

export interface PlacedPublicFixture {
  id: string;
  productId: PublicProductId;
  x: number;
  y: number;
  rotation: number;
}

export type EditorPlanView = "2d" | "3d";

export type Room3DFloorType = "gray" | "parquet" | "resin" | "custom";

export interface Room3DFloorSettings {
  type: Room3DFloorType;
  color: string;
}

export interface Room3DWindow {
  id: string;
  /** Index of the wall segment (vertex i → i+1). */
  wallIndex: number;
  /** Distance from the start of the wall segment (meters). */
  offsetAlongWallM: number;
  widthM: number;
  heightM: number;
  sillHeightM: number;
}

export interface Room3DSettings {
  wallColor: string;
  ceilingColor: string;
  floor: Room3DFloorSettings;
  windows: Room3DWindow[];
  showCeiling: boolean;
  /** Visual only — does not affect lux calculation. */
  dayLightEnabled: boolean;
}

export type Room3DCameraPreset = "fit" | "isometric" | "top" | "interior";

export interface PublicRoomPolygon {
  vertices: Point2D[];
  areaM2: number;
}

export interface PublicWizardState {
  step: WizardStepId;
  roomFunction: RoomFunctionId | null;
  ceilingHeightM: number;
  targetLux: number;
  atmosphere: AtmosphereId | null;
  ceilingType: CeilingTypeId | null;
  preferredProductId: PublicProductId;
  backgroundDataUrl: string | null;
  backgroundFileName: string | null;
  pixelsPerMeter: number | null;
  calibrationDistanceMm: number;
  roomPolygon: PublicRoomPolygon | null;
  aiRecognitionAttempted: boolean;
  aiRecognitionFailed: boolean;
  fixtures: PlacedPublicFixture[];
  showHeatmap: boolean;
  historyPast: PlacedPublicFixture[][];
  historyFuture: PlacedPublicFixture[][];
}

export interface IndicativeResult {
  areaM2: number;
  targetLux: number;
  fixtureCount: number;
  requiredFixtureCount?: number;
  totalWattage: number;
  /** Sum of catalogue lumens (Φ) for placed fixtures. */
  totalLumens?: number;
  lumensPerFixture?: number;
  utilisationFactor?: number;
  maintenanceFactor?: number;
  indicativeAverageLux: number;
  meetsTarget: boolean;
}

export interface IndicativePriceRange {
  minEuro: number;
  maxEuro: number;
}

export interface MaterialPriceLine {
  productId: PublicProductId;
  name: string;
  quantity: number;
  unitEuro: number;
  subtotalEuro: number;
}

export interface MaterialPriceIndication {
  totalEuro: number;
  lines: MaterialPriceLine[];
}

export interface LeadContactForm {
  companyName: string;
  contactPerson: string;
  address: string;
  postalCode: string;
  city: string;
  telephone: string;
  email: string;
  deliveryAddress: string;
  deliveryPostalCode: string;
  deliveryCity: string;
  projectName: string;
  remarks: string;
  desiredDeliveryDate: string;
  deliverySameAsCompany: boolean;
  privacyConsent: boolean;
}

export interface PublicLeadRecord {
  id: string;
  reference: string;
  createdAt: string;
  status: LeadStatus;
  contact: LeadContactForm;
  wizard: {
    roomFunction: RoomFunctionId;
    ceilingHeightM: number;
    targetLux: number;
    atmosphere: AtmosphereId;
    ceilingType: CeilingTypeId | null;
    preferredProductId: PublicProductId;
    fixtures: PlacedPublicFixture[];
    roomVertices: Point2D[];
    pixelsPerMeter: number;
    inputMethod: WizardInputMethod;
    manualDimensions: ManualDimensions | null;
    result: IndicativeResult;
    price: MaterialPriceIndication;
  };
  floorPlanDataUrl: string | null;
  lightPlanImageBase64: string | null;
  heatmapImageBase64: string | null;
  pdfBase64: string | null;
}
