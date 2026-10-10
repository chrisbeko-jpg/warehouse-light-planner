"use client";

import { CEILING_TYPES } from "@/lib/public-wizard/ceiling-types";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardNav } from "@/components/public-wizard/WizardShell";
import type { CeilingTypeId } from "@/types/public-wizard";

export function StepCeiling() {
  const ceilingType = usePublicWizardStore((s) => s.ceilingType);
  const selectCeilingType = usePublicWizardStore((s) => s.selectCeilingType);
  const nextStep = usePublicWizardStore((s) => s.nextStep);

  return (
    <div>
      <h1 className="lp-heading-2 mb-2">Welk type plafond heeft uw ruimte?</h1>
      <p className="lp-body mb-6">
        Selecteer het type plafond. Wij kiezen automatisch de passende verlichting en maken een lichtplan.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CEILING_TYPES.map((item) => {
          const selected = ceilingType === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`ceiling-option-${item.id}`}
              onClick={() => selectCeilingType(item.id as CeilingTypeId)}
              aria-pressed={selected}
              className={`overflow-hidden rounded-2xl border-2 text-left transition ${
                selected
                  ? "border-[var(--lp-green)] ring-2 ring-[var(--lp-green)]"
                  : "border-[var(--lp-border)] hover:border-[var(--lp-green)]"
              }`}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--lp-bg-secondary)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt={item.imageAlt} className="h-full w-full object-cover" />
              </div>
              <div className="space-y-1 p-3 sm:p-4">
                <h2 className="text-base font-bold sm:text-lg">{item.title}</h2>
                <p className="text-sm text-[var(--lp-text-secondary)]">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <WizardNav
        nextLabel="Volgende"
        nextDisabled={!ceilingType}
        onNext={() => {
          if (ceilingType) nextStep();
        }}
      />
    </div>
  );
}
