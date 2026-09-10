import type { AtmosphereId, PublicProductId, RoomFunctionId } from "@/types/public-wizard";

const IMAGE_ROOT = "/ledpaneel/images";

function imagePath(filename: string): string {
  return `${IMAGE_ROOT}/${filename}`;
}

export const FALLBACK_IMAGES = {
  homepageHero: imagePath("kantoorverlichting-hero.webp"),
  homepageExamples: [
    imagePath("lichtplan-kantoor-project.webp"),
    imagePath("kantoorverlichting-helder.webp"),
    imagePath("kantoor-project-verlichting.webp"),
    imagePath("architectural-project-verlichting.webp"),
  ],
  products: {
    led_panel_3000: imagePath("led-paneel-595x595-3000k.webp"),
    led_panel_4000: imagePath("led-paneel-595x595-4000k.webp"),
    downlight_3000: imagePath("downlight-rond-3000k.webp"),
    downlight_4000: imagePath("downlight-rond-4000k.webp"),
  } satisfies Record<PublicProductId, string>,
  atmospheres: {
    warm: imagePath("kantoorverlichting-warm.webp"),
    neutraal: imagePath("kantoorverlichting-helder.webp"),
    premium_architectural: imagePath("kantoorverlichting-premium.webp"),
  } satisfies Record<AtmosphereId, string>,
  rooms: {
    open_kantoor: imagePath("open-kantoor-verlichting.webp"),
    gesloten_kantoor: imagePath("gesloten-kantoor-verlichting.webp"),
    vergader: imagePath("vergaderruimte-verlichting.webp"),
    entree: imagePath("entree-verlichting.webp"),
    gang: imagePath("gang-verlichting.webp"),
    pantry: imagePath("kantine-verlichting.webp"),
    toilet: imagePath("toilet-verlichting.webp"),
    overig: imagePath("overig-ruimte-verlichting.webp"),
  } satisfies Record<RoomFunctionId, string>,
  kantoorverlichting: {
    hero: imagePath("kantoorverlichting-hero.webp"),
    lichtkleur: imagePath("kantoor-functioneel-verlichting.webp"),
    examples: [
      imagePath("voorbeeldproject-kantoor.webp"),
      imagePath("kantoor-functioneel-verlichting.webp"),
      imagePath("kantoor-luxe-projectverlichting.webp"),
      imagePath("downlight-rond-4000k.webp"),
    ],
  },
} as const;

export const PRODUCT_FALLBACK_ORDER: PublicProductId[] = [
  "led_panel_3000",
  "led_panel_4000",
  "downlight_3000",
  "downlight_4000",
];

export const FALLBACK_IMAGE_ALTS: Record<string, string> = {
  [FALLBACK_IMAGES.homepageHero]: "Professionele kantoorverlichting met LED-panelen in systeemplafond",
  [FALLBACK_IMAGES.homepageExamples[0]!]: "Lichtplan en plattegrond voor kantoorverlichting",
  [FALLBACK_IMAGES.homepageExamples[1]!]: "Kantoor met LED-panelen in systeemplafond",
  [FALLBACK_IMAGES.homepageExamples[2]!]: "Modern kantoor met professionele projectverlichting",
  [FALLBACK_IMAGES.homepageExamples[3]!]: "Architectonische kantoorverlichting met design armaturen",
  [FALLBACK_IMAGES.products.led_panel_3000]: "LED-paneel 595×595 mm 3000K warm wit",
  [FALLBACK_IMAGES.products.led_panel_4000]: "LED-paneel 595×595 mm 4000K neutraal wit",
  [FALLBACK_IMAGES.products.downlight_3000]: "Ronde downlight 3000K warm wit",
  [FALLBACK_IMAGES.products.downlight_4000]: "Ronde downlight 4000K neutraal wit",
  [FALLBACK_IMAGES.atmospheres.warm]: "Warm en comfortabel verlicht kantoor",
  [FALLBACK_IMAGES.atmospheres.neutraal]: "Helder functioneel verlicht kantoor met LED-panelen",
  [FALLBACK_IMAGES.atmospheres.premium_architectural]: "Luxe architectonische kantoorverlichting met rail- en pendelarmaturen",
  [FALLBACK_IMAGES.rooms.open_kantoor]: "Open kantoor met uniforme LED-verlichting",
  [FALLBACK_IMAGES.rooms.gesloten_kantoor]: "Gesloten kantoor met professionele verlichting",
  [FALLBACK_IMAGES.rooms.vergader]: "Vergaderruimte met sfeervolle projectverlichting",
  [FALLBACK_IMAGES.rooms.entree]: "Representatieve entree met professionele verlichting",
  [FALLBACK_IMAGES.rooms.gang]: "Gangverlichting in kantooromgeving",
  [FALLBACK_IMAGES.rooms.pantry]: "Kantine of pantry met warme verlichting",
  [FALLBACK_IMAGES.rooms.toilet]: "Downlight verlichting voor sanitaire ruimte",
  [FALLBACK_IMAGES.rooms.overig]: "Professionele verlichting in kantooromgeving",
  [FALLBACK_IMAGES.kantoorverlichting.hero]: "Kantoorverlichting met LED-panelen in systeemplafond",
  [FALLBACK_IMAGES.kantoorverlichting.lichtkleur]: "Functionele kantoorverlichting met neutrale LED-panelen",
  [FALLBACK_IMAGES.kantoorverlichting.examples[0]!]: "Voorbeeld lichtplan kantoorverlichting",
  [FALLBACK_IMAGES.kantoorverlichting.examples[1]!]: "Functionele kantoorverlichting met LED-panelen",
  [FALLBACK_IMAGES.kantoorverlichting.examples[2]!]: "Luxe kantoorproject met architectonische verlichting",
  [FALLBACK_IMAGES.kantoorverlichting.examples[3]!]: "Professionele downlight voor kantoor en sanitaire ruimtes",
};

export function fallbackAltText(path: string, altFallback?: string): string {
  return FALLBACK_IMAGE_ALTS[path] ?? altFallback ?? "Professionele kantoorverlichting";
}

export function getHomepageExampleFallback(index: number): string {
  return FALLBACK_IMAGES.homepageExamples[index] ?? FALLBACK_IMAGES.homepageExamples[0]!;
}

export function getKantoorExampleFallback(index: number): string {
  return FALLBACK_IMAGES.kantoorverlichting.examples[index] ?? FALLBACK_IMAGES.kantoorverlichting.examples[0]!;
}

export function getProductFallback(index: number): string {
  const productId = PRODUCT_FALLBACK_ORDER[index] ?? PRODUCT_FALLBACK_ORDER[0]!;
  return FALLBACK_IMAGES.products[productId];
}

export function getProductFallbackByIndex(index: number): PublicProductId {
  return PRODUCT_FALLBACK_ORDER[index] ?? PRODUCT_FALLBACK_ORDER[0]!;
}

export function getRoomFallback(roomId: string): string | null {
  if (roomId in FALLBACK_IMAGES.rooms) {
    return FALLBACK_IMAGES.rooms[roomId as RoomFunctionId];
  }
  return null;
}

export function getAtmosphereFallback(atmosphereId: string): string | null {
  const normalized = atmosphereId === "luxe" ? "premium_architectural" : atmosphereId;
  if (normalized in FALLBACK_IMAGES.atmospheres) {
    return FALLBACK_IMAGES.atmospheres[normalized as AtmosphereId];
  }
  return null;
}

export function getHeroFallback(blockId: string): string | null {
  if (blockId === "hero-kantoor") return FALLBACK_IMAGES.kantoorverlichting.hero;
  if (blockId === "hero") return FALLBACK_IMAGES.homepageHero;
  return null;
}

export function getTextImageFallback(blockId: string): string | null {
  if (blockId === "lichtkleur") return FALLBACK_IMAGES.kantoorverlichting.lichtkleur;
  return null;
}
