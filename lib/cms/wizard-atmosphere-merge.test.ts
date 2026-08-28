import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_WIZARD_CONTENT } from "@/lib/cms/defaults";
import { mergeSitePayload, mergeWizardContent, normalizeStorage } from "@/lib/cms/merge";
import { normalizeWizard } from "@/lib/cms/normalize-media";
import { applyMediaId } from "@/lib/cms/media";
import {
  assertMediaReferencesPreserved,
  snapshotSiteMediaReferences,
} from "@/lib/cms/media-reference-audit";
import type { CmsSiteStorage, WizardAtmosphereChoiceCms } from "@/types/cms";

function buildStorageWithWizard(wizard: typeof DEFAULT_WIZARD_CONTENT): CmsSiteStorage {
  const payload = { ...mergeSitePayload(), wizard: normalizeWizard(wizard) };
  return {
    version: 2,
    publishedAt: null,
    draftUpdatedAt: new Date().toISOString(),
    published: mergeSitePayload(),
    draft: payload,
  };
}

const ATMOSPHERE_IDS = ["warm", "neutraal", "premium_architectural"] as const;

for (const atmosphereId of ATMOSPHERE_IDS) {
  test(`atmosphere ${atmosphereId} mediaId survives mergeSitePayload round-trip`, () => {
    const mediaId = `img-test-${atmosphereId}`;
    const wizard = {
      ...DEFAULT_WIZARD_CONTENT,
      atmosphereChoices: DEFAULT_WIZARD_CONTENT.atmosphereChoices.map((choice) =>
        choice.id === atmosphereId ? applyMediaId(choice, mediaId) : choice,
      ),
    };

    const storage = buildStorageWithWizard(wizard);
    const expected = snapshotSiteMediaReferences(storage.draft);
    const reread = normalizeStorage(storage);

    assertMediaReferencesPreserved(
      expected,
      snapshotSiteMediaReferences(reread.draft),
      "normalized-read",
    );
    assert.equal(reread.draft.wizard.atmosphereChoices.find((c) => c.id === atmosphereId)?.mediaId, mediaId);
  });
}

test("premium_architectural keeps media when legacy luxe entry also exists", () => {
  const premiumMediaId = "img-premium-selected";
  const premium = applyMediaId(
    DEFAULT_WIZARD_CONTENT.atmosphereChoices.find((c) => c.id === "premium_architectural")!,
    premiumMediaId,
  );
  const legacyLuxe: WizardAtmosphereChoiceCms = {
    ...premium,
    id: "luxe",
    mediaId: null,
    imageId: undefined,
    title: "Old luxe title",
  };

  const merged = mergeWizardContent({
    atmosphereChoices: [
      ...DEFAULT_WIZARD_CONTENT.atmosphereChoices.filter((c) => c.id !== "premium_architectural"),
      premium,
      legacyLuxe,
    ],
  });

  assert.equal(
    merged.atmosphereChoices.find((c) => c.id === "premium_architectural")?.mediaId,
    premiumMediaId,
  );
  assert.equal(merged.atmosphereChoices.find((c) => c.id === "luxe"), undefined);
});

test("legacy neutral id maps to neutraal with stored mediaId", () => {
  const merged = mergeWizardContent({
    atmosphereChoices: [
      applyMediaId(
        { ...DEFAULT_WIZARD_CONTENT.atmosphereChoices.find((c) => c.id === "neutraal")!, id: "neutral" },
        "img-neutral-legacy",
      ),
    ],
  });

  assert.equal(merged.atmosphereChoices.find((c) => c.id === "neutraal")?.mediaId, "img-neutral-legacy");
});

test("premium_architectural survives normalized-read when legacy luxe is present in stored draft", () => {
  const premiumMediaId = "img-premium-selected";
  const premium = applyMediaId(
    DEFAULT_WIZARD_CONTENT.atmosphereChoices.find((c) => c.id === "premium_architectural")!,
    premiumMediaId,
  );
  const legacyLuxe: WizardAtmosphereChoiceCms = {
    ...premium,
    id: "luxe",
    mediaId: null,
    imageId: undefined,
    title: "Old luxe title",
  };

  const wizard = {
    ...DEFAULT_WIZARD_CONTENT,
    atmosphereChoices: [
      ...DEFAULT_WIZARD_CONTENT.atmosphereChoices.filter((c) => c.id !== "premium_architectural"),
      premium,
      legacyLuxe,
    ],
  };

  const storage = buildStorageWithWizard(wizard);
  const expected = snapshotSiteMediaReferences(storage.draft);
  const reread = normalizeStorage(storage);

  assertMediaReferencesPreserved(
    expected,
    snapshotSiteMediaReferences(reread.draft),
    "normalized-read/luxe-migration",
  );
});
