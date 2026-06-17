"use client";

import { MaterialListPanel } from "@/components/MaterialListPanel";
import { ProjectRequirementsPanel } from "@/components/ProjectRequirementsPanel";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { useWarehouseStore } from "@/lib/warehouse-store";
import { formatNumber } from "@/lib/calculations";
import { CALCULATION_DISCLAIMER, getFillModeLabel } from "@/lib/line-fill";
import { MODULE_WATTAGE_MAX } from "@/lib/light-analysis";

function directionLabel(direction: "horizontal" | "vertical") {
  return direction === "horizontal" ? "Horizontaal" : "Verticaal";
}

export function LightLinesPanel() {
  const lightLinePlan = useWarehouseStore((state) => state.lightLinePlan);
  const lightLinesGenerated = useWarehouseStore((state) => state.lightLinesGenerated);
  const lineFillMode = useWarehouseStore((state) => state.lineFillMode);

  if (!lightLinesGenerated) {
    return (
      <section className="ls-card p-5">
        <h2 className="ls-heading text-lg">Lichtlijnen</h2>
        <p className="mt-2 text-sm text-[var(--ls-navy-muted)]">
          Teken lichtlijnen op het canvas met &quot;Lichtlijn tekenen&quot;. Het systeem berekent
          automatisch rails, modules en ophangpunten.
        </p>
      </section>
    );
  }

  if (!lightLinePlan || lightLinePlan.lines.length === 0) {
    return (
      <section className="ls-card p-5">
        <h2 className="ls-heading text-lg">Lichtlijnen</h2>
        <p className="mt-2 text-sm text-[var(--ls-warn)]">
          Geen geldige lichtlijnen. Teken horizontale of verticale lijnen van minimaal 2,1 m.
        </p>
      </section>
    );
  }

  const { summary, heatmap, lines, productList, lightStatus, fillAdvice } = lightLinePlan;
  const fillLabel = getFillModeLabel(lineFillMode);

  return (
    <div className="space-y-4">
      <CollapsibleSection
        title="Lichtlijnen"
        subtitle={`${fillLabel} · ${lines.length} lichtlijn${lines.length === 1 ? "" : "en"}`}
        unstyled
        defaultOpen
      >
        <section className="ls-card p-5">
          <h2 className="ls-heading mb-1 text-lg lg:sr-only">Lichtlijnen</h2>
          <p className="mb-4 text-xs text-[var(--ls-gray)] lg:hidden">
            {fillLabel} · {lines.length} lichtlijn{lines.length === 1 ? "" : "en"}
          </p>

          <div
            className={`mb-4 rounded-lg p-4 ${
              lightStatus === "sufficient" ? "ls-status-success" : "ls-status-warn"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                lightStatus === "sufficient" ? "text-green-800" : "text-orange-900"
              }`}
            >
              {lightStatus === "sufficient"
                ? "Voldoende licht indicatief"
                : "Onvoldoende licht indicatief"}
            </p>
            <p className="mt-1 text-sm text-[var(--ls-gray)]">{fillAdvice}</p>
          </div>

          <div className="space-y-4">
            {lines.map((line) => (
              <div
                key={line.id}
                className="rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <h3 className="text-sm font-semibold text-[var(--ls-black)]">
                  LL{line.index} · {directionLabel(line.direction)}
                </h3>
                <dl className="mt-2 space-y-1 text-sm">
                  <Row label="Getekende lengte" value={`${line.availableLength.toFixed(1)} m`} />
                  <Row label="Fysieke lengte" value={`${line.physicalLength.toFixed(1)} m`} />
                  <Row label="LED-modules" value={String(line.modules)} />
                  <Row label="Blindplaten" value={String(line.blankPlates)} />
                  <Row label="Ophangpunten" value={String(line.hangerCount)} />
                </dl>
              </div>
            ))}
          </div>
        </section>
      </CollapsibleSection>

      <CollapsibleSection title="Installatie & dimmen" subtitle="Vermogen en lux-advies" unstyled>
        <section className="ls-card p-5">
          <h2 className="ls-heading mb-4 text-lg lg:sr-only">Installatie &amp; dimmen</h2>
          <dl className="space-y-2 text-sm">
            <RowBlock label="Geplaatste LED-modules" value={String(summary.totalModules)} />
            <RowBlock label="Blindplaten" value={String(summary.blankPlates)} />
            <RowBlock label="Hoogtefactor" value={summary.heightFactor.toFixed(2)} />
            <RowBlock label="Gemiddelde lux" value={`${Math.round(heatmap.averageLux)} lux`} />
            <RowBlock label="Gewenst lux-niveau" value={`${summary.targetLux} lux`} />
            <RowBlock
              label="Verwacht lux na dimmen"
              value={`${Math.round(summary.expectedLuxAfterDimming)} lux`}
            />
          </dl>

          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-[var(--ls-black)]">Vermogen</h3>
            <dl className="mt-2 space-y-2 text-sm">
              <RowBlock label="LED-modules" value={`${summary.totalModules} stuks`} />
              <RowBlock label="Standaard vermogen per module" value={`${MODULE_WATTAGE_MAX}W`} />
              <RowBlock
                label="Advies ingesteld vermogen"
                value={`${summary.advisedWattsPerModule}W per module`}
              />
              <RowBlock
                label="Geïnstalleerd vermogen"
                value={`${formatNumber(summary.installedPowerW)}W`}
              />
              <RowBlock
                label="Totaal vermogen volgens advies"
                value={`${formatNumber(summary.advisedTotalPowerW)}W`}
              />
            </dl>
          </div>

          <div className="ls-accent-panel mt-4 p-4">
            <p className="text-sm font-medium text-[var(--ls-black)]">{summary.advice}</p>
            <p className="mt-1 text-xs text-[var(--ls-gray)]">
              Armatuur: {summary.fixtureType === "opaque" ? "120°" : "90°"} · {CALCULATION_DISCLAIMER}
            </p>
          </div>
        </section>
      </CollapsibleSection>

      <CollapsibleSection
        title="Projectlijst benodigdheden"
        subtitle="Materialen en prijzen excl. btw"
        unstyled
      >
        <ProjectRequirementsPanel productList={productList} />
      </CollapsibleSection>

      <MaterialListPanel productList={productList} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--ls-gray)]">{label}</dt>
      <dd className="text-right font-medium text-[var(--ls-black)]">{value}</dd>
    </div>
  );
}

function RowBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
      <dt className="text-[var(--ls-gray)]">{label}</dt>
      <dd className="text-right font-semibold text-[var(--ls-black)]">{value}</dd>
    </div>
  );
}
