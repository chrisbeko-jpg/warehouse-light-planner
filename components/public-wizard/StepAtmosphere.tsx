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
      <h1 className="lp-heading-2 mb-2">Kies de lichtsfeer</h1>
      <p className="lp-body mb-6">
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
                ? "border-[var(--lp-green)] ring-2 ring-[var(--lp-green)]"
                : "border-[var(--lp-border)] hover:border-[var(--lp-green)]"
            }`}
          >
            <div className={`h-40 bg-gradient-to-br ${item.imageGradient}`} />
            <div className="space-y-2 p-4">
              <h2 className="text-lg font-bold">{item.title}</h2>
              <p className="text-sm font-medium text-[var(--lp-green-dark)]">
                {item.subtitle}
              </p>
              <p className="text-sm text-[var(--lp-text-secondary)]">{item.presentationText}</p>
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
