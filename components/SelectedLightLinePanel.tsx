"use client";

import { useMemo } from "react";
import { useWarehouseStore } from "@/lib/warehouse-store";
import type { SlotType } from "@/types";

function positionChipClass(type: SlotType, interactive: boolean) {
  const base =
    type === "module"
      ? "bg-[var(--ls-yellow)] text-[var(--ls-black)] border-[var(--ls-black)]"
      : "bg-[var(--ls-gray-light)] text-[var(--ls-dark)] border-[var(--ls-gray)]";
  return interactive
    ? `${base} cursor-pointer hover:ring-2 hover:ring-[var(--ls-yellow)]`
    : base;
}

export function SelectedLightLinePanel() {
  const selectedLightLineId = useWarehouseStore((state) => state.selectedLightLineId);
  const drawnLightLines = useWarehouseStore((state) => state.drawnLightLines);
  const lightLinePlan = useWarehouseStore((state) => state.lightLinePlan);
  const removeDrawnLightLine = useWarehouseStore((state) => state.removeDrawnLightLine);
  const toggleLinePosition = useWarehouseStore((state) => state.toggleLinePosition);

  const drawn = drawnLightLines.find((line) => line.id === selectedLightLineId);

  const computed = useMemo(() => {
    if (!lightLinePlan || !selectedLightLineId) return null;
    return lightLinePlan.lines.find((line) => line.id === selectedLightLineId);
  }, [lightLinePlan, selectedLightLineId]);

  if (!drawn || !computed) {
    return null;
  }

  const drawnLength = drawn.drawnEnd - drawn.drawnStart;

  return (
    <div className="mt-4 rounded-lg border border-[var(--ls-gray-light)] bg-[var(--ls-bg)] p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--ls-black)]">
          Geselecteerde lichtlijn LL{computed.index}
        </h3>
        <button
          type="button"
          onClick={() => removeDrawnLightLine(drawn.id)}
          className="shrink-0 rounded-lg bg-[var(--ls-danger)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          Lichtlijn verwijderen
        </button>
      </div>

      <div className="mt-3 overflow-x-auto">
        <p className="mb-1 text-xs font-medium text-[var(--ls-gray)]">Opbouw LL{computed.index}:</p>
        <div className="flex min-w-max items-center gap-1">
          <span className="rounded border border-[var(--ls-black)] bg-[var(--ls-dark)] px-2 py-1 text-xs font-bold text-white">
            ⚡ 230V
          </span>
          {computed.slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              title="Klik om te wisselen tussen LED-module en blindplaat"
              onClick={() => toggleLinePosition(drawn.id, slot.index)}
              className={`rounded border px-2 py-1 text-xs font-bold ${positionChipClass(slot.type, true)}`}
            >
              {slot.type === "module" ? "LED" : "BP"}
            </button>
          ))}
          <span className="rounded border border-[var(--ls-black)] bg-[var(--ls-black)] px-2 py-1 text-xs font-bold text-white">
            ■ eind
          </span>
        </div>
      </div>

      <dl className="mt-3 space-y-1 text-sm">
        <Row label="Richting" value={drawn.direction === "horizontal" ? "Horizontaal" : "Verticaal"} />
        <Row label="Getekende lengte" value={`${drawnLength.toFixed(1)} m`} />
        <Row label="Fysieke lengte" value={`${computed.physicalLength.toFixed(1)} m`} />
        <Row label="LED-modules" value={String(computed.modules)} />
        <Row label="Blindplaten" value={String(computed.blankPlates)} />
        <Row label="Marge" value={`${computed.freeMargin.toFixed(2)} m`} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-[var(--ls-gray)]">{label}</dt>
      <dd className="font-medium text-[var(--ls-black)]">{value}</dd>
    </div>
  );
}
