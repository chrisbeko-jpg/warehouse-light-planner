import { EXAMPLE_IMAGE_SLOT_COUNT, readMediaId } from "@/lib/cms/media";
import type {
  CmsPage,
  CmsSitePayload,
  ContentBlock,
  ExampleBlock,
  HeroBlock,
  ProductsBlock,
} from "@/types/cms";

export interface MediaReferenceSnapshot {
  homepageHero: string | null;
  exampleSlots: (string | null)[];
  productItems: (string | null)[];
  ogMediaId: string | null;
  wizardRooms: Record<string, string | null>;
  wizardAtmospheres: Record<string, string | null>;
}

export class MediaPersistenceError extends Error {
  readonly lostReferences: string[];

  constructor(message: string, lostReferences: string[]) {
    super(message);
    this.name = "MediaPersistenceError";
    this.lostReferences = lostReferences;
  }
}

function blockById(blocks: ContentBlock[], id: string): ContentBlock | undefined {
  return blocks.find((block) => block.id === id);
}

export function snapshotPageMediaReferences(page: CmsPage): Partial<MediaReferenceSnapshot> {
  const hero = blockById(page.blocks, "hero");
  const example = blockById(page.blocks, "example");
  const products = blockById(page.blocks, "products");

  const exampleSlots = Array.from({ length: EXAMPLE_IMAGE_SLOT_COUNT }, (_, index) => {
    if (example?.type !== "example") return null;
    const slot = (example as ExampleBlock).resultExamples?.[index];
    return readMediaId(slot ?? null);
  });

  const productItems =
    products?.type === "products"
      ? (products as ProductsBlock).items.map((item) => readMediaId(item))
      : [];

  return {
    homepageHero: hero?.type === "hero" ? readMediaId(hero as HeroBlock) : null,
    exampleSlots,
    productItems,
    ogMediaId: readMediaId({ mediaId: page.seo.ogMediaId, imageId: page.seo.ogImageId }),
  };
}

export function snapshotSiteMediaReferences(payload: CmsSitePayload): MediaReferenceSnapshot {
  const pageRefs = snapshotPageMediaReferences(payload.homepage);
  return {
    homepageHero: pageRefs.homepageHero ?? null,
    exampleSlots: pageRefs.exampleSlots ?? Array.from({ length: EXAMPLE_IMAGE_SLOT_COUNT }, () => null),
    productItems: pageRefs.productItems ?? [],
    ogMediaId: pageRefs.ogMediaId ?? null,
    wizardRooms: Object.fromEntries(
      payload.wizard.roomChoices.map((choice) => [choice.id, readMediaId(choice)]),
    ),
    wizardAtmospheres: Object.fromEntries(
      payload.wizard.atmosphereChoices.map((choice) => [choice.id, readMediaId(choice)]),
    ),
  };
}

function compareNullableId(label: string, expected: string | null, actual: string | null): string | null {
  if (expected && expected !== actual) {
    return `${label}: expected ${expected}, got ${actual ?? "null"}`;
  }
  return null;
}

export function diffMediaReferences(
  expected: MediaReferenceSnapshot,
  actual: MediaReferenceSnapshot,
): string[] {
  const diffs: string[] = [];

  const heroDiff = compareNullableId("homepageHero", expected.homepageHero, actual.homepageHero);
  if (heroDiff) diffs.push(heroDiff);

  const ogDiff = compareNullableId("ogMediaId", expected.ogMediaId, actual.ogMediaId);
  if (ogDiff) diffs.push(ogDiff);

  expected.exampleSlots.forEach((id, index) => {
    const diff = compareNullableId(`exampleSlots[${index}]`, id, actual.exampleSlots[index] ?? null);
    if (diff) diffs.push(diff);
  });

  expected.productItems.forEach((id, index) => {
    const diff = compareNullableId(`productItems[${index}]`, id, actual.productItems[index] ?? null);
    if (diff) diffs.push(diff);
  });

  for (const [id, expectedMediaId] of Object.entries(expected.wizardRooms)) {
    if (!expectedMediaId) continue;
    const diff = compareNullableId(`wizardRooms.${id}`, expectedMediaId, actual.wizardRooms[id] ?? null);
    if (diff) diffs.push(diff);
  }

  for (const [id, expectedMediaId] of Object.entries(expected.wizardAtmospheres)) {
    if (!expectedMediaId) continue;
    const diff = compareNullableId(
      `wizardAtmospheres.${id}`,
      expectedMediaId,
      actual.wizardAtmospheres[id] ?? null,
    );
    if (diff) diffs.push(diff);
  }

  return diffs;
}

export function assertMediaReferencesPreserved(
  expected: MediaReferenceSnapshot,
  actual: MediaReferenceSnapshot,
  context: string,
): void {
  const lost = diffMediaReferences(expected, actual);
  if (lost.length === 0) return;
  throw new MediaPersistenceError(
    `Afbeelding kon niet worden opgeslagen. De wijziging is niet toegepast (${context}).`,
    lost,
  );
}

export function logMediaReferenceStage(stage: string, snapshot: MediaReferenceSnapshot): void {
  console.info(`[CMS media audit] ${stage}`, JSON.stringify(snapshot));
}
