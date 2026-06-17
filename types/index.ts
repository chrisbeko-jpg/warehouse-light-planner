export type LuxLevel = 150 | 300 | 500 | 750;

export type RectangleType = "shelf" | "obstruction";

export type MountingSystem = "staalkabel" | "montagebeugel";

export type SlotType = "module" | "blankplate";

/** @deprecated use SlotType */
export type LegacySlotType = "led" | "blank";

export function isModulePosition(type: SlotType): boolean {
  return type === "module";
}

export type LineDirection = "horizontal" | "vertical";

export type LineFillMode = "continuous" | "alternating";

/** @deprecated use LineFillMode */
export type OccupancyMode = LineFillMode;

export interface DrawnLightLine {
  id: string;
  direction: LineDirection;
  crossPos: number;
  drawnStart: number;
  drawnEnd: number;
  /** Handmatige positie-keuzes per module/blindplaat (overschrijft scenario) */
  positionTypes?: SlotType[];
}

export interface PlacedRectangle {
  id: string;
  type: RectangleType;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WarehouseDimensions {
  length: number;
  width: number;
  height: number;
}

export interface LightingResults {
  grossArea: number;
  shelfArea: number;
  obstructionArea: number;
  netArea: number;
  requiredLumens: number;
  requiredGrossLumens: number;
  heightFactor: number;
  moduleCount: number;
  fixtureAdvice: string;
}

export interface RailSlot {
  id: string;
  railId: string;
  positionIndex: number;
  index: number;
  railIndex: number;
  railLength: 1.5 | 3;
  type: SlotType;
  length: 1.5;
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
}

export interface RailSegment {
  length: 1.5 | 3;
  alongStart: number;
  alongEnd: number;
}

export interface LightLineSegment {
  start: number;
  end: number;
}

export interface LightLine {
  id: string;
  index: number;
  direction: LineDirection;
  crossPos: number;
  aisleWidth: number;
  availableStart: number;
  availableEnd: number;
  availableLength: number;
  physicalStart: number;
  physicalEnd: number;
  physicalLength: number;
  railLength: number;
  freeMargin: number;
  rails3m: number;
  rails1_5m: number;
  maxPositions: number;
  modules: number;
  blankPlates: number;
  slots: RailSlot[];
  /** Positie-objecten (zelfde als slots) */
  positions: RailSlot[];
  railSegments: RailSegment[];
  hangerCount: number;
  hangerPositions: number[];
  hangerWarning?: string;
  powerFeedCount: number;
  endCapCount: number;
  /** @deprecated use crossPos for horizontal lines */
  y: number;
  /** @deprecated use availableStart/End for horizontal */
  xStart: number;
  /** @deprecated use availableEnd */
  xEnd: number;
  /** @deprecated use availableLength */
  length: number;
  /** @deprecated use railLength */
  roundedLength: number;
}

export interface MaterialTotals {
  rails3m: number;
  rails1_5m: number;
  ledModules: number;
  blankPlates: number;
  powerFeeds: number;
  endCaps: number;
  mountingSets: number;
  mountingSystem: MountingSystem;
  installedPowerW: number;
  advisedTotalPowerW: number;
  heightFactor: number;
  expectedLuxAfterDimming: number;
  averageLux: number;
  uniformity: number;
}

export type FixtureType = "opaque" | "90degree";

export interface LightInstallationSummary {
  totalPositions: number;
  totalModules: number;
  blankPlates: number;
  installedPowerW: number;
  totalLumensAt60W: number;
  effectiveLumensAt60W: number;
  heightFactor: number;
  averageLuxAt60W: number;
  targetLux: LuxLevel;
  advisedWattsPerModule: number;
  advisedTotalPowerW: number;
  expectedLuxAfterDimming: number;
  advice: string;
  fixtureType: FixtureType;
}

export interface HeatmapCell {
  x: number;
  y: number;
  lux: number;
}

export interface HeatmapStats {
  cells: HeatmapCell[];
  minLux: number;
  averageLux: number;
  maxLux: number;
  uniformity: number;
  gridStep: number;
}

export interface LightLinePlan {
  lines: LightLine[];
  materials: MaterialTotals;
  summary: LightInstallationSummary;
  heatmap: HeatmapStats;
  dominantDirection: LineDirection;
  lineFillMode: LineFillMode;
  lightStatus: "sufficient" | "insufficient";
  fillAdvice: string;
  productList: MaterialListResult;
}

export interface MaterialExportLine {
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface MaterialListItem extends MaterialExportLine {
  name: string;
  image: string;
}

export interface MaterialListResult {
  items: MaterialListItem[];
  export: MaterialExportLine[];
  subtotal: number;
  vatAmount: number;
  totalInclVat: number;
  totalParts: number;
  totalLedModules: number;
  totalBlankPlates: number;
  installedPowerW: number;
  advisedWattsPerModule: number;
  advisedTotalPowerW: number;
}
