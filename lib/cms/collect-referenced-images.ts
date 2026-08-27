import type { CmsPage, CmsSitePayload, ContentBlock } from "@/types/cms";

function collectFromBlock(block: ContentBlock, ids: Set<string>): void {
  if ("imageId" in block && block.imageId) ids.add(block.imageId);
  if (block.type === "example") {
    for (const id of block.imageIds) {
      if (id) ids.add(id);
    }
  }
  if (block.type === "products") {
    for (const item of block.items) {
      if (item.imageId) ids.add(item.imageId);
    }
  }
}

function collectFromPage(page: CmsPage, ids: Set<string>): void {
  if (page.seo.ogImageId) ids.add(page.seo.ogImageId);
  for (const block of page.blocks) collectFromBlock(block, ids);
}

export function collectReferencedImageIds(payload: CmsSitePayload): string[] {
  const ids = new Set<string>();
  collectFromPage(payload.homepage, ids);
  for (const page of Object.values(payload.pages)) collectFromPage(page, ids);
  for (const choice of payload.wizard.roomChoices) {
    if (choice.imageId) ids.add(choice.imageId);
  }
  for (const choice of payload.wizard.atmosphereChoices) {
    if (choice.imageId) ids.add(choice.imageId);
  }
  return [...ids];
}
