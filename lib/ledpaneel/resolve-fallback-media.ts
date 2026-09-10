import { resolveMediaFromSource, type LegacyMediaSource, type ResolvedMedia } from "@/lib/cms/media";
import { fallbackAltText } from "@/lib/ledpaneel/fallback-images";
import type { CmsImageRecord } from "@/types/cms";

export function fallbackMedia(path: string, altText: string): ResolvedMedia {
  return {
    id: `fallback:${path}`,
    url: path,
    altText,
    mimeType: "image/webp",
  };
}

export function resolveMediaWithFallback(
  images: Record<string, CmsImageRecord> | undefined,
  source: LegacyMediaSource | null | undefined,
  fallbackPath: string | null | undefined,
  options?: { altFallback?: string; altOverride?: string; context?: string },
): ResolvedMedia | null {
  const cmsMedia = resolveMediaFromSource(images, source, options);
  if (cmsMedia?.url) return cmsMedia;
  if (!fallbackPath) return null;
  return fallbackMedia(
    fallbackPath,
    options?.altOverride || fallbackAltText(fallbackPath, options?.altFallback),
  );
}

export function resolveMediaUrlWithFallback(
  images: Record<string, CmsImageRecord> | undefined,
  source: LegacyMediaSource | null | undefined,
  fallbackPath: string | null | undefined,
  options?: { altFallback?: string; altOverride?: string; context?: string },
): string | null {
  return resolveMediaWithFallback(images, source, fallbackPath, options)?.url ?? null;
}
