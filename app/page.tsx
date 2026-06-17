import Image from "next/image";
import { CanvasToolbar } from "@/components/CanvasToolbar";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { LightLinesPanel } from "@/components/LightLinesPanel";
import { ResultsPanel } from "@/components/ResultsPanel";
import { WarehouseCanvas } from "@/components/WarehouseCanvasWrapper";
import { WarehouseForm } from "@/components/WarehouseForm";

export default function Home() {
  return (
    <main className="ls-app-shell min-h-screen" style={{ background: "var(--ls-bg)" }}>
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
        <header className="ls-site-header mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="shrink-0">
              <Image
                src="/branding/lightsale-logo.svg"
                alt="Lightsale"
                width={180}
                height={36}
                priority
                className="h-auto w-[140px] sm:w-[180px]"
              />
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ls-yellow)]">
                Bedrijfshal &amp; magazijn
              </p>
              <h1 className="ls-heading mt-1 text-xl sm:text-2xl lg:text-3xl">Lichtontwerp planner</h1>
            </div>
          </div>
          <p className="ls-tagline mt-4 max-w-3xl text-sm">
            Indicatieve berekening voor energiezuinige magazijnverlichting. Ontwerp lichtlijnen,
            bepaal veiligheid en werkcomfort, en stel direct een projectlijst samen.
          </p>
        </header>

        {/* Desktop: form | canvas | results. Tablet/mobile: single column */}
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,360px)] xl:gap-6">
          <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
            <CollapsibleSection
              title="Projectgegevens"
              subtitle="Afmetingen, lux en montage"
              unstyled
            >
              <WarehouseForm />
            </CollapsibleSection>
          </div>

          <div className="min-w-0 space-y-4">
            <CanvasToolbar />
            <WarehouseCanvas />
          </div>

          <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
            <CollapsibleSection
              title="Indicatieve berekening"
              subtitle="Oppervlak, lumen en modules"
              unstyled
            >
              <ResultsPanel />
            </CollapsibleSection>
            <LightLinesPanel />
          </aside>
        </div>
      </div>
    </main>
  );
}
