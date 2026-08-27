import { NextResponse } from "next/server";
import {
  getStorageConfigurationError,
  loadCmsDraft,
  loadCmsSite,
  saveCmsDraft,
  saveCmsDraftPage,
  saveUploadedImage,
  toMediaApiRecord,
} from "@/lib/cms/content-store";
import { verifyInternalToken } from "@/lib/public-wizard/lead-storage";
import type { CmsNavigation, CmsPage, CmsSiteContent } from "@/types/cms";

export const runtime = "nodejs";

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
    await saveCmsDraft(body.site);
    return NextResponse.json({ ok: true });
  }
  if (body.homepage) {
    await saveCmsDraftPage("homepage", body.homepage);
    return NextResponse.json({ ok: true });
  }
  if (body.pageSlug && body.page) {
    await saveCmsDraftPage(body.pageSlug, body.page);
    return NextResponse.json({ ok: true });
  }
  if (body.wizard) {
    try {
      const site = await saveCmsDraft({ wizard: body.wizard });
      return NextResponse.json({ ok: true, site, draftUpdatedAt: site.draftUpdatedAt });
    } catch (error) {
      console.error("cms wizard save error:", error);
      const message = error instanceof Error ? error.message : "Opslaan is niet gelukt.";
      return NextResponse.json({ ok: false, message }, { status: 500 });
    }
  }
  if (body.navigation) {
    await saveCmsDraft({ navigation: body.navigation });
    return NextResponse.json({ ok: true });
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
      url: `/api/cms/images/${record.id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload mislukt.";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
