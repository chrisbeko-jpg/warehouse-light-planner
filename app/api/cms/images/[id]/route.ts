import { NextResponse } from "next/server";
import { getImageRecord, readImageFile } from "@/lib/cms/content-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const record = await getImageRecord(id);
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (record.url?.startsWith("http")) {
    return NextResponse.redirect(record.url, 302);
  }

  const buffer = await readImageFile(record);
  if (!buffer) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": record.mimeType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
