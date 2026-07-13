import Image from "next/image";
import Link from "next/link";
import { FloorPlanToolbar } from "@/components/floor-plan/FloorPlanToolbar";
import { FloorPlanSidebar } from "@/components/floor-plan/FloorPlanSidebar";
import { FloorPlanCanvas } from "@/components/floor-plan/FloorPlanEditorWrapper";

export default function FloorPlanPage() {
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
                Plattegrond
              </p>
              <h1 className="ls-heading mt-1 text-xl sm:text-2xl lg:text-3xl">
                Ruimte-editor
              </h1>
            </div>
          </div>
          <p className="ls-tagline mt-4 max-w-3xl text-sm">
            Upload een plattegrond, stel de schaal in, teken ruimtes als polygonen en
            beheer per ruimte naam, type, plafond en doellux. Projectdata wordt lokaal
            opgeslagen en kan als JSON worden geëxporteerd.
          </p>
          <p className="mt-3 text-sm">
            <Link href="/" className="font-medium text-[var(--ls-yellow)] hover:underline">
              ← Terug naar lichtontwerp planner
            </Link>
          </p>
        </header>

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)] xl:gap-6">
          <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
            <FloorPlanSidebar />
          </div>
          <div className="min-w-0 space-y-4">
            <FloorPlanToolbar />
            <FloorPlanCanvas />
          </div>
        </div>
      </div>
    </main>
  );
}
