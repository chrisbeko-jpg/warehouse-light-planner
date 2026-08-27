import { NextResponse } from "next/server";
import { loadCmsSite } from "@/lib/cms/content-store";
import { resolveCmsImageAlt, resolveCmsImageUrl } from "@/lib/cms/resolve-image-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function mapRoomChoices(site: Awaited<ReturnType<typeof loadCmsSite>>) {
  return site.wizard.roomChoices
    .filter((choice) => choice.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((choice) => ({
      ...choice,
      imageMediaId: choice.imageId ?? null,
      imageUrl: resolveCmsImageUrl(site.images, choice.imageId, choice.id),
      imageAlt: resolveCmsImageAlt(site.images, choice.imageId, choice.imageAlt || choice.title),
    }));
}

function mapAtmosphereChoices(site: Awaited<ReturnType<typeof loadCmsSite>>) {
  return site.wizard.atmosphereChoices
    .filter((choice) => choice.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((choice) => ({
      ...choice,
      imageMediaId: choice.imageId ?? null,
      imageUrl: resolveCmsImageUrl(site.images, choice.imageId, choice.id),
      imageAlt: resolveCmsImageAlt(site.images, choice.imageId, choice.imageAlt || choice.title),
    }));
}

export async function GET() {
  const site = await loadCmsSite();

  return NextResponse.json(
    {
      roomChoices: mapRoomChoices(site),
      atmosphereChoices: mapAtmosphereChoices(site),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
