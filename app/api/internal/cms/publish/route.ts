import { NextResponse } from "next/server";
import { MediaPersistenceError, publishCmsDraft } from "@/lib/cms/content-store";
import { findMissingReferencedImages } from "@/lib/cms/sync-referenced-images";
import { verifyInternalToken } from "@/lib/public-wizard/lead-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await publishCmsDraft();
    const site = result.site;
    const missingImages = findMissingReferencedImages(site);
    if (missingImages.length > 0) {
      console.warn("Published CMS references missing images:", missingImages.join(", "));
    }
    return NextResponse.json({
      ok: true,
      publishedAt: site.publishedAt,
      site,
      missingImages,
      debugMediaReferences: result.debugMediaReferences,
      versionPath: result.versionPath,
    });
  } catch (error) {
    console.error("cms publish error:", error);
    if (error instanceof MediaPersistenceError) {
      return NextResponse.json(
        { ok: false, message: error.message, lostReferences: error.lostReferences },
        { status: 422 },
      );
    }
    const message = error instanceof Error ? error.message : "Publiceren is niet gelukt.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
