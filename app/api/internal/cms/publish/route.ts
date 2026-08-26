import { NextResponse } from "next/server";
import { publishCmsDraft } from "@/lib/cms/content-store";
import { verifyInternalToken } from "@/lib/public-wizard/lead-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const site = await publishCmsDraft();
  return NextResponse.json({ ok: true, publishedAt: site.publishedAt });
}
