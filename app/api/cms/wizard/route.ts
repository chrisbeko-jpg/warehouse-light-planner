import { NextResponse } from "next/server";
import { loadCmsSite } from "@/lib/cms/content-store";
import { readMediaId } from "@/lib/cms/media";
import { getAtmosphereFallback, getRoomFallback } from "@/lib/ledpaneel/fallback-images";
import { resolveMediaUrlWithFallback } from "@/lib/ledpaneel/resolve-fallback-media";
import { normalizeRoomFunctionId } from "@/lib/public-wizard/room-functions";
import type { RoomFunctionId } from "@/types/public-wizard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function mapRoomChoices(site: Awaited<ReturnType<typeof loadCmsSite>>) {
  const seen = new Set<RoomFunctionId>();
  return site.wizard.roomChoices
    .filter((choice) => choice.active)
    .map((choice) => {
      const normalizedId = normalizeRoomFunctionId(choice.id);
      if (!normalizedId) return null;
      return { ...choice, id: normalizedId };
    })
    .filter((choice): choice is NonNullable<typeof choice> => {
      if (!choice) return false;
      if (seen.has(choice.id as RoomFunctionId)) return false;
      seen.add(choice.id as RoomFunctionId);
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((choice) => {
      const mediaId = readMediaId(choice);
      return {
        ...choice,
        imageMediaId: mediaId,
        imageUrl: resolveMediaUrlWithFallback(site.images, choice, getRoomFallback(choice.id), {
          altFallback: choice.title,
          altOverride: choice.altTextOverride ?? choice.imageAlt,
          context: choice.id,
        }),
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
        imageUrl: resolveMediaUrlWithFallback(site.images, choice, getAtmosphereFallback(choice.id), {
          altFallback: choice.title,
          altOverride: choice.altTextOverride ?? choice.imageAlt,
          context: choice.id,
        }),
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
