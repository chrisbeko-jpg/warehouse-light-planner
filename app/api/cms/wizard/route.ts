import { NextResponse } from "next/server";
import { imagePublicUrl, loadCmsSite } from "@/lib/cms/content-store";

export const runtime = "nodejs";

export async function GET() {
  const site = await loadCmsSite();
  const wizard = site.wizard;

  return NextResponse.json({
    roomChoices: wizard.roomChoices
      .filter((choice) => choice.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((choice) => ({
        ...choice,
        imageUrl: choice.imageId ? imagePublicUrl(choice.imageId) : null,
      })),
    atmosphereChoices: wizard.atmosphereChoices
      .filter((choice) => choice.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((choice) => ({
        ...choice,
        imageUrl: choice.imageId ? imagePublicUrl(choice.imageId) : null,
      })),
  });
}
