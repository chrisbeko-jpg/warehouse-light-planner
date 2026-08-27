import { NextResponse } from "next/server";
import { loadCmsSite } from "@/lib/cms/content-store";
import { readMediaId, resolveMedia } from "@/lib/cms/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function mapRoomChoices(site: Awaited<ReturnType<typeof loadCmsSite>>) {
  return site.wizard.roomChoices
    .filter((choice) => choice.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((choice) => {
      const mediaId = readMediaId(choice);
      return {
        ...choice,
        imageMediaId: mediaId,
        imageUrl: resolveMedia(site.images, mediaId, {
          altFallback: choice.title,
          altOverride: choice.altTextOverride ?? choice.imageAlt,
          context: choice.id,
        })?.url ?? null,
        imageAlt: choice.altTextOverride ?? choice.imageAlt ?? choice.title,
      };
    });
}

function mapAtmosphereChoices(site: Awaited<ReturnType<typeof loadCmsSite>>) {
  return site.wizard.atmosphereChoices
    .filter((choice) => choice.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((choice) => {
      const mediaId = readMediaId(choice);
      return {
        ...choice,
        imageMediaId: mediaId,
        imageUrl: resolveMedia(site.images, mediaId, {
          altFallback: choice.title,
          altOverride: choice.altTextOverride ?? choice.imageAlt,
          context: choice.id,
        })?.url ?? null,
        imageAlt: choice.altTextOverride ?? choice.imageAlt ?? choice.title,
      };
    });
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
