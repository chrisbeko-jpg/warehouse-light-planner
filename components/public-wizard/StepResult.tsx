"use client";

import { useMemo } from "react";
import { CALCULATION_DISCLAIMER, calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import {
  calculateMaterialPrice,
  formatMaterialPrice,
  MATERIAL_PRICE_DISCLAIMER,
  MATERIAL_PRICE_FOOTNOTE,
} from "@/lib/public-wizard/pricing";
import { getAtmosphere } from "@/lib/public-wizard/atmospheres";
import { getCeilingType } from "@/lib/public-wizard/ceiling-types";
import { getRoomFunction } from "@/lib/public-wizard/room-functions";
import { createRoomPolygon } from "@/lib/public-wizard/placement";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { formatMetersNl } from "@/lib/public-wizard/viewport";
import { WizardCard, WizardNav } from "@/components/public-wizard/WizardShell";
import { WIZARD_COPY } from "@/lib/public-wizard/wizard-copy";
import { getPublicProduct } from "@/lib/public-wizard/products";

export function StepResult() {
  const roomFunction = usePublicWizardStore((s) => s.roomFunction);
  const atmosphere = usePublicWizardStore((s) => s.atmosphere);
  const ceilingType = usePublicWizardStore((s) => s.ceilingType);
  const manualDimensions = usePublicWizardStore((s) => s.manualDimensions);
  const roomVertices = usePublicWizardStore((s) => s.roomVertices);
  const pixelsPerMeter = usePublicWizardStore((s) => s.pixelsPerMeter);
  const targetLux = usePublicWizardStore((s) => s.targetLux);
  const ceilingHeightM = usePublicWizardStore((s) => s.ceilingHeightM);
  const fixtures = usePublicWizardStore((s) => s.fixtures);
  const requiredFixtureCount = usePublicWizardStore((s) => s.requiredFixtureCount);
  const alternativeMixedFixtures = usePublicWizardStore((s) => s.alternativeMixedFixtures);
  const lightingPlanVariant = usePublicWizardStore((s) => s.lightingPlanVariant);
  const setLightingPlanVariant = usePublicWizardStore((s) => s.setLightingPlanVariant);
  const nextStep = usePublicWizardStore((s) => s.nextStep);
  const goToEditor = usePublicWizardStore((s) => s.goToEditor);
  const goToEditor3D = usePublicWizardStore((s) => s.goToEditor3D);

  const result = useMemo(() => {
    if (roomVertices.length < 3 || !pixelsPerMeter) return null;
    const areaM2 = createRoomPolygon(roomVertices, pixelsPerMeter).areaM2;
    return calculateIndicativeResult(
      areaM2,
      targetLux,
      ceilingHeightM,
      fixtures,
      requiredFixtureCount ?? undefined,
    );
  }, [roomVertices, pixelsPerMeter, targetLux, ceilingHeightM, fixtures, requiredFixtureCount]);

  const alternativeResult = useMemo(() => {
    if (!alternativeMixedFixtures?.length || roomVertices.length < 3 || !pixelsPerMeter) return null;
    const areaM2 = createRoomPolygon(roomVertices, pixelsPerMeter).areaM2;
    return calculateIndicativeResult(
      areaM2,
      targetLux,
      ceilingHeightM,
      alternativeMixedFixtures,
      requiredFixtureCount ?? undefined,
    );
  }, [
    alternativeMixedFixtures,
    roomVertices,
    pixelsPerMeter,
    targetLux,
    ceilingHeightM,
    requiredFixtureCount,
  ]);

  const alternativePrice = useMemo(
    () => (alternativeMixedFixtures?.length ? calculateMaterialPrice(alternativeMixedFixtures) : null),
    [alternativeMixedFixtures],
  );

  if (!result) {
    return <p>Geen resultaat beschikbaar. Ga terug en genereer een lichtplan.</p>;
  }

  const price = calculateMaterialPrice(fixtures);
  const roomMeta = roomFunction ? getRoomFunction(roomFunction) : null;
  const atmosphereMeta = atmosphere ? getAtmosphere(atmosphere) : null;
  const dimensionLabel =
    manualDimensions != null
      ? `${formatMetersNl(manualDimensions.lengthM)} × ${formatMetersNl(manualDimensions.widthM)} m`
      : null;

  const luxShortfall = !result.meetsTarget;

  return (
    <div>
      <h1 className="lp-heading-2 mb-2">{WIZARD_COPY.result.title}</h1>
      <p className="lp-body mb-6">{WIZARD_COPY.result.intro}</p>

      <WizardCard className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {roomMeta && <Stat label="Ruimtefunctie" value={roomMeta.name} />}
          {ceilingType && <Stat label="Plafondtype" value={getCeilingType(ceilingType).title} />}
          {dimensionLabel && <Stat label="Afmetingen" value={dimensionLabel} />}
          <Stat label="Oppervlakte" value={`${formatMetersNl(result.areaM2, 1)} m²`} />
          <Stat label="Plafondhoogte" value={`${formatMetersNl(ceilingHeightM)} m`} />
          <Stat label="Gewenst luxniveau" value={`${result.targetLux} lux`} />
          <Stat label="Aantal armaturen" value={`${result.fixtureCount}`} />
          {atmosphereMeta && (
            <>
              <Stat label="Lichtkleur" value={`${atmosphereMeta.title} (${atmosphereMeta.cctLabel})`} />
              {fixtures[0] && (
                <Stat label="Geselecteerd armatuur" value={getPublicProduct(fixtures[0].productId).name} />
              )}
            </>
          )}
          <Stat label="Indicatieve gemiddelde lux" value={`${result.indicativeAverageLux} lux`} />
          {fixtures[0] && (
            <Stat
              label="Bruto adviesprijs per armatuur"
              value={`€ ${getPublicProduct(fixtures[0].productId).unitPriceEuro.toFixed(2)}`}
            />
          )}
          {luxShortfall && (
            <p className="col-span-full text-sm text-[var(--lp-warn)]" data-testid="lux-shortfall">
              De gekozen nette indeling haalt het luxdoel indicatief niet: {result.indicativeAverageLux} lux
              bij een doel van {result.targetLux} lux. Dit is geen formele EN 12464-1-validatie.
            </p>
          )}
          {alternativeMixedFixtures && alternativeResult && alternativePrice && (
            <div className="col-span-full rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface-muted)] p-4 text-sm">
              <p className="mb-3 font-semibold">Alternatief lichtplan: LED-panelen + downlights</p>
              <p className="mb-3 text-[var(--lp-text-secondary)]">
                Optionele aanvulling met downlights op vrije plafondmodules (niet automatisch actief).
                Standaard blijft de nette LED-paneelverdeling.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    lightingPlanVariant === "panels"
                      ? "bg-[var(--lp-primary)] text-white"
                      : "bg-white border border-[var(--lp-border)]"
                  }`}
                  onClick={() => setLightingPlanVariant("panels")}
                >
                  Alleen LED-panelen ({result.indicativeAverageLux} lux · {formatMaterialPrice(price)})
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    lightingPlanVariant === "mixed"
                      ? "bg-[var(--lp-primary)] text-white"
                      : "bg-white border border-[var(--lp-border)]"
                  }`}
                  onClick={() => setLightingPlanVariant("mixed")}
                >
                  Gecombineerd ({alternativeResult.indicativeAverageLux} lux ·{" "}
                  {formatMaterialPrice(alternativePrice)})
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Materiaalbegroting</h3>
          <ul className="space-y-1 text-sm text-[var(--lp-text-secondary)]">
            {price.lines.map((line) => (
              <li key={line.productId}>
                {line.quantity} × {line.name} à €{line.unitEuro.toFixed(2)} = €{line.subtotalEuro.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-[var(--lp-editor-bg)] p-4 text-white">
          <p className="text-sm text-white/70">Indicatieve materiaalsom exclusief btw</p>
          <p className="text-2xl font-bold text-[var(--lp-green)]">{formatMaterialPrice(price)}</p>
          <p className="mt-2 text-xs text-white/80">{MATERIAL_PRICE_DISCLAIMER}</p>
          <p className="mt-1 text-xs text-white/70">{MATERIAL_PRICE_FOOTNOTE}</p>
        </div>

        <p className="text-xs text-[var(--lp-text-secondary)]">{WIZARD_COPY.result.preparationNote}</p>
        <p className="text-xs text-[var(--lp-text-secondary)]">{CALCULATION_DISCLAIMER}</p>
      </WizardCard>

      <p className="mt-4 text-sm text-[var(--lp-text-secondary)]">{WIZARD_COPY.request.successSub}</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            data-testid="edit-light-plan-button"
            className="lp-btn-secondary px-8 py-3"
            onClick={() => goToEditor()}
          >
            Lichtplan aanpassen
          </button>
          <button
            type="button"
            data-testid="view-light-plan-3d-button"
            className="lp-btn-secondary px-8 py-3"
            onClick={() => goToEditor3D()}
          >
            Bekijk lichtplan in 3D
          </button>
        </div>
        <WizardNav nextLabel={WIZARD_COPY.result.requestCta} onNext={() => nextStep()} showPrev={false} />
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
