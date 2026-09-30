"use client";

import { useEffect, useMemo, useState } from "react";
import { getRoomFunction, ROOM_FUNCTIONS } from "@/lib/public-wizard/room-functions";
import { getRoomFallback } from "@/lib/ledpaneel/fallback-images";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardNav } from "@/components/public-wizard/WizardShell";
import type { RoomFunctionId } from "@/types/public-wizard";

interface WizardRoomChoiceView {
  id: string;
  title: string;
  suggestedLux: number;
  imageUrl: string | null;
  imageAlt: string;
}

export function StepRoom() {
  const roomFunction = usePublicWizardStore((s) => s.roomFunction);
  const selectRoomFunction = usePublicWizardStore((s) => s.selectRoomFunction);
  const nextStep = usePublicWizardStore((s) => s.nextStep);
  const [cmsChoices, setCmsChoices] = useState<WizardRoomChoiceView[]>([]);

  useEffect(() => {
    void fetch("/api/cms/wizard", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { roomChoices?: WizardRoomChoiceView[] } | null) => {
        if (data?.roomChoices?.length) setCmsChoices(data.roomChoices);
      })
      .catch(() => undefined);
  }, []);

  const roomChoices = useMemo(() => {
    if (cmsChoices.length === 0) {
      return ROOM_FUNCTIONS.map((room) => ({
        id: room.id,
        title: room.name,
        suggestedLux: room.suggestedLux,
        imageUrl: getRoomFallback(room.id),
        imageAlt: room.name,
      }));
    }
    return cmsChoices;
  }, [cmsChoices]);

  return (
    <div>
      <h1 className="lp-heading-2 mb-2">Welke ruimte wilt u verlichten?</h1>
      <p className="lp-body mb-5">Kies het luxniveau dat past bij uw ruimte.</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {roomChoices.map((room) => {
          const fallback = getRoomFunction(room.id as RoomFunctionId);
          const imageSrc = room.imageUrl ?? getRoomFallback(room.id) ?? undefined;
          return (
            <button
              key={room.id}
              type="button"
              data-testid={`room-option-${room.id}`}
              onClick={() => selectRoomFunction(room.id as RoomFunctionId)}
              aria-pressed={roomFunction === room.id}
              className={`min-h-[44px] overflow-hidden rounded-xl border-2 text-left transition ${
                roomFunction === room.id
                  ? "border-[var(--lp-green)] ring-2 ring-[var(--lp-green)]"
                  : "border-[var(--lp-border)] hover:border-[var(--lp-green)]"
              }`}
            >
              <div
                className={`relative h-[120px] w-full sm:h-[132px] ${fallback.imageGradient} bg-gradient-to-br`}
              >
                {imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageSrc}
                    alt={room.imageAlt || room.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[var(--lp-bg-secondary)]" aria-hidden />
                )}
              </div>
              <div className="space-y-0.5 p-3">
                <p className="text-sm font-bold leading-tight">{room.title}</p>
                <p className="text-xs font-semibold text-[var(--lp-green-dark)]">{room.suggestedLux} lux</p>
              </div>
            </button>
          );
        })}
      </div>

      <WizardNav
        nextDisabled={!roomFunction}
        onNext={() => {
          if (roomFunction) nextStep();
        }}
      />
    </div>
  );
}
