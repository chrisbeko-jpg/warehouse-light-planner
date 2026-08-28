import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DEFAULT_CMS_SITE } from "@/lib/cms/defaults";
import { mergeSitePayload } from "@/lib/cms/merge";
import { normalizePage } from "@/lib/cms/normalize-media";
import { applyMediaId } from "@/lib/cms/media";
import {
  assertMediaReferencesPreserved,
  diffMediaReferences,
  snapshotSiteMediaReferences,
} from "@/lib/cms/media-reference-audit";
import type { CmsSitePayload, WizardAtmosphereChoiceCms } from "@/types/cms";

const testDataDir = mkdtempSync(join(tmpdir(), "cms-homepage-save-"));
process.env.DATA_DIR = testDataDir;

function buildProductionLikeDraft(): CmsSitePayload {
  const page = structuredClone(DEFAULT_CMS_SITE.homepage);
  const hero = page.blocks.find((block) => block.id === "hero");
  if (hero?.type === "hero") Object.assign(hero, applyMediaId(hero, "img-hero-live"));
  const example = page.blocks.find((block) => block.id === "example");
  if (example?.type === "example") {
    example.resultExamples = Array.from({ length: 4 }, (_, index) => ({
      mediaId: `img-example-live-${index + 1}`,
    }));
    example.imageIds = Array.from({ length: 4 }, (_, index) => `img-example-live-${index + 1}`);
  }
  const products = page.blocks.find((block) => block.id === "products");
  if (products?.type === "products") {
    products.items = products.items.map((item, index) => ({
      ...item,
      ...applyMediaId(item, `img-product-live-${index + 1}`),
    }));
  }

  const premium = DEFAULT_CMS_SITE.wizard.atmosphereChoices.find((c) => c.id === "premium_architectural")!;
  const legacyLuxe: WizardAtmosphereChoiceCms = {
    ...premium,
    id: "luxe",
    mediaId: null,
    imageId: undefined,
  };

  return mergeSitePayload({
    homepage: normalizePage(page),
    wizard: {
      ...DEFAULT_CMS_SITE.wizard,
      atmosphereChoices: [
        ...DEFAULT_CMS_SITE.wizard.atmosphereChoices.map((choice) => {
          if (choice.id === "neutraal") return applyMediaId(choice, "img-atmo-neutraal-live");
          if (choice.id === "premium_architectural") return applyMediaId(choice, "img-atmo-premium-live");
          return choice;
        }),
        legacyLuxe,
      ],
    },
  });
}

test("mergeSitePayload is idempotent for production-like CMS draft", () => {
  const once = buildProductionLikeDraft();
  const twice = mergeSitePayload(once);
  const lost = diffMediaReferences(snapshotSiteMediaReferences(once), snapshotSiteMediaReferences(twice));
  assert.deepEqual(lost, [], lost.join("; "));
});

test("saveCmsDraftPage on production-like draft survives normalized-read", async () => {
  const { saveCmsDraftPage, loadCmsDraft } = await import("./content-store");
  const { writeSiteStorage } = await import("./blob-storage");

  const seedDraft = buildProductionLikeDraft();
  await writeSiteStorage({
    version: 2,
    publishedAt: null,
    draftUpdatedAt: new Date().toISOString(),
    published: mergeSitePayload(),
    draft: seedDraft,
  });

  const page = structuredClone(seedDraft.homepage);
  const hero = page.blocks.find((block) => block.id === "hero");
  if (hero?.type === "hero") Object.assign(hero, applyMediaId(hero, "img-hero-updated"));
  const example = page.blocks.find((block) => block.id === "example");
  if (example?.type === "example") {
    example.resultExamples = Array.from({ length: 4 }, (_, index) => ({
      mediaId: `img-example-updated-${index + 1}`,
    }));
    example.imageIds = Array.from({ length: 4 }, (_, index) => `img-example-updated-${index + 1}`);
  }

  const result = await saveCmsDraftPage("homepage", normalizePage(page));
  const reloaded = await loadCmsDraft();
  const expected = snapshotSiteMediaReferences(result.site);
  assertMediaReferencesPreserved(
    expected,
    snapshotSiteMediaReferences(reloaded),
    "reload-after-homepage-save",
  );
});

test.after(() => {
  rmSync(testDataDir, { recursive: true, force: true });
});
