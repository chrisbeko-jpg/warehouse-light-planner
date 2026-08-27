import type { CmsImageRecord } from "@/types/cms";
import { imagePublicUrl } from "@/lib/cms/image-url";

export function resolveCmsImageUrl(
  images: Record<string, CmsImageRecord> | undefined,
  imageId?: string | null,
  context?: string,
): string | null {
  try {
    if (!imageId || typeof imageId !== "string") return null;
    const record = images?.[imageId];
    if (!record) {
      console.warn(`Missing CMS media${context ? ` (${context})` : ""}: ${imageId}`);
      return null;
    }
    if (record.url?.startsWith("http")) return record.url;
    return imagePublicUrl(imageId);
  } catch (error) {
    console.error("Failed to resolve CMS image URL", { imageId, context, error });
    return null;
  }
}

export function resolveCmsImageAlt(
  images: Record<string, CmsImageRecord> | undefined,
  imageId: string | undefined | null,
  fallback: string,
): string {
  try {
    if (!imageId || typeof imageId !== "string") return fallback;
    return images?.[imageId]?.alt || images?.[imageId]?.title || fallback;
  } catch (error) {
    console.error("Failed to resolve CMS image alt", { imageId, error });
    return fallback;
  }
}
