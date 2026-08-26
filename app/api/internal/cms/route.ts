import { NextResponse } from "next/server";
import {
  loadCmsDraft,
  loadCmsSite,
  saveCmsDraft,
  saveCmsDraftPage,
  saveUploadedImage,
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
    await saveCmsDraft({ wizard: body.wizard });
    return NextResponse.json({ ok: true });
  }
  if (body.navigation) {
    await saveCmsDraft({ navigation: body.navigation });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}

function isSafeSvg(buffer: Buffer): boolean {
  const text = buffer.toString("utf8").toLowerCase();
  return !text.includes("<script") && !text.includes("onload=") && !text.includes("onclick=");
}

export async function POST(request: Request) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  const alt = String(form.get("alt") ?? "");
  const title = String(form.get("title") ?? "") || undefined;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.type === "image/svg+xml" && !isSafeSvg(buffer)) {
    return NextResponse.json({ error: "SVG niet toegestaan (onveilige inhoud)" }, { status: 400 });
  }
  const record = await saveUploadedImage(buffer, file.name, file.type, alt, title);
  return NextResponse.json({ image: record, url: `/api/cms/images/${record.id}` });
}
