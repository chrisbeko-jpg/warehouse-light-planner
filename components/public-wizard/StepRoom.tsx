"use client";

import { ROOM_FUNCTIONS } from "@/lib/public-wizard/room-functions";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardCard, WizardNav } from "@/components/public-wizard/WizardShell";
import type { RoomFunctionId } from "@/types/public-wizard";

export function StepRoom() {
  const roomFunction = usePublicWizardStore((s) => s.roomFunction);
  const ceilingHeightM = usePublicWizardStore((s) => s.ceilingHeightM);
  const targetLux = usePublicWizardStore((s) => s.targetLux);
  const selectRoomFunction = usePublicWizardStore((s) => s.selectRoomFunction);
  const setCeilingHeightM = usePublicWizardStore((s) => s.setCeilingHeightM);
  const setTargetLux = usePublicWizardStore((s) => s.setTargetLux);
  const nextStep = usePublicWizardStore((s) => s.nextStep);

  return (
    <div>
      <h1 className="lp-heading-2 mb-2">Welke ruimte wilt u verlichten?</h1>
      <p className="lp-body mb-6">
        Kies het ruimtetype. De voorgestelde luxwaarde kunt u later aanpassen.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROOM_FUNCTIONS.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => selectRoomFunction(room.id as RoomFunctionId)}
            className={`overflow-hidden rounded-xl border-2 text-left transition ${
              roomFunction === room.id
                ? "border-[var(--lp-green)] ring-2 ring-[var(--lp-green)]"
                : "border-[var(--lp-border)] hover:border-[var(--lp-green)]"
            }`}
          >
            <div
              className={`flex h-24 items-end bg-gradient-to-br p-3 ${room.imageGradient}`}
            >
              <span className="text-sm font-bold text-white drop-shadow">{room.name}</span>
            </div>
            <div className="space-y-1 p-3">
              <p className="text-xs font-semibold text-[var(--lp-green-dark)]">
                {room.suggestedLux} lux
              </p>
              <p className="text-xs text-[var(--lp-text-secondary)]">{room.explanation}</p>
            </div>
          </button>
        ))}
      </div>

      <WizardCard className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Plafondhoogte (m)
          <input
            type="number"
            min={2}
            max={12}
            step={0.1}
            value={ceilingHeightM}
            onChange={(e) => setCeilingHeightM(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          Doel lux (aanpasbaar)
          <input
            type="number"
            min={50}
            max={1000}
            step={10}
            value={targetLux}
            onChange={(e) => setTargetLux(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
          />
        </label>
      </WizardCard>

      <WizardNav
        nextDisabled={!roomFunction}
        onNext={() => {
          if (roomFunction) nextStep();
        }}
      />
    </div>
  );
}
