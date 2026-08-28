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
  pageBlockMedia: Record<string, string | null>;
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

export function getDraftPageByKey(payload: CmsSitePayload, key: string): CmsPage | null {
  const normalizedKey = key.replace(/^\//, "");
  if (normalizedKey === "" || normalizedKey === "homepage") return payload.homepage;
  return payload.pages[normalizedKey] ?? null;
}

/** Snapshot every media reference on a page keyed by block id (and slot indices). */
export function snapshotAllPageBlockMedia(page: CmsPage): Record<string, string | null> {
  const refs: Record<string, string | null> = {};

  for (const block of page.blocks) {
    if (
      block.type === "hero" ||
      block.type === "text-image" ||
      block.type === "image-text" ||
      block.type === "wide-image"
    ) {
      const mediaId = readMediaId(block);
      if (mediaId) refs[block.id] = mediaId;
    }

    if (block.type === "example") {
      const example = block as ExampleBlock;
      example.resultExamples?.forEach((slot, index) => {
        const mediaId = readMediaId(slot);
        if (mediaId) refs[`${block.id}:${index}`] = mediaId;
      });
    }

    if (block.type === "products") {
      const products = block as ProductsBlock;
      products.items.forEach((item, index) => {
        const mediaId = readMediaId(item);
        if (mediaId) refs[`${block.id}:${index}`] = mediaId;
      });
    }
  }

  const ogMediaId = readMediaId({ mediaId: page.seo.ogMediaId, imageId: page.seo.ogImageId });
  if (ogMediaId) refs["seo:ogMediaId"] = ogMediaId;

  return refs;
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

export function snapshotSiteMediaReferences(
  payload: CmsSitePayload,
  options?: { pageKey?: string },
): MediaReferenceSnapshot {
  const pageRefs = snapshotPageMediaReferences(payload.homepage);
  let pageBlockMedia: Record<string, string | null> = {};

  if (options?.pageKey) {
    const page = getDraftPageByKey(payload, options.pageKey);
    if (page) pageBlockMedia = snapshotAllPageBlockMedia(page);
  } else {
    pageBlockMedia = snapshotAllSitePageBlockMedia(payload);
  }

  return {
    homepageHero: pageRefs.homepageHero ?? null,
    exampleSlots: pageRefs.exampleSlots ?? Array.from({ length: EXAMPLE_IMAGE_SLOT_COUNT }, () => null),
    productItems: pageRefs.productItems ?? [],
    ogMediaId: pageRefs.ogMediaId ?? null,
    pageBlockMedia,
    wizardRooms: Object.fromEntries(
      payload.wizard.roomChoices.map((choice) => [choice.id, readMediaId(choice)]),
    ),
    wizardAtmospheres: Object.fromEntries(
      payload.wizard.atmosphereChoices.map((choice) => [choice.id, readMediaId(choice)]),
    ),
  };
}

function snapshotAllSitePageBlockMedia(payload: CmsSitePayload): Record<string, string | null> {
  const refs: Record<string, string | null> = {};
  const addPage = (pageKey: string, page: CmsPage) => {
    for (const [blockKey, mediaId] of Object.entries(snapshotAllPageBlockMedia(page))) {
      if (mediaId) refs[`${pageKey}/${blockKey}`] = mediaId;
    }
  };

  addPage("homepage", payload.homepage);
  for (const [pageKey, page] of Object.entries(payload.pages)) {
    addPage(pageKey, page);
  }

  return refs;
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

  for (const [blockKey, expectedMediaId] of Object.entries(expected.pageBlockMedia ?? {})) {
    if (!expectedMediaId) continue;
    const diff = compareNullableId(
      `pageBlockMedia.${blockKey}`,
      expectedMediaId,
      actual.pageBlockMedia?.[blockKey] ?? null,
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
