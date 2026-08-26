import { DEFAULT_CMS_SITE } from "@/lib/cms/defaults";
import { KANTOORVERLICHTING_SEED } from "@/lib/cms/seeds/kantoorverlichting";
import type {
  CmsImageRecord,
  CmsPage,
  CmsSiteContent,
  CmsSitePayload,
  CmsSiteStorage,
  CmsWizardContent,
} from "@/types/cms";

function mergeWizardContent(stored?: Partial<CmsWizardContent>): CmsWizardContent {
  const defaults = DEFAULT_CMS_SITE.wizard;
  if (!stored) return defaults;

  const mergeChoices = <T extends { id: string }>(defaultItems: T[], storedItems?: T[]): T[] => {
    if (!storedItems?.length) return defaultItems;
    const byId = new Map(storedItems.map((item) => [item.id, item]));
    return defaultItems.map((item) => ({ ...item, ...byId.get(item.id) }));
  };

  return {
    roomChoices: mergeChoices(defaults.roomChoices, stored.roomChoices),
    atmosphereChoices: mergeChoices(defaults.atmosphereChoices, stored.atmosphereChoices),
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
  return {
    ...defaults,
    pages: {
      ...defaults.pages,
      kantoorverlichting: mergeKantoorPage(stored?.pages?.kantoorverlichting),
    },
  };
}

function mergeSitePayloadDefaults(stored?: Partial<CmsSitePayload>): CmsSitePayload {
  return {
    homepage: { ...DEFAULT_CMS_SITE.homepage, ...stored?.homepage },
    pages: { ...DEFAULT_CMS_SITE.pages, ...stored?.pages },
    images: { ...DEFAULT_CMS_SITE.images, ...stored?.images },
    wizard: mergeWizardContent(stored?.wizard),
    navigation: stored?.navigation ?? DEFAULT_CMS_SITE.navigation,
  };
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
      return { id, type: "example", heading: "Voorbeeld", body: "Tekst", imageIds: [] };
    case "quote":
      return { id, type: "quote", quote: "Quote", author: "Auteur" };
    default:
      return { id, type: "text", body: "Tekst" };
  }
}

export type { CmsPage, CmsImageRecord };
