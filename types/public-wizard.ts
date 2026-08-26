import type { Point2D } from "@/types/floor-plan";

export type WizardStepId =
  | "room"
  | "atmosphere"
  | "floorplan"
  | "editor"
  | "result"
  | "request";

export type RoomFunctionId =
  | "open_kantoor"
  | "gesloten_kantoor"
  | "vergader"
  | "entree"
  | "gang"
  | "pantry"
  | "toilet"
  | "overig";

export type AtmosphereId = "warm" | "neutraal" | "luxe";

export type PublicProductId =
  | "led_panel_3000"
  | "led_panel_4000"
  | "downlight_3000"
  | "downlight_4000";

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
  totalWattage: number;
  indicativeAverageLux: number;
  meetsTarget: boolean;
}

export interface IndicativePriceRange {
  minEuro: number;
  maxEuro: number;
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
    preferredProductId: PublicProductId;
    fixtures: PlacedPublicFixture[];
    result: IndicativeResult;
    price: IndicativePriceRange;
  };
  floorPlanDataUrl: string | null;
  pdfBase64: string | null;
}
