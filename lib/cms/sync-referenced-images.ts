import { collectReferencedImageIds } from "@/lib/cms/collect-referenced-images";
import type { CmsImageRecord, CmsSitePayload } from "@/types/cms";

export function syncReferencedImages(
  payload: CmsSitePayload,
  sourceImages: Record<string, CmsImageRecord>,
): void {
  for (const id of collectReferencedImageIds(payload)) {
    if (!payload.images[id] && sourceImages[id]) {
      payload.images[id] = sourceImages[id];
    }
  }
}

export function findMissingReferencedImages(payload: CmsSitePayload): string[] {
  return collectReferencedImageIds(payload).filter((id) => !payload.images[id]);
}
