"use client";

import { useMemo } from "react";
import { CALCULATION_DISCLAIMER, calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import {
  calculateMaterialPrice,
  formatMaterialPrice,
  MATERIAL_PRICE_DISCLAIMER,
  MATERIAL_PRICE_FOOTNOTE,
} from "@/lib/public-wizard/pricing";
import { createRoomPolygon } from "@/lib/public-wizard/placement";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardCard, WizardNav } from "@/components/public-wizard/WizardShell";

export function StepResult() {
  const roomVertices = usePublicWizardStore((s) => s.roomVertices);
  const pixelsPerMeter = usePublicWizardStore((s) => s.pixelsPerMeter);
  const targetLux = usePublicWizardStore((s) => s.targetLux);
  const ceilingHeightM = usePublicWizardStore((s) => s.ceilingHeightM);
  const fixtures = usePublicWizardStore((s) => s.fixtures);
  const nextStep = usePublicWizardStore((s) => s.nextStep);
  const goToEditor = usePublicWizardStore((s) => s.goToEditor);

  const result = useMemo(() => {
    if (roomVertices.length < 3 || !pixelsPerMeter) return null;
    const areaM2 = createRoomPolygon(roomVertices, pixelsPerMeter).areaM2;
    return calculateIndicativeResult(areaM2, targetLux, ceilingHeightM, fixtures);
  }, [roomVertices, pixelsPerMeter, targetLux, ceilingHeightM, fixtures]);

  if (!result) {
    return <p>Geen resultaat beschikbaar. Ga terug en genereer een lichtplan.</p>;
  }

  const price = calculateMaterialPrice(fixtures);

  return (
    <div>
      <h1 className="lp-heading-2 mb-2">Indicatief resultaat</h1>
      <p className="lp-body mb-6">
        Onderstaande waarden zijn gebaseerd op daadwerkelijk geplaatste armaturen.
      </p>

      <WizardCard className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Oppervlakte" value={`${result.areaM2.toFixed(2)} m²`} />
          <Stat label="Doel lux" value={`${result.targetLux} lux`} />
          <Stat label="Armaturen" value={`${result.fixtureCount}`} />
          <Stat label="Totaal vermogen" value={`${result.totalWattage} W`} />
          <Stat label="Indicatief berekend" value={`${result.indicativeAverageLux} lux`} />
          <Stat
            label="Resultaat"
            value={
              result.meetsTarget
                ? "Voldoet aan de ingestelde doelwaarde"
                : "Onder de ingestelde doelwaarde"
            }
            highlight={result.meetsTarget}
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Producten</h3>
          <ul className="space-y-1 text-sm text-[var(--lp-text-secondary)]">
            {price.lines.map((line) => (
              <li key={line.productId}>
                {line.quantity} × {line.name} à €{line.unitEuro.toFixed(2)} = €{line.subtotalEuro.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-[var(--lp-editor-bg)] p-4 text-white">
          <p className="text-sm text-white/70">Indicatieve materiaalprijs</p>
          <p className="text-2xl font-bold text-[var(--lp-green)]">{formatMaterialPrice(price)}</p>
          <p className="mt-2 text-xs text-white/80">{MATERIAL_PRICE_DISCLAIMER}</p>
          <p className="mt-1 text-xs text-white/70">{MATERIAL_PRICE_FOOTNOTE}</p>
        </div>

        <p className="text-xs text-[var(--lp-text-secondary)]">{CALCULATION_DISCLAIMER}</p>
      </WizardCard>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          data-testid="edit-light-plan-button"
          className="lp-btn-secondary px-8 py-3"
          onClick={() => goToEditor()}
        >
          Lichtplan aanpassen
        </button>
        <WizardNav nextLabel="Aanvragen" onNext={() => nextStep()} showPrev={false} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--lp-border)] p-3">
      <p className="text-xs text-[var(--lp-text-secondary)]">{label}</p>
      <p
        className={`text-sm font-semibold ${
          highlight === true
            ? "text-[var(--lp-green)]"
            : highlight === false
              ? "text-[var(--lp-warn)]"
              : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
