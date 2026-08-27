import { readMediaId, resolveMedia, type ResolvedMedia } from "@/lib/cms/media";
import type { CmsImageRecord } from "@/types/cms";
import { imagePublicUrl } from "@/lib/cms/image-url";

export function resolveCmsImageUrl(
  images: Record<string, CmsImageRecord> | undefined,
  mediaId?: string | null,
  context?: string,
): string | null {
  return resolveMedia(images, readMediaId({ mediaId, imageId: mediaId }), { context })?.url ?? null;
}

export function resolveCmsImageAlt(
  images: Record<string, CmsImageRecord> | undefined,
  mediaId: string | undefined | null,
  fallback: string,
): string {
  return (
    resolveMedia(images, readMediaId({ mediaId, imageId: mediaId }), { altFallback: fallback })?.altText ??
    fallback
  );
}

export { resolveMedia, readMediaId, type ResolvedMedia };
