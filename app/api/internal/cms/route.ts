import { NextResponse } from "next/server";
import {
  getStorageConfigurationError,
  loadCmsDraft,
  loadCmsSite,
  MediaPersistenceError,
  saveCmsDraft,
  saveCmsDraftPage,
  saveUploadedImage,
  toMediaApiRecord,
  type CmsSaveResult,
} from "@/lib/cms/content-store";
import { verifyInternalToken } from "@/lib/public-wizard/lead-storage";
import type { CmsNavigation, CmsPage, CmsSiteContent } from "@/types/cms";

export const runtime = "nodejs";

async function saveDraftResponse(action: () => Promise<CmsSaveResult>) {
  try {
    const result = await action();
    return NextResponse.json({
      ok: true,
      site: result.site,
      draftUpdatedAt: result.site.draftUpdatedAt,
      debugMediaReferences: result.debugMediaReferences,
      versionPath: result.versionPath,
    });
  } catch (error) {
    console.error("cms save error:", error);
    if (error instanceof MediaPersistenceError) {
      return NextResponse.json(
        { ok: false, message: error.message, lostReferences: error.lostReferences },
        { status: 422 },
      );
    }
    const message = error instanceof Error ? error.message : "Opslaan is niet gelukt.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const draft = new URL(request.url).searchParams.get("draft") === "1";
  const site = draft ? await loadCmsDraft() : await loadCmsSite();
  return NextResponse.json({ site });
}

export async function PUT(request: Request) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as {
    site?: CmsSiteContent;
    homepage?: CmsPage;
    pageSlug?: string;
    page?: CmsPage;
    wizard?: CmsSiteContent["wizard"];
    navigation?: CmsNavigation;
  };

  if (body.site) {
    return saveDraftResponse(async () => {
      const payload = body.site!;
      return saveCmsDraft({
        homepage: payload.homepage,
        pages: payload.pages,
        wizard: payload.wizard,
        navigation: payload.navigation,
        images: payload.images,
      });
    });
  }
  if (body.homepage) {
    return saveDraftResponse(() => saveCmsDraftPage("homepage", body.homepage!));
  }
  if (body.pageSlug && body.page) {
    return saveDraftResponse(() => saveCmsDraftPage(body.pageSlug!, body.page!));
  }
  if (body.wizard) {
    return saveDraftResponse(() => saveCmsDraft({ wizard: body.wizard }));
  }
  if (body.navigation) {
    return saveDraftResponse(() => saveCmsDraft({ navigation: body.navigation }));
  }
  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}

export async function POST(request: Request) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const storageError = getStorageConfigurationError();
  if (storageError) {
    return NextResponse.json({ success: false, message: storageError }, { status: 503 });
  }
  const form = await request.formData();
  const file = form.get("file");
  const alt = String(form.get("alt") ?? "");
  const title = String(form.get("title") ?? "") || undefined;
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, message: "Geen bestand geselecteerd." }, { status: 400 });
  }
  try {
    const record = await saveUploadedImage(
      Buffer.from(await file.arrayBuffer()),
      file.name,
      file.type,
      alt,
      title,
    );
    return NextResponse.json({
      success: true,
      message: "Afbeelding opgeslagen in mediabibliotheek",
      image: record,
      media: toMediaApiRecord(record),
      url: record.url?.startsWith("http") ? record.url : `/api/cms/images/${record.id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload mislukt.";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
