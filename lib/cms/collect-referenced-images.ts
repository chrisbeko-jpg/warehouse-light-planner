import { readMediaId } from "@/lib/cms/media";
import type { CmsPage, CmsSitePayload, ContentBlock, ExampleImageRef } from "@/types/cms";

function collectMediaId(id: string | null | undefined, ids: Set<string>): void {
  const mediaId = readMediaId({ mediaId: id, imageId: id });
  if (mediaId) ids.add(mediaId);
}

function collectFromBlock(block: ContentBlock, ids: Set<string>): void {
  if ("mediaId" in block || "imageId" in block) {
    collectMediaId(readMediaId(block as { mediaId?: string | null; imageId?: string | null }), ids);
  }

  if (block.type === "example") {
    for (const item of block.resultExamples ?? []) {
      collectMediaId(readMediaId(item), ids);
    }
    for (const legacyId of block.imageIds ?? []) {
      collectMediaId(legacyId, ids);
    }
  }

  if (block.type === "products") {
    for (const item of block.items) {
      collectMediaId(readMediaId(item), ids);
    }
  }
}

function collectFromPage(page: CmsPage, ids: Set<string>): void {
  collectMediaId(readMediaId({ mediaId: page.seo.ogMediaId, imageId: page.seo.ogImageId }), ids);
  for (const block of page.blocks) collectFromBlock(block, ids);
}

export function collectReferencedImageIds(payload: CmsSitePayload): string[] {
  const ids = new Set<string>();
  collectFromPage(payload.homepage, ids);
  for (const page of Object.values(payload.pages)) collectFromPage(page, ids);
  for (const choice of payload.wizard.roomChoices) {
    collectMediaId(readMediaId(choice), ids);
  }
  for (const choice of payload.wizard.atmosphereChoices) {
    collectMediaId(readMediaId(choice), ids);
  }
  return [...ids];
}

export function collectExampleMediaIds(examples: ExampleImageRef[] | undefined): string[] {
  return (examples ?? []).map((item) => readMediaId(item)).filter((id): id is string => Boolean(id));
}
