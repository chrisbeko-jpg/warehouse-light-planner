import Image from "next/image";
import { CanvasToolbar } from "@/components/CanvasToolbar";
import { LightLinesPanel } from "@/components/LightLinesPanel";
import { ResultsPanel } from "@/components/ResultsPanel";
import { WarehouseCanvas } from "@/components/WarehouseCanvasWrapper";
import { WarehouseForm } from "@/components/WarehouseForm";

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: "var(--ls-bg)" }}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="ls-site-header mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="shrink-0">
              <Image
                src="/branding/lightsale-logo.svg"
                alt="Lightsale"
                width={180}
                height={36}
                priority
              />
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ls-yellow)]">
                Bedrijfshal &amp; magazijn
              </p>
              <h1 className="ls-heading mt-1 text-2xl sm:text-3xl">Lichtontwerp planner</h1>
            </div>
          </div>
          <p className="ls-tagline mt-4 max-w-3xl text-sm">
            Indicatieve berekening voor energiezuinige magazijnverlichting. Ontwerp lichtlijnen,
            bepaal veiligheid en werkcomfort, en stel direct een projectlijst samen.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <WarehouseForm />
            <CanvasToolbar />
            <WarehouseCanvas />
          </div>
          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <ResultsPanel />
            <LightLinesPanel />
          </aside>
        </div>
      </div>
    </main>
  );
}
