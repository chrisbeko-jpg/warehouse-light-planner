import assert from "node:assert/strict";
import test from "node:test";
import { mergeSitePayload } from "./merge";
import { normalizeExampleBlock, normalizePage } from "./normalize-media";
import type { ExampleBlock } from "@/types/cms";

test("mergePageBlocks preserves hero mediaId after save round-trip", () => {
  const merged = mergeSitePayload({
    homepage: {
      slug: "/",
      title: "Test",
      seo: { title: "T", description: "D" },
      blocks: [
        {
          id: "hero",
          type: "hero",
          headline: "H",
          subheadline: "S",
          primaryCta: "A",
          primaryCtaHref: "/a",
          secondaryCta: "B",
          secondaryCtaHref: "/b",
          mediaId: "img-hero-1",
          imageId: "img-hero-1",
        },
      ],
    },
  });

  const hero = merged.homepage.blocks.find((block) => block.id === "hero");
  assert.equal(hero?.type, "hero");
  if (hero?.type === "hero") {
    assert.equal(hero.mediaId, "img-hero-1");
  }

  const roundTrip = mergeSitePayload(merged);
  const heroAfterRead = roundTrip.homepage.blocks.find((block) => block.id === "hero");
  assert.equal(heroAfterRead?.type, "hero");
  if (heroAfterRead?.type === "hero") {
    assert.equal(heroAfterRead.mediaId, "img-hero-1");
  }
});

test("mergePageBlocks preserves example imageIds when resultExamples are missing", () => {
  const merged = mergeSitePayload({
    homepage: {
      slug: "/",
      title: "Test",
      seo: { title: "T", description: "D" },
      blocks: [
        {
          id: "example",
          type: "example",
          heading: "Example",
          body: "Body",
          imageIds: ["img-ex-1", "img-ex-2"],
        },
      ],
    },
  });

  const example = merged.homepage.blocks.find((block) => block.id === "example");
  assert.equal(example?.type, "example");
  if (example?.type === "example") {
    assert.equal(example.resultExamples?.[0]?.mediaId, "img-ex-1");
    assert.equal(example.resultExamples?.[1]?.mediaId, "img-ex-2");
  }
});

test("normalizeExampleBlock keeps slot positions and legacy imageIds", () => {
  const block: ExampleBlock = {
    id: "example",
    type: "example",
    heading: "H",
    body: "B",
    imageIds: ["img-slot-1", "img-slot-2"],
    resultExamples: [
      { mediaId: null },
      { mediaId: null },
      { mediaId: null },
      { mediaId: null },
    ],
  };

  const normalized = normalizeExampleBlock(block);
  assert.equal(normalized.resultExamples?.[0]?.mediaId, "img-slot-1");
  assert.equal(normalized.resultExamples?.[1]?.mediaId, "img-slot-2");
});

test("normalizePage preserves ogMediaId", () => {
  const page = normalizePage({
    slug: "/x",
    title: "X",
    seo: {
      title: "T",
      description: "D",
      ogMediaId: "img-og-1",
    },
    blocks: [],
  });
  assert.equal(page.seo.ogMediaId, "img-og-1");
});
