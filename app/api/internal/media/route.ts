import { NextResponse } from "next/server";
import {
  getStorageConfigurationError,
  loadCmsDraft,
  saveUploadedImage,
  toMediaApiRecord,
} from "@/lib/cms/content-store";
import { verifyInternalToken } from "@/lib/public-wizard/lead-storage";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(request: Request) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storageError = getStorageConfigurationError();
  if (storageError) {
    return NextResponse.json({
      storageReady: false,
      storageMessage: storageError,
      media: [],
    });
  }

  const site = await loadCmsDraft();
  return NextResponse.json({
    storageReady: true,
    storageMessage: null,
    media: Object.values(site.images).map(toMediaApiRecord),
  });
}

export async function POST(request: Request) {
  if (!verifyInternalToken(request)) {
    return jsonError("Unauthorized", 401);
  }

  const storageError = getStorageConfigurationError();
  if (storageError) {
    return jsonError(storageError, 503);
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    const altText = String(form.get("altText") ?? form.get("alt") ?? "").trim();

    if (!(file instanceof File)) {
      return jsonError("Geen bestand geselecteerd.", 400);
    }

    const record = await saveUploadedImage(
      Buffer.from(await file.arrayBuffer()),
      file.name,
      file.type,
      altText || file.name,
      title || undefined,
    );

    return NextResponse.json({
      success: true,
      message: "Afbeelding opgeslagen in mediabibliotheek",
      media: toMediaApiRecord(record),
    });
  } catch (error) {
    console.error("media upload error:", error);
    const message = error instanceof Error ? error.message : "Upload mislukt.";
    return jsonError(message, 400);
  }
}
