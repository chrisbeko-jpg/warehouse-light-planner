import type { CmsImageRecord } from "@/types/cms";
import { imagePublicUrl } from "@/lib/cms/image-url";

export interface MediaReference {
  mediaId: string | null;
  altTextOverride?: string;
}

export interface ResolvedMedia {
  id: string;
  url: string;
  altText: string;
  width?: number;
  height?: number;
  mimeType: string;
}

export interface LegacyMediaSource {
  mediaId?: string | null;
  imageId?: string | null;
  imageMediaId?: string | null;
}

export function readMediaId(source: LegacyMediaSource | null | undefined): string | null {
  if (!source) return null;
  const raw = source.mediaId ?? source.imageMediaId ?? source.imageId;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function resolveMedia(
  images: Record<string, CmsImageRecord> | undefined,
  mediaId: string | null | undefined,
  options?: { altFallback?: string; altOverride?: string; context?: string },
): ResolvedMedia | null {
  try {
    const id = typeof mediaId === "string" ? mediaId.trim() : "";
    if (!id) return null;

    const record = images?.[id];
    if (!record) {
      console.warn(`Missing CMS media${options?.context ? ` (${options.context})` : ""}: ${id}`);
      return null;
    }

    const url = record.url?.startsWith("http") ? record.url : imagePublicUrl(id);
    return {
      id,
      url,
      altText: options?.altOverride || record.alt || record.title || options?.altFallback || "",
      width: record.width,
      height: record.height,
      mimeType: record.mimeType,
    };
  } catch (error) {
    console.error("Failed to resolve media", { mediaId, context: options?.context, error });
    return null;
  }
}

export function resolveMediaFromSource(
  images: Record<string, CmsImageRecord> | undefined,
  source: LegacyMediaSource | null | undefined,
  options?: { altFallback?: string; altOverride?: string; context?: string },
): ResolvedMedia | null {
  const altOverride = options?.altOverride ?? (source as { altTextOverride?: string })?.altTextOverride;
  return resolveMedia(images, readMediaId(source), {
    ...options,
    altOverride: altOverride || options?.altOverride,
  });
}

export function applyMediaId<T extends LegacyMediaSource>(target: T, mediaId: string | undefined): T {
  const id = mediaId?.trim() || null;
  if (!id) {
    const cleared = { ...target, mediaId: null } as T;
    if ("imageId" in cleared) {
      delete (cleared as LegacyMediaSource).imageId;
    }
    return cleared;
  }
  return { ...target, mediaId: id, imageId: id } as T;
}

export const EXAMPLE_IMAGE_SLOT_COUNT = 4;
