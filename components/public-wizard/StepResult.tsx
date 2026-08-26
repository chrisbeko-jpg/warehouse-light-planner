"use client";

import { useMemo } from "react";
import { CALCULATION_DISCLAIMER, calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import {
  calculateIndicativePrice,
  countProducts,
  formatPriceRange,
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

  const result = useMemo(() => {
    if (roomVertices.length < 3 || !pixelsPerMeter) return null;
    const areaM2 = createRoomPolygon(roomVertices, pixelsPerMeter).areaM2;
    return calculateIndicativeResult(areaM2, targetLux, ceilingHeightM, fixtures);
  }, [roomVertices, pixelsPerMeter, targetLux, ceilingHeightM, fixtures]);

  if (!result) {
    return <p>Geen resultaat beschikbaar. Ga terug en genereer een lichtplan.</p>;
  }

  const price = calculateIndicativePrice(fixtures);
  const products = countProducts(fixtures);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Indicatief resultaat</h1>
      <p className="mb-6 text-[var(--ls-gray)]">
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
          <ul className="space-y-1 text-sm text-[var(--ls-gray)]">
            {Object.entries(products).map(([name, qty]) => (
              <li key={name}>
                {name}: {qty} st
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-[var(--ls-dark)] p-4 text-white">
          <p className="text-sm text-[var(--ls-gray-light)]">Indicatieve projectprijs</p>
          <p className="text-2xl font-bold text-[var(--ls-yellow)]">{formatPriceRange(price)}</p>
          <p className="mt-2 text-xs text-[var(--ls-gray-light)]">
            De definitieve prijs ontvangt u na controle van het lichtplan.
          </p>
        </div>

        <p className="text-xs text-[var(--ls-gray)]">{CALCULATION_DISCLAIMER}</p>
      </WizardCard>

      <WizardNav nextLabel="Aanvragen" onNext={() => nextStep()} />
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
    <div className="rounded-lg border border-[var(--ls-gray-light)] p-3">
      <p className="text-xs text-[var(--ls-gray)]">{label}</p>
      <p
        className={`text-sm font-semibold ${
          highlight === true
            ? "text-[var(--ls-success)]"
            : highlight === false
              ? "text-[var(--ls-warn)]"
              : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
