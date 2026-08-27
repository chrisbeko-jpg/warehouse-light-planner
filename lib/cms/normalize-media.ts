import { EXAMPLE_IMAGE_SLOT_COUNT, readMediaId } from "@/lib/cms/media";
import type {
  CmsPage,
  CmsSitePayload,
  CmsWizardContent,
  ContentBlock,
  ExampleBlock,
  ExampleImageRef,
  HeroBlock,
  ProductsBlock,
  TextImageBlock,
  WideImageBlock,
  WizardAtmosphereChoiceCms,
  WizardRoomChoiceCms,
} from "@/types/cms";

function normalizeExampleBlock(block: ExampleBlock): ExampleBlock {
  const slots: ExampleImageRef[] = [];

  if (block.resultExamples?.length) {
    for (const item of block.resultExamples) {
      const mediaId = readMediaId(item);
      if (mediaId) {
        slots.push({
          mediaId,
          title: item.title,
          altTextOverride: item.altTextOverride,
        });
      }
    }
  } else if (block.imageIds?.length) {
    for (const legacyId of block.imageIds) {
      const mediaId = readMediaId({ imageId: legacyId });
      if (mediaId) slots.push({ mediaId });
    }
  }

  while (slots.length < EXAMPLE_IMAGE_SLOT_COUNT) {
    slots.push({ mediaId: null });
  }

  return {
    ...block,
    resultExamples: slots.slice(0, EXAMPLE_IMAGE_SLOT_COUNT),
    imageIds: slots.map((item) => readMediaId(item)).filter((id): id is string => Boolean(id)),
  };
}

function normalizeHeroBlock(block: HeroBlock): HeroBlock {
  const mediaId = readMediaId(block);
  return {
    ...block,
    mediaId,
    imageId: mediaId ?? undefined,
    altTextOverride: block.altTextOverride ?? block.imageAlt,
    imageAlt: block.altTextOverride ?? block.imageAlt,
  };
}

function normalizeImageBlock<T extends TextImageBlock | WideImageBlock>(block: T): T {
  const mediaId = readMediaId(block);
  return {
    ...block,
    mediaId,
    imageId: mediaId ?? undefined,
    ...(block.type === "text-image" || block.type === "image-text"
      ? {
          altTextOverride: block.altTextOverride ?? block.imageAlt,
          imageAlt: block.altTextOverride ?? block.imageAlt,
        }
      : {}),
  };
}

function normalizeProductsBlock(block: ProductsBlock): ProductsBlock {
  return {
    ...block,
    items: block.items.map((item) => {
      const mediaId = readMediaId(item);
      return {
        ...item,
        mediaId,
        imageId: mediaId ?? undefined,
      };
    }),
  };
}

export function normalizeContentBlock(block: ContentBlock): ContentBlock {
  switch (block.type) {
    case "hero":
      return normalizeHeroBlock(block);
    case "text-image":
    case "image-text":
    case "wide-image":
      return normalizeImageBlock(block);
    case "products":
      return normalizeProductsBlock(block);
    case "example":
      return normalizeExampleBlock(block);
    default:
      return block;
  }
}

function normalizePage(page: CmsPage): CmsPage {
  const ogMediaId = readMediaId({ mediaId: page.seo.ogMediaId, imageId: page.seo.ogImageId });
  return {
    ...page,
    blocks: page.blocks.map(normalizeContentBlock),
    seo: {
      ...page.seo,
      ogMediaId,
      ogImageId: ogMediaId ?? undefined,
    },
  };
}

function normalizeWizardChoice<T extends WizardRoomChoiceCms | WizardAtmosphereChoiceCms>(choice: T): T {
  const mediaId = readMediaId(choice);
  return {
    ...choice,
    mediaId,
    imageId: mediaId ?? undefined,
  };
}

function normalizeWizard(wizard: CmsWizardContent): CmsWizardContent {
  return {
    roomChoices: wizard.roomChoices.map(normalizeWizardChoice),
    atmosphereChoices: wizard.atmosphereChoices.map(normalizeWizardChoice),
  };
}

export function normalizeSiteMediaPayload(payload: CmsSitePayload): CmsSitePayload {
  return {
    ...payload,
    homepage: normalizePage(payload.homepage),
    pages: Object.fromEntries(
      Object.entries(payload.pages).map(([slug, page]) => [slug, normalizePage(page)]),
    ),
    wizard: normalizeWizard(payload.wizard),
  };
}

export function getExampleImageSlots(block: ExampleBlock): ExampleImageRef[] {
  const normalized = normalizeExampleBlock(block);
  return normalized.resultExamples ?? [];
}
