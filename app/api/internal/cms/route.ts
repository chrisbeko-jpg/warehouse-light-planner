import { NextResponse } from "next/server";
import { loadCmsSite, saveCmsSite, saveUploadedImage } from "@/lib/cms/content-store";
import { verifyInternalToken } from "@/lib/public-wizard/lead-storage";
import type { CmsPage, CmsSiteContent } from "@/types/cms";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const site = await loadCmsSite();
  return NextResponse.json({ site });
}

export async function PUT(request: Request) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as { site?: CmsSiteContent; homepage?: CmsPage; pageSlug?: string; page?: CmsPage };
  const site = await loadCmsSite();

  if (body.site) {
    await saveCmsSite(body.site);
    return NextResponse.json({ ok: true });
  }
  if (body.homepage) {
    site.homepage = body.homepage;
    await saveCmsSite(site);
    return NextResponse.json({ ok: true });
  }
  if (body.pageSlug && body.page) {
    site.pages[body.pageSlug.replace(/^\//, "")] = body.page;
    await saveCmsSite(site);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}

export async function POST(request: Request) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  const alt = String(form.get("alt") ?? "");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const record = await saveUploadedImage(buffer, file.name, file.type, alt);
  return NextResponse.json({ image: record, url: `/api/cms/images/${record.id}` });
}
