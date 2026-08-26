"use client";

import { ATMOSPHERES } from "@/lib/public-wizard/atmospheres";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardNav } from "@/components/public-wizard/WizardShell";
import type { AtmosphereId } from "@/types/public-wizard";

export function StepAtmosphere() {
  const atmosphere = usePublicWizardStore((s) => s.atmosphere);
  const selectAtmosphere = usePublicWizardStore((s) => s.selectAtmosphere);
  const nextStep = usePublicWizardStore((s) => s.nextStep);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Kies de lichtsfeer</h1>
      <p className="mb-6 text-[var(--ls-gray)]">
        Selecteer de gewenste uitstraling voor uw kantoorverlichting.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        {ATMOSPHERES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectAtmosphere(item.id as AtmosphereId)}
            className={`overflow-hidden rounded-2xl border-2 text-left transition ${
              atmosphere === item.id
                ? "border-[var(--ls-yellow)] ring-2 ring-[var(--ls-yellow)]"
                : "border-[var(--ls-gray-light)] hover:border-[var(--ls-yellow)]"
            }`}
          >
            <div className={`h-40 bg-gradient-to-br ${item.imageGradient}`} />
            <div className="space-y-2 p-4">
              <h2 className="text-lg font-bold">{item.title}</h2>
              <p className="text-sm font-medium text-[var(--ls-yellow-hover)]">
                {item.subtitle}
              </p>
              <p className="text-sm text-[var(--ls-gray)]">{item.presentationText}</p>
            </div>
          </button>
        ))}
      </div>

      <WizardNav
        nextDisabled={!atmosphere}
        onNext={() => {
          if (atmosphere) nextStep();
        }}
      />
    </div>
  );
}
