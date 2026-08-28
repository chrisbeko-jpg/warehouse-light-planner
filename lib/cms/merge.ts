import { DEFAULT_CMS_SITE } from "@/lib/cms/defaults";
import { normalizeContentBlock, normalizeSiteMediaPayload } from "@/lib/cms/normalize-media";
import { EXAMPLE_IMAGE_SLOT_COUNT, readMediaId } from "@/lib/cms/media";
import { KANTOORVERLICHTING_SEED } from "@/lib/cms/seeds/kantoorverlichting";
import type {
  CmsImageRecord,
  CmsPage,
  CmsSiteContent,
  CmsSitePayload,
  CmsSiteStorage,
  CmsWizardContent,
  ExampleBlock,
  ProductsBlock,
  ContentBlock,
  WizardAtmosphereChoiceCms,
  HeroBlock,
  TextImageBlock,
  WideImageBlock,
} from "@/types/cms";

function migrateLegacyAtmosphereIds(byId: Map<string, WizardAtmosphereChoiceCms>): void {
  const legacyNeutral = byId.get("neutral");
  if (legacyNeutral && !byId.has("neutraal")) {
    byId.set("neutraal", { ...legacyNeutral, id: "neutraal" });
    byId.delete("neutral");
  }

  const legacyLuxe = byId.get("luxe");
  if (!legacyLuxe) return;

  const existingPremium = byId.get("premium_architectural");
  const mediaId = readMediaId(existingPremium) ?? readMediaId(legacyLuxe);
  byId.set("premium_architectural", {
    ...legacyLuxe,
    ...(existingPremium ?? {}),
    id: "premium_architectural",
    title: existingPremium?.title ?? legacyLuxe.title,
    subtitle: existingPremium?.subtitle ?? legacyLuxe.subtitle,
    description: existingPremium?.description ?? legacyLuxe.description,
    imageAlt: existingPremium?.imageAlt ?? legacyLuxe.imageAlt,
    altTextOverride: existingPremium?.altTextOverride ?? legacyLuxe.altTextOverride,
    badgeText: existingPremium?.badgeText ?? legacyLuxe.badgeText ?? "ONLY PREMIUM",
    mediaId,
    imageId: mediaId ?? undefined,
    enabled: existingPremium?.enabled === true,
    flow: existingPremium?.flow ?? legacyLuxe.flow ?? "standard",
    sortOrder: existingPremium?.sortOrder ?? legacyLuxe.sortOrder,
    active: existingPremium?.active ?? legacyLuxe.active ?? true,
  });
  byId.delete("luxe");
}

function mergeAtmosphereChoices(
  defaultItems: WizardAtmosphereChoiceCms[],
  storedItems?: WizardAtmosphereChoiceCms[],
): WizardAtmosphereChoiceCms[] {
  const byId = new Map((storedItems ?? []).map((item) => [item.id, item]));
  migrateLegacyAtmosphereIds(byId);

  return defaultItems.map((defaultItem) => {
    const storedItem = byId.get(defaultItem.id);
    if (!storedItem) return defaultItem;

    const mediaId = readMediaId(storedItem) ?? readMediaId(defaultItem) ?? null;
    const merged: WizardAtmosphereChoiceCms = {
      ...defaultItem,
      ...storedItem,
      mediaId,
      imageId: mediaId ?? undefined,
    };

    if (defaultItem.id === "premium_architectural") {
      return { ...merged, enabled: merged.enabled === true };
    }
    return merged;
  });
}

export function mergeWizardContent(stored?: Partial<CmsWizardContent>): CmsWizardContent {
  const defaults = DEFAULT_CMS_SITE.wizard;
  if (!stored) return defaults;

  const mergeRoomChoices = <T extends { id: string }>(defaultItems: T[], storedItems?: T[]): T[] => {
    if (!storedItems?.length) return defaultItems;
    const byId = new Map(storedItems.map((item) => [item.id, item]));
    return defaultItems.map((item) => {
      const storedItem = byId.get(item.id);
      if (!storedItem) return item;
      const merged = { ...item, ...storedItem };
      const mediaId = readMediaId(merged as { mediaId?: string | null; imageId?: string | null });
      return mediaId ? ({ ...merged, mediaId, imageId: mediaId } as T) : merged;
    });
  };

  return {
    roomChoices: mergeRoomChoices(defaults.roomChoices, stored.roomChoices),
    atmosphereChoices: mergeAtmosphereChoices(defaults.atmosphereChoices, stored.atmosphereChoices),
  };
}

function mergeKantoorPage(stored?: CmsPage): CmsPage {
  const seed = KANTOORVERLICHTING_SEED;
  if (!stored) return seed;
  return {
    ...seed,
    ...stored,
    seo: { ...seed.seo, ...stored.seo },
    blocks: mergePageBlocks(seed.blocks, stored.blocks),
  };
}

export function mergeSitePayload(stored?: Partial<CmsSitePayload>): CmsSitePayload {
  const defaults = mergeSitePayloadDefaults(stored);
  return normalizeSiteMediaPayload({
    ...defaults,
    pages: {
      ...defaults.pages,
      kantoorverlichting: mergeKantoorPage(stored?.pages?.kantoorverlichting),
    },
  });
}

function mergeExampleBlock(defaultBlock: ExampleBlock, storedBlock: ExampleBlock): ExampleBlock {
  const storedSlots = storedBlock.resultExamples ?? [];
  const resultExamples = Array.from({ length: EXAMPLE_IMAGE_SLOT_COUNT }, (_, index) => {
    const storedSlot = storedSlots[index];
    const legacyId = storedBlock.imageIds?.[index];
    const mediaId =
      readMediaId(storedSlot) ??
      readMediaId({ imageId: legacyId }) ??
      readMediaId(defaultBlock.resultExamples?.[index]) ??
      null;
    return {
      mediaId,
      title: storedSlot?.title ?? defaultBlock.resultExamples?.[index]?.title,
      altTextOverride: storedSlot?.altTextOverride ?? defaultBlock.resultExamples?.[index]?.altTextOverride,
    };
  });

  return {
    ...defaultBlock,
    ...storedBlock,
    resultExamples,
    imageIds: resultExamples.map((item) => readMediaId(item)).filter((id): id is string => Boolean(id)),
  };
}

function mergeProductsBlock(defaultBlock: ProductsBlock, storedBlock: ProductsBlock): ProductsBlock {
  const storedItems = storedBlock.items ?? [];
  const defaultItems = defaultBlock.items ?? [];
  const itemCount = Math.max(storedItems.length, defaultItems.length);
  const items = Array.from({ length: itemCount }, (_, index) => {
    const storedItem = storedItems[index];
    const defaultItem = defaultItems[index] ?? { name: "Product", description: "" };
    if (!storedItem) return defaultItem;
    const mediaId = readMediaId(storedItem) ?? readMediaId(defaultItem) ?? null;
    return {
      ...defaultItem,
      ...storedItem,
      mediaId,
      imageId: mediaId ?? undefined,
    };
  });

  return {
    ...defaultBlock,
    ...storedBlock,
    items,
  };
}

function mergeMediaFields<T extends { mediaId?: string | null; imageId?: string | null }>(
  defaultBlock: T,
  storedBlock: T,
): T {
  const mediaId = readMediaId(storedBlock) ?? readMediaId(defaultBlock) ?? null;
  return {
    ...defaultBlock,
    ...storedBlock,
    mediaId,
    imageId: mediaId ?? undefined,
  };
}

function mergeContentBlock(defaultBlock: ContentBlock, storedBlock: ContentBlock): ContentBlock {
  if (defaultBlock.type === "hero" && storedBlock.type === "hero") {
    return mergeMediaFields(defaultBlock as HeroBlock, storedBlock as HeroBlock);
  }
  if (
    (defaultBlock.type === "text-image" || defaultBlock.type === "image-text") &&
    storedBlock.type === defaultBlock.type
  ) {
    return mergeMediaFields(defaultBlock as TextImageBlock, storedBlock as TextImageBlock);
  }
  if (defaultBlock.type === "wide-image" && storedBlock.type === "wide-image") {
    return mergeMediaFields(defaultBlock as WideImageBlock, storedBlock as WideImageBlock);
  }

  const merged = {
    ...defaultBlock,
    ...storedBlock,
    id: defaultBlock.id,
    type: defaultBlock.type,
  } as ContentBlock;

  if (merged.type === "example" && storedBlock.type === "example") {
    return mergeExampleBlock(defaultBlock as ExampleBlock, storedBlock as ExampleBlock);
  }
  if (merged.type === "products" && storedBlock.type === "products") {
    return mergeProductsBlock(defaultBlock as ProductsBlock, storedBlock as ProductsBlock);
  }

  return merged;
}

function mergePageBlocks(defaultBlocks: ContentBlock[], storedBlocks?: ContentBlock[]): ContentBlock[] {
  if (!storedBlocks?.length) return defaultBlocks.map(normalizeContentBlock);
  const storedById = new Map(storedBlocks.map((block) => [block.id, block]));
  const merged: ContentBlock[] = defaultBlocks.map((defaultBlock) => {
    const stored = storedById.get(defaultBlock.id);
    if (!stored || stored.type !== defaultBlock.type) return normalizeContentBlock(defaultBlock);
    return normalizeContentBlock(mergeContentBlock(defaultBlock, stored));
  });
  for (const stored of storedBlocks) {
    if (!defaultBlocks.some((block) => block.id === stored.id)) {
      merged.push(normalizeContentBlock(stored));
    }
  }
  return merged;
}

function mergeHomepage(stored?: Partial<CmsPage>): CmsPage {
  const defaults = DEFAULT_CMS_SITE.homepage;
  const merged: CmsPage = {
    ...defaults,
    ...stored,
    seo: { ...defaults.seo, ...stored?.seo },
    blocks: mergePageBlocks(defaults.blocks, stored?.blocks),
  };

  if (!merged.blocks.some((block) => block.id === "ai-calculator-cta")) {
    const aiBlock = defaults.blocks.find((block) => block.id === "ai-calculator-cta");
    const ctaBottomIdx = merged.blocks.findIndex((block) => block.id === "cta-bottom");
    if (aiBlock) {
      if (ctaBottomIdx >= 0) merged.blocks.splice(ctaBottomIdx, 0, aiBlock);
      else merged.blocks.push(aiBlock);
    }
  }

  return merged;
}

function mergeSitePayloadDefaults(stored?: Partial<CmsSitePayload>): CmsSitePayload {
  const payload = {
    homepage: mergeHomepage(stored?.homepage),
    pages: { ...DEFAULT_CMS_SITE.pages, ...stored?.pages },
    images: { ...DEFAULT_CMS_SITE.images, ...stored?.images },
    wizard: mergeWizardContent(stored?.wizard),
    navigation: stored?.navigation ?? DEFAULT_CMS_SITE.navigation,
  };

  payload.images = Object.fromEntries(
    Object.entries(payload.images).map(([id, record]) => [
      id,
      {
        ...record,
        storageKey: record.storageKey ?? record.filename,
        originalFilename: record.originalFilename ?? record.filename,
        updatedAt: record.updatedAt ?? record.createdAt,
      },
    ]),
  );

  return payload;
}
export function payloadToPublicContent(
  payload: CmsSitePayload,
  meta?: { publishedAt?: string | null; draftUpdatedAt?: string | null },
): CmsSiteContent {
  return {
    ...payload,
    version: 2,
    updatedAt: meta?.publishedAt ?? new Date().toISOString(),
    publishedAt: meta?.publishedAt ?? null,
    draftUpdatedAt: meta?.draftUpdatedAt ?? null,
  };
}

export function isLegacySiteContent(raw: unknown): raw is CmsSiteContent {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "homepage" in raw &&
    !("published" in raw)
  );
}

export function normalizeStorage(raw: unknown): CmsSiteStorage {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "published" in raw &&
    "draft" in raw
  ) {
    const storage = raw as CmsSiteStorage;
    return {
      version: storage.version ?? 2,
      publishedAt: storage.publishedAt ?? null,
      draftUpdatedAt: storage.draftUpdatedAt ?? null,
      published: mergeSitePayload(storage.published),
      draft: mergeSitePayload(storage.draft),
    };
  }

  if (isLegacySiteContent(raw)) {
    const payload = mergeSitePayload(raw);
    const now = raw.updatedAt ?? new Date().toISOString();
    return {
      version: 2,
      publishedAt: now,
      draftUpdatedAt: now,
      published: payload,
      draft: structuredClone(payload),
    };
  }

  const payload = mergeSitePayload();
  const now = new Date().toISOString();
  return {
    version: 2,
    publishedAt: now,
    draftUpdatedAt: now,
    published: payload,
    draft: structuredClone(payload),
  };
}

export function createDefaultBlock(type: import("@/types/cms").ContentBlock["type"]): import("@/types/cms").ContentBlock {
  const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  switch (type) {
    case "hero":
      return {
        id,
        type: "hero",
        headline: "Kop",
        subheadline: "Subtitel",
        primaryCta: "Primaire actie",
        primaryCtaHref: "/lichtadvies",
        secondaryCta: "Secundaire actie",
        secondaryCtaHref: "/contact",
      };
    case "rich-text":
      return { id, type: "rich-text", heading: "Kop", html: "<p>Tekst</p>" };
    case "text":
      return { id, type: "text", heading: "Kop", body: "Tekst" };
    case "text-image":
      return { id, type: "text-image", heading: "Kop", body: "Tekst", imageAlt: "" };
    case "image-text":
      return { id, type: "image-text", heading: "Kop", body: "Tekst", imageAlt: "" };
    case "wide-image":
      return { id, type: "wide-image", alt: "Afbeelding" };
    case "comparison":
      return {
        id,
        type: "comparison",
        heading: "Vergelijking",
        columns: [
          {
            title: "Optie A",
            intro: "Geschikt wanneer:",
            items: ["Punt 1"],
            ctaText: "Meer info",
            ctaHref: "/lichtadvies",
          },
          {
            title: "Optie B",
            intro: "Geschikt wanneer:",
            items: ["Punt 1"],
            ctaText: "Contact",
            ctaHref: "/contact",
          },
        ],
      };
    case "benefits":
      return { id, type: "benefits", heading: "Voordelen", items: [{ title: "Voordeel", description: "Omschrijving" }] };
    case "steps":
      return {
        id,
        type: "steps",
        heading: "Stappen",
        cta: "Start",
        ctaHref: "/lichtadvies",
        items: [{ title: "Stap 1", description: "Omschrijving" }],
      };
    case "products":
      return {
        id,
        type: "products",
        heading: "Producten",
        intro: "Intro",
        items: [{ name: "Product", description: "Omschrijving" }],
      };
    case "cta":
      return {
        id,
        type: "cta",
        heading: "Actie",
        body: "Tekst",
        buttonText: "Knop",
        buttonHref: "/lichtadvies",
      };
    case "faq":
      return {
        id,
        type: "faq",
        heading: "FAQ",
        items: [{ question: "Vraag?", answer: "Antwoord." }],
      };
    case "example":
      return {
        id,
        type: "example",
        heading: "Voorbeeld",
        body: "Tekst",
        resultExamples: Array.from({ length: EXAMPLE_IMAGE_SLOT_COUNT }, () => ({ mediaId: null })),
      };
    case "quote":
      return { id, type: "quote", quote: "Quote", author: "Auteur" };
    case "ai-calculator-cta":
      return {
        id,
        type: "ai-calculator-cta",
        heading: "Uw eigen AI lichtcalculator?",
        body: "Tekst over een eigen AI-calculator.",
        buttonText: "Neem contact met ons op",
        buttonHref: "/ai-calculator",
      };
    case "ai-calculator-form":
      return {
        id,
        type: "ai-calculator-form",
        heading: "Bespreek mijn AI-calculator",
        intro: "Vertel kort wat u zoekt.",
        submitButtonText: "Bespreek mijn AI-calculator",
      };
    default:
      return { id, type: "text", body: "Tekst" };
  }
}

export type { CmsPage, CmsImageRecord };
