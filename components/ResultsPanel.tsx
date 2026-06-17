"use client";

import { useMemo } from "react";
import { useWarehouseStore } from "@/lib/warehouse-store";
import { calculateLighting, formatArea, formatNumber } from "@/lib/calculations";

export function ResultsPanel() {
  const length = useWarehouseStore((state) => state.length);
  const width = useWarehouseStore((state) => state.width);
  const height = useWarehouseStore((state) => state.height);
  const lux = useWarehouseStore((state) => state.lux);
  const rectangles = useWarehouseStore((state) => state.rectangles);

  const results = useMemo(
    () => calculateLighting({ length, width, height }, lux, rectangles),
    [length, width, height, lux, rectangles],
  );

  const rows = [
    { label: "Bruto oppervlak", value: formatArea(results.grossArea) },
    { label: "Stellingoppervlak", value: formatArea(results.shelfArea) },
    { label: "Obstructieoppervlak", value: formatArea(results.obstructionArea) },
    { label: "Netto oppervlak", value: formatArea(results.netArea) },
    { label: "Hoogtefactor", value: results.heightFactor.toFixed(2) },
    { label: "Benodigde effectieve lumen", value: `${formatNumber(results.requiredLumens)} lm` },
    {
      label: "Benodigde bruto lumen",
      value: `${formatNumber(Math.round(results.requiredGrossLumens))} lm`,
    },
    { label: "Modules (9000 lm)", value: `${results.moduleCount} stuks` },
  ];

  return (
    <section className="ls-card p-5">
      <h2 className="ls-heading mb-1 text-lg">Indicatieve berekening</h2>
      <p className="mb-4 text-xs text-[var(--ls-navy-muted)]">Energiezuinig · veiligheid &amp; werkcomfort</p>
      <dl className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2"
          >
            <dt className="text-sm text-[var(--ls-gray)]">{row.label}</dt>
            <dd className="text-right text-sm font-semibold text-[var(--ls-black)]">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="ls-accent-panel mt-4 p-4">
        <p className="text-sm font-medium text-[var(--ls-navy)]">Armatuuradvies</p>
        <p className="mt-1 text-sm text-[var(--ls-navy-muted)]">{results.fixtureAdvice}</p>
      </div>
    </section>
  );
}
