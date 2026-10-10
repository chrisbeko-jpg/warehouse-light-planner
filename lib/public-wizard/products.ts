import type {
  FixtureMounting,
  PublicFixtureCategory,
  PublicProductId,
} from "@/types/public-wizard";

export interface PublicProductDefinition {
  id: PublicProductId;
  name: string;
  category: PublicFixtureCategory;
  mounting: FixtureMounting;
  cct: 3000 | 4000;
  lumens: number;
  watts: number;
  beamAngleDeg: number;
  widthM: number;
  heightM: number;
  diameterM?: number;
  /** Minimum clearance from room boundary to outer fixture edge (meters). */
  minWallClearanceM?: number;
  unitPriceEuro: number;
  /**
   * False when lumen, wattage and beam are copied from an existing family
   * because this execution does not yet have its own datasheet.
   */
  photometryConfirmed: boolean;
  photometryNote?: string;
}

export interface ProductCatalogEntry {
  id: string;
  name?: string;
  lumens?: number;
  watts?: number;
  beamAngleDeg?: number;
  widthM?: number;
  heightM?: number;
  diameterM?: number;
  unitPriceEuro?: number;
}

const PANEL_NOTE =
  "Fotometrie overgenomen van het bestaande LED-paneel 600×600 met dezelfde lichtkleur. Pas lumen, vermogen en bundelhoek in het CMS aan zodra de datasheet van deze uitvoering bekend is.";

const SURFACE_DOWNLIGHT_NOTE =
  "Fotometrie overgenomen van de bestaande grote inbouwdownlight met dezelfde lichtkleur. Pas de waarden in het CMS aan zodra de datasheet van de opbouwuitvoering bekend is.";

/** Central public catalogue. Physically different executions have their own ids. */
export const PUBLIC_PRODUCTS: PublicProductDefinition[] = [
  {
    id: "led_panel_3000",
    name: "LED-paneel 600×600 inbouw 3000K",
    category: "led_panel",
    mounting: "recessed",
    cct: 3000,
    lumens: 3600,
    watts: 36,
    beamAngleDeg: 90,
    widthM: 0.6,
    heightM: 0.6,
    minWallClearanceM: 0,
    unitPriceEuro: 50,
    photometryConfirmed: true,
  },
  {
    id: "led_panel_4000",
    name: "LED-paneel 600×600 inbouw 4000K",
    category: "led_panel",
    mounting: "recessed",
    cct: 4000,
    lumens: 3800,
    watts: 36,
    beamAngleDeg: 90,
    widthM: 0.6,
    heightM: 0.6,
    minWallClearanceM: 0,
    unitPriceEuro: 50,
    photometryConfirmed: true,
  },
  {
    id: "led_panel_1200x300_3000",
    name: "LED-paneel 1200×300 inbouw 3000K",
    category: "led_panel",
    mounting: "recessed",
    cct: 3000,
    lumens: 3600,
    watts: 36,
    beamAngleDeg: 90,
    widthM: 1.2,
    heightM: 0.3,
    minWallClearanceM: 0,
    unitPriceEuro: 50,
    photometryConfirmed: false,
    photometryNote: PANEL_NOTE,
  },
  {
    id: "led_panel_1200x300_4000",
    name: "LED-paneel 1200×300 inbouw 4000K",
    category: "led_panel",
    mounting: "recessed",
    cct: 4000,
    lumens: 3800,
    watts: 36,
    beamAngleDeg: 90,
    widthM: 1.2,
    heightM: 0.3,
    minWallClearanceM: 0,
    unitPriceEuro: 50,
    photometryConfirmed: false,
    photometryNote: PANEL_NOTE,
  },
  {
    id: "led_panel_surface_3000",
    name: "LED-paneel 600×600 opbouw 3000K",
    category: "led_panel",
    mounting: "surface",
    cct: 3000,
    lumens: 3600,
    watts: 36,
    beamAngleDeg: 90,
    widthM: 0.6,
    heightM: 0.6,
    minWallClearanceM: 0,
    unitPriceEuro: 75,
    photometryConfirmed: false,
    photometryNote: PANEL_NOTE,
  },
  {
    id: "led_panel_surface_4000",
    name: "LED-paneel 600×600 opbouw 4000K",
    category: "led_panel",
    mounting: "surface",
    cct: 4000,
    lumens: 3800,
    watts: 36,
    beamAngleDeg: 90,
    widthM: 0.6,
    heightM: 0.6,
    minWallClearanceM: 0,
    unitPriceEuro: 75,
    photometryConfirmed: false,
    photometryNote: PANEL_NOTE,
  },
  {
    id: "downlight_3000",
    name: "Grote ronde inbouwdownlight 3000K",
    category: "downlight",
    mounting: "recessed",
    cct: 3000,
    lumens: 1800,
    watts: 18,
    beamAngleDeg: 120,
    widthM: 0.22,
    heightM: 0.22,
    diameterM: 0.22,
    unitPriceEuro: 15,
    photometryConfirmed: true,
  },
  {
    id: "downlight_4000",
    name: "Grote ronde inbouwdownlight 4000K",
    category: "downlight",
    mounting: "recessed",
    cct: 4000,
    lumens: 1900,
    watts: 18,
    beamAngleDeg: 120,
    widthM: 0.22,
    heightM: 0.22,
    diameterM: 0.22,
    unitPriceEuro: 15,
    photometryConfirmed: true,
  },
  {
    id: "downlight_surface_3000",
    name: "Grote ronde opbouwdownlight 3000K",
    category: "downlight",
    mounting: "surface",
    cct: 3000,
    lumens: 1800,
    watts: 18,
    beamAngleDeg: 120,
    widthM: 0.22,
    heightM: 0.22,
    diameterM: 0.22,
    unitPriceEuro: 90,
    photometryConfirmed: false,
    photometryNote: SURFACE_DOWNLIGHT_NOTE,
  },
  {
    id: "downlight_surface_4000",
    name: "Grote ronde opbouwdownlight 4000K",
    category: "downlight",
    mounting: "surface",
    cct: 4000,
    lumens: 1900,
    watts: 18,
    beamAngleDeg: 120,
    widthM: 0.22,
    heightM: 0.22,
    diameterM: 0.22,
    unitPriceEuro: 90,
    photometryConfirmed: false,
    photometryNote: SURFACE_DOWNLIGHT_NOTE,
  },
];

export const PUBLIC_PRODUCT_IDS = PUBLIC_PRODUCTS.map((product) => product.id);

export function isPublicProductId(id: string): id is PublicProductId {
  return PUBLIC_PRODUCT_IDS.includes(id as PublicProductId);
}

export const PUBLIC_PRODUCT_BY_ID: Record<PublicProductId, PublicProductDefinition> =
  Object.fromEntries(PUBLIC_PRODUCTS.map((product) => [product.id, product])) as Record<
    PublicProductId,
    PublicProductDefinition
  >;

let catalogOverrides: Partial<Record<PublicProductId, ProductCatalogEntry>> | null = null;

function finite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Apply the published CMS catalogue. Pass null to restore code defaults. */
export function setActiveProductCatalog(products: ProductCatalogEntry[] | null): void {
  if (!products) {
    catalogOverrides = null;
    return;
  }
  const next: Partial<Record<PublicProductId, ProductCatalogEntry>> = {};
  for (const entry of products) {
    if (!isPublicProductId(entry.id)) continue;
    next[entry.id] = entry;
  }
  catalogOverrides = next;
}

export function getPublicProduct(id: PublicProductId): PublicProductDefinition {
  const base = PUBLIC_PRODUCT_BY_ID[id];
  const over = catalogOverrides?.[id];
  if (!over) return base;
  return {
    ...base,
    name: over.name?.trim() ? over.name : base.name,
    lumens: finite(over.lumens, base.lumens),
    watts: finite(over.watts, base.watts),
    beamAngleDeg: finite(over.beamAngleDeg, base.beamAngleDeg),
    widthM: finite(over.widthM, base.widthM),
    heightM: finite(over.heightM, base.heightM),
    diameterM: over.diameterM != null ? finite(over.diameterM, base.diameterM ?? 0) : base.diameterM,
    unitPriceEuro: finite(over.unitPriceEuro, base.unitPriceEuro),
  };
}

export function getUnitPrice(id: PublicProductId): number {
  return getPublicProduct(id).unitPriceEuro;
}

export function isElongatedPanel(id: PublicProductId): boolean {
  const product = getPublicProduct(id);
  if (product.category !== "led_panel") return false;
  const ratio = product.widthM / Math.max(product.heightM, 0.01);
  return ratio > 1.2 || ratio < 1 / 1.2;
}
