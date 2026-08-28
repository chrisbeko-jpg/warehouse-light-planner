import assert from "node:assert/strict";
import test from "node:test";
import { KANTOORVERLICHTING_SEED } from "@/lib/cms/seeds/kantoorverlichting";
import { mergeSitePayload, normalizeStorage } from "@/lib/cms/merge";
import { normalizePage } from "@/lib/cms/normalize-media";
import { applyMediaId, readMediaId } from "@/lib/cms/media";
import { snapshotPageMediaReferences } from "@/lib/cms/media-reference-audit";
import type { CmsSiteStorage } from "@/types/cms";

function heroMediaId(page: { blocks: { id: string; type: string }[] }) {
  const hero = page.blocks.find((block) => block.id === "hero-kantoor");
  return hero && "mediaId" in hero ? readMediaId(hero as { mediaId?: string | null; imageId?: string | null }) : null;
}

test("snapshotPageMediaReferences misses hero-kantoor mediaId", () => {
  const page = normalizePage({
    ...KANTOORVERLICHTING_SEED,
    blocks: KANTOORVERLICHTING_SEED.blocks.map((block) =>
      block.id === "hero-kantoor" && block.type === "hero"
        ? { ...block, ...applyMediaId(block, "img-kantoor-hero") }
        : block,
    ),
  });

  assert.equal(heroMediaId(page), "img-kantoor-hero");
  assert.equal(snapshotPageMediaReferences(page).homepageHero, null);
});

test("kantoorverlichting hero media survives mergeSitePayload round-trip", () => {
  const page = normalizePage({
    ...KANTOORVERLICHTING_SEED,
    blocks: KANTOORVERLICHTING_SEED.blocks.map((block) =>
      block.id === "hero-kantoor" && block.type === "hero"
        ? { ...block, ...applyMediaId(block, "img-kantoor-hero") }
        : block,
    ),
  });

  const once = mergeSitePayload({ pages: { kantoorverlichting: page } });
  assert.equal(heroMediaId(once.pages.kantoorverlichting!), "img-kantoor-hero");

  const storage: CmsSiteStorage = {
    version: 2,
    publishedAt: null,
    draftUpdatedAt: new Date().toISOString(),
    published: mergeSitePayload(),
    draft: once,
  };
  const twice = normalizeStorage(storage).draft;
  assert.equal(heroMediaId(twice.pages.kantoorverlichting!), "img-kantoor-hero");
});

test("saveCmsDraftPage persists kantoorverlichting hero image", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "cms-kantoor-save-"));
  process.env.DATA_DIR = dir;

  const { saveCmsDraftPage, loadCmsDraft } = await import("./content-store");
  const { snapshotAllPageBlockMedia } = await import("./media-reference-audit");
  const page = normalizePage({
    ...KANTOORVERLICHTING_SEED,
    blocks: KANTOORVERLICHTING_SEED.blocks.map((block) =>
      block.id === "hero-kantoor" && block.type === "hero"
        ? { ...block, ...applyMediaId(block, "img-kantoor-hero") }
        : block.id === "lichtkleur" && block.type === "text-image"
          ? { ...block, ...applyMediaId(block, "img-lichtkleur") }
          : block,
    ),
  });

  const result = await saveCmsDraftPage("kantoorverlichting", page);
  assert.equal(result.site.pages.kantoorverlichting?.blocks.find((b) => b.id === "hero-kantoor")?.type, "hero");
  const apiHero = result.site.pages.kantoorverlichting?.blocks.find((block) => block.id === "hero-kantoor");
  if (apiHero?.type === "hero") {
    assert.equal(readMediaId(apiHero), "img-kantoor-hero");
  }
  assert.equal(
    snapshotAllPageBlockMedia(result.site.pages.kantoorverlichting!)["hero-kantoor"],
    "img-kantoor-hero",
  );

  const reloaded = await loadCmsDraft();
  const saved = reloaded.pages.kantoorverlichting?.blocks.find((block) => block.id === "lichtkleur");
  assert.equal(saved?.type, "text-image");
  if (saved?.type === "text-image") {
    assert.equal(readMediaId(saved), "img-lichtkleur");
  }

  rmSync(dir, { recursive: true, force: true });
});
