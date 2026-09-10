import assert from "node:assert/strict";
import test from "node:test";
import { FALLBACK_IMAGES } from "@/lib/ledpaneel/fallback-images";
import { fallbackMedia, resolveMediaWithFallback } from "@/lib/ledpaneel/resolve-fallback-media";

test("resolveMediaWithFallback prefers CMS media over fallback", () => {
  const cms = resolveMediaWithFallback(
    {
      "img-hero": {
        id: "img-hero",
        filename: "hero.jpg",
        mimeType: "image/jpeg",
        alt: "CMS hero",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    },
    { mediaId: "img-hero" },
    FALLBACK_IMAGES.homepageHero,
    { altFallback: "Fallback hero" },
  );

  assert.equal(cms?.url, "/api/cms/images/img-hero");
  assert.equal(cms?.altText, "CMS hero");
});

test("resolveMediaWithFallback uses fallback when CMS media is missing", () => {
  const fallback = resolveMediaWithFallback({}, { mediaId: null }, FALLBACK_IMAGES.homepageHero, {
    altFallback: "Homepage hero",
  });

  assert.equal(fallback?.url, FALLBACK_IMAGES.homepageHero);
  assert.match(fallback?.altText ?? "", /kantoor/i);
});

test("fallbackMedia returns static public asset metadata", () => {
  const media = fallbackMedia(FALLBACK_IMAGES.products.downlight_4000, "Downlight");
  assert.equal(media.url, FALLBACK_IMAGES.products.downlight_4000);
  assert.equal(media.mimeType, "image/webp");
});
