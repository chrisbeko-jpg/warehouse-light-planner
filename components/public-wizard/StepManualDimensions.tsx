"use client";

import { useMemo, useState } from "react";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardCard, WizardNav } from "@/components/public-wizard/WizardShell";
import {
  DIMENSION_LIMITS,
  formatMetersNl,
  parseDimensionMeters,
} from "@/lib/public-wizard/viewport";

function parseField(value: string, max: number): number | null {
  return parseDimensionMeters(value, { max, min: DIMENSION_LIMITS.minM });
}

export function StepManualDimensions() {
  const manualDimensions = usePublicWizardStore((s) => s.manualDimensions);
  const applyManualDimensions = usePublicWizardStore((s) => s.applyManualDimensions);
  const lightingPlanGenerated = usePublicWizardStore((s) => s.lightingPlanGenerated);
  const setStep = usePublicWizardStore((s) => s.setStep);

  const [lengthInput, setLengthInput] = useState(
    manualDimensions ? formatMetersNl(manualDimensions.lengthM) : "8,00",
  );
  const [widthInput, setWidthInput] = useState(
    manualDimensions ? formatMetersNl(manualDimensions.widthM) : "5,00",
  );
  const [heightInput, setHeightInput] = useState(
    manualDimensions ? formatMetersNl(manualDimensions.ceilingHeightM) : "2,70",
  );
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    const lengthM = parseField(lengthInput, DIMENSION_LIMITS.maxLengthM);
    const widthM = parseField(widthInput, DIMENSION_LIMITS.maxWidthM);
    const ceilingHeightM = parseField(heightInput, DIMENSION_LIMITS.maxCeilingM);
    const areaM2 = lengthM && widthM ? lengthM * widthM : null;
    return { lengthM, widthM, ceilingHeightM, areaM2 };
  }, [lengthInput, widthInput, heightInput]);

  const submit = () => {
    const { lengthM, widthM, ceilingHeightM } = parsed;
    if (!lengthM || !widthM || !ceilingHeightM) {
      setError("Vul geldige afmetingen in (lengte, breedte en plafondhoogte).");
      return;
    }

    const needsConfirm =
      lightingPlanGenerated &&
      manualDimensions &&
      (manualDimensions.lengthM !== lengthM ||
        manualDimensions.widthM !== widthM ||
        manualDimensions.ceilingHeightM !== ceilingHeightM);

    if (
      needsConfirm &&
      !window.confirm(
        "U wijzigt de afmetingen. Het bestaande lichtplan wordt opnieuw berekend en armaturen worden gereset. Doorgaan?",
      )
    ) {
      return;
    }

    const ok = applyManualDimensions({ lengthM, widthM, ceilingHeightM });
    if (!ok) {
      setError("Het lichtplan kon niet worden gemaakt. Controleer de afmetingen.");
      return;
    }
    setError(null);
    setStep("editor");
  };

  return (
    <div>
      <h1 className="lp-heading-2 mb-2">Wat zijn de afmetingen van de ruimte?</h1>
      <p className="lp-body mb-6">Vul lengte, breedte en plafondhoogte in meters in.</p>

      <WizardCard className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          Lengte
          <input
            inputMode="decimal"
            data-testid="manual-length-input"
            value={lengthInput}
            onChange={(event) => {
              setLengthInput(event.target.value);
              setError(null);
            }}
            className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
            placeholder="8,00"
          />
          <span className="mt-1 block text-xs text-[var(--lp-text-secondary)]">meter</span>
        </label>
        <label className="block text-sm font-medium">
          Breedte
          <input
            inputMode="decimal"
            data-testid="manual-width-input"
            value={widthInput}
            onChange={(event) => {
              setWidthInput(event.target.value);
              setError(null);
            }}
            className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
            placeholder="5,00"
          />
          <span className="mt-1 block text-xs text-[var(--lp-text-secondary)]">meter</span>
        </label>
        <label className="block text-sm font-medium">
          Plafondhoogte
          <input
            inputMode="decimal"
            data-testid="manual-height-input"
            value={heightInput}
            onChange={(event) => {
              setHeightInput(event.target.value);
              setError(null);
            }}
            className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
            placeholder="2,70"
          />
          <span className="mt-1 block text-xs text-[var(--lp-text-secondary)]">meter</span>
        </label>
      </WizardCard>

      <p className="mt-4 text-sm font-semibold text-[var(--lp-green-dark)]" data-testid="manual-area-label">
        Oppervlakte: {parsed.areaM2 ? `${formatMetersNl(parsed.areaM2, 1)} m²` : "—"}
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <WizardNav
        nextLabel="Maak mijn lichtplan"
        nextDisabled={!parsed.lengthM || !parsed.widthM || !parsed.ceilingHeightM}
        onNext={submit}
      />
    </div>
  );
}
