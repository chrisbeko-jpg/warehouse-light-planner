import type { CmsImageRecord } from "@/types/cms";
import { imagePublicUrl } from "@/lib/cms/image-url";

export function resolveCmsImageUrl(
  images: Record<string, CmsImageRecord>,
  imageId?: string,
  context?: string,
): string | null {
  if (!imageId) return null;
  const record = images[imageId];
  if (!record) {
    console.warn(`Missing atmosphere media${context ? ` (${context})` : ""}: ${imageId}`);
    return null;
  }
  if (record.url?.startsWith("http")) return record.url;
  return imagePublicUrl(imageId);
}

export function resolveCmsImageAlt(
  images: Record<string, CmsImageRecord>,
  imageId: string | undefined,
  fallback: string,
): string {
  if (!imageId) return fallback;
  return images[imageId]?.alt || images[imageId]?.title || fallback;
}
