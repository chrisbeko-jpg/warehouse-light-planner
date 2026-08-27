import { NextResponse } from "next/server";
import { revertCmsDraft } from "@/lib/cms/content-store";
import { verifyInternalToken } from "@/lib/public-wizard/lead-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await revertCmsDraft();
  return NextResponse.json({ ok: true, draftUpdatedAt: result.site.draftUpdatedAt });
}
