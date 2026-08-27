import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { CmsPage } from "@/types/cms";
import { EXAMPLE_IMAGE_SLOT_COUNT } from "@/lib/cms/media";
import { snapshotPageMediaReferences, snapshotSiteMediaReferences } from "@/lib/cms/media-reference-audit";
import { applyMediaId } from "@/lib/cms/media";
import { DEFAULT_WIZARD_CONTENT } from "@/lib/cms/defaults";

const testDataDir = mkdtempSync(join(tmpdir(), "cms-storage-e2e-"));
process.env.DATA_DIR = testDataDir;

function buildFixturePage(): CmsPage {
  return {
    slug: "/",
    title: "Diagnostic homepage",
    seo: { title: "T", description: "D", ogMediaId: "img-test-og" },
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
        mediaId: "img-test-hero",
        imageId: "img-test-hero",
      },
      {
        id: "example",
        type: "example",
        heading: "Example",
        body: "Body",
        resultExamples: Array.from({ length: EXAMPLE_IMAGE_SLOT_COUNT }, (_, index) => ({
          mediaId: `img-test-example-${index + 1}`,
          title: `Voorbeeld ${index + 1}`,
        })),
        imageIds: Array.from({ length: EXAMPLE_IMAGE_SLOT_COUNT }, (_, index) => `img-test-example-${index + 1}`),
      },
      {
        id: "products",
        type: "products",
        heading: "Products",
        intro: "Intro",
        items: Array.from({ length: 4 }, (_, index) => ({
          name: `Product ${index + 1}`,
          description: "Desc",
          mediaId: `img-test-product-${index + 1}`,
          imageId: `img-test-product-${index + 1}`,
        })),
      },
    ],
  };
}

test("end-to-end storage pipeline preserves mediaIds at every step", async () => {
  const { saveCmsDraftPage, loadCmsDraft } = await import("./content-store");
  const { readSiteStorage, readSiteStorageAtVersion } = await import("./blob-storage");

  const fixture = buildFixturePage();
  const expected = snapshotPageMediaReferences(fixture);

  const saveResult = await saveCmsDraftPage("homepage", fixture);
  assert.equal(saveResult.site.homepage.blocks.find((b) => b.id === "hero")?.type, "hero");
  if (saveResult.site.homepage.blocks.find((b) => b.id === "hero")?.type === "hero") {
    assert.equal(
      saveResult.site.homepage.blocks.find((b) => b.id === "hero")?.mediaId,
      "img-test-hero",
    );
  }

  const afterApi = snapshotPageMediaReferences(saveResult.site.homepage);
  assert.equal(afterApi.homepageHero, expected.homepageHero);
  assert.deepEqual(afterApi.exampleSlots, expected.exampleSlots);
  assert.deepEqual(afterApi.productItems, expected.productItems);

  assert.ok(saveResult.versionPath, "expected version path from write");

  const writtenVersion = await readSiteStorageAtVersion(saveResult.versionPath!);
  assert.ok(writtenVersion);
  const afterWrittenVersion = snapshotPageMediaReferences(writtenVersion!.draft.homepage);
  assert.equal(afterWrittenVersion.homepageHero, expected.homepageHero);

  const afterReadStorage = await readSiteStorage();
  const afterNormalize = snapshotPageMediaReferences(afterReadStorage.draft.homepage);
  assert.equal(afterNormalize.homepageHero, expected.homepageHero);
  assert.deepEqual(afterNormalize.exampleSlots, expected.exampleSlots);

  const reloadedEditor = await loadCmsDraft();
  const afterReload = snapshotPageMediaReferences(reloadedEditor.homepage);
  assert.equal(afterReload.homepageHero, expected.homepageHero);
  assert.deepEqual(afterReload.exampleSlots, expected.exampleSlots);
  assert.deepEqual(afterReload.productItems, expected.productItems);
});

test("wizard room and atmosphere mediaIds survive save and reload", async () => {
  const { saveCmsDraft, loadCmsDraft } = await import("./content-store");

  const roomId = DEFAULT_WIZARD_CONTENT.roomChoices[0]!.id;
  const atmosphereId = DEFAULT_WIZARD_CONTENT.atmosphereChoices.find((c) => c.id === "warm")!.id;
  const wizard = {
    ...DEFAULT_WIZARD_CONTENT,
    roomChoices: DEFAULT_WIZARD_CONTENT.roomChoices.map((choice, index) =>
      index === 0 ? applyMediaId(choice, "img-test-wizard-room") : choice,
    ),
    atmosphereChoices: DEFAULT_WIZARD_CONTENT.atmosphereChoices.map((choice) =>
      choice.id === atmosphereId ? applyMediaId(choice, "img-test-wizard-atmosphere") : choice,
    ),
  };

  const saveResult = await saveCmsDraft({ wizard });
  const expected = snapshotSiteMediaReferences(saveResult.site);
  assert.equal(expected.wizardRooms[roomId], "img-test-wizard-room");
  assert.equal(expected.wizardAtmospheres[atmosphereId], "img-test-wizard-atmosphere");

  const reloaded = await loadCmsDraft();
  const afterReload = snapshotSiteMediaReferences(reloaded);
  assert.equal(afterReload.wizardRooms[roomId], "img-test-wizard-room");
  assert.equal(afterReload.wizardAtmospheres[atmosphereId], "img-test-wizard-atmosphere");
});

test.after(() => {
  rmSync(testDataDir, { recursive: true, force: true });
});
