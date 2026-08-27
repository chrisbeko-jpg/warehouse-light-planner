import { DEFAULT_CMS_SITE } from "@/lib/cms/defaults";
import { normalizeSiteMediaPayload } from "@/lib/cms/normalize-media";
import { EXAMPLE_IMAGE_SLOT_COUNT } from "@/lib/cms/media";
import { KANTOORVERLICHTING_SEED } from "@/lib/cms/seeds/kantoorverlichting";
import type {
  CmsImageRecord,
  CmsPage,
  CmsSiteContent,
  CmsSitePayload,
  CmsSiteStorage,
  CmsWizardContent,
  ContentBlock,
} from "@/types/cms";

function mergeWizardContent(stored?: Partial<CmsWizardContent>): CmsWizardContent {
  const defaults = DEFAULT_CMS_SITE.wizard;
  if (!stored) return defaults;

  const mergeRoomChoices = <T extends { id: string }>(defaultItems: T[], storedItems?: T[]): T[] => {
    if (!storedItems?.length) return defaultItems;
    const byId = new Map(storedItems.map((item) => [item.id, item]));
    return defaultItems.map((item) => ({ ...item, ...byId.get(item.id) }));
  };

  const storedAtmospheres = stored.atmosphereChoices ?? [];
  const byId = new Map(storedAtmospheres.map((item) => [item.id, item]));
  const legacyLuxe = byId.get("luxe");
  if (legacyLuxe) {
    byId.set("premium_architectural", {
      ...legacyLuxe,
      id: "premium_architectural",
      enabled: false,
      flow: "standard",
      badgeText: legacyLuxe.badgeText ?? "ONLY PREMIUM",
    });
    byId.delete("luxe");
  }

  const atmosphereChoices = defaults.atmosphereChoices.map((item) => {
    const merged = { ...item, ...byId.get(item.id) };
    if (item.id === "premium_architectural") {
      return { ...merged, enabled: merged.enabled === true ? true : false };
    }
    return merged;
  });

  return {
    roomChoices: mergeRoomChoices(defaults.roomChoices, stored.roomChoices),
    atmosphereChoices,
  };
}

function mergeKantoorPage(stored?: CmsPage): CmsPage {
  const seed = KANTOORVERLICHTING_SEED;
  if (!stored) return seed;
  const hasSeedStructure =
    stored.blocks.some((b) => b.id === "faq") &&
    stored.blocks.some((b) => b.type === "hero") &&
    stored.blocks.length >= 10;
  if (hasSeedStructure) {
    return { ...seed, ...stored, seo: { ...seed.seo, ...stored.seo } };
  }
  return {
    ...seed,
    ...stored,
    seo: { ...seed.seo, ...stored.seo },
    blocks: seed.blocks,
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

function mergePageBlocks(defaultBlocks: ContentBlock[], storedBlocks?: ContentBlock[]): ContentBlock[] {
  if (!storedBlocks?.length) return [...defaultBlocks];
  const storedById = new Map(storedBlocks.map((block) => [block.id, block]));
  const merged: ContentBlock[] = defaultBlocks.map((defaultBlock) => {
    const stored = storedById.get(defaultBlock.id);
    if (!stored || stored.type !== defaultBlock.type) return defaultBlock;
    return { ...defaultBlock, ...stored, id: defaultBlock.id, type: defaultBlock.type } as ContentBlock;
  });
  for (const stored of storedBlocks) {
    if (!defaultBlocks.some((block) => block.id === stored.id)) {
      merged.push(stored);
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
