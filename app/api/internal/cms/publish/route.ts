import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { publishCmsDraft } from "@/lib/cms/content-store";
import { verifyInternalToken } from "@/lib/public-wizard/lead-storage";

export const runtime = "nodejs";

function revalidatePublicCmsRoutes() {
  revalidatePath("/lichtadvies");
  revalidatePath("/api/cms/wizard");
  revalidatePath("/home");
  revalidatePath("/kantoorverlichting");
}

export async function POST(request: Request) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const site = await publishCmsDraft();
    revalidatePublicCmsRoutes();
    return NextResponse.json({ ok: true, publishedAt: site.publishedAt, site });
  } catch (error) {
    console.error("cms publish error:", error);
    const message = error instanceof Error ? error.message : "Publiceren is niet gelukt.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
