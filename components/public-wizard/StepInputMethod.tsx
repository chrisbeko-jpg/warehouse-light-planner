"use client";

import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardNav } from "@/components/public-wizard/WizardShell";
import type { WizardInputMethod } from "@/types/public-wizard";

const OPTIONS: {
  id: WizardInputMethod;
  title: string;
  body: string;
  cta: string;
  icon: string;
}[] = [
  {
    id: "floorplan",
    title: "Plattegrond uploaden",
    body: "Upload een PDF, JPG of PNG van uw plattegrond. U bepaalt daarna eenvoudig de schaal en de ruimte.",
    cta: "Plattegrond uploaden",
    icon: "📄",
  },
  {
    id: "dimensions",
    title: "Zelf afmetingen invoeren",
    body: "Geen plattegrond? Vul de lengte, breedte en plafondhoogte van de ruimte in.",
    cta: "Afmetingen invoeren",
    icon: "📐",
  },
];

export function StepInputMethod() {
  const inputMethod = usePublicWizardStore((s) => s.inputMethod);
  const selectInputMethod = usePublicWizardStore((s) => s.selectInputMethod);
  const nextStep = usePublicWizardStore((s) => s.nextStep);

  return (
    <div>
      <h1 className="lp-heading-2 mb-2">Hoe wilt u de ruimte invoeren?</h1>
      <p className="lp-body mb-6">Kies hoe u de afmetingen van de ruimte wilt bepalen.</p>

      <div className="grid gap-4 md:grid-cols-2">
        {OPTIONS.map((option) => {
          const selected = inputMethod === option.id;
          return (
            <button
              key={option.id}
              type="button"
              data-testid={`input-method-${option.id}`}
              aria-pressed={selected}
              onClick={() => selectInputMethod(option.id)}
              className={`rounded-2xl border-2 p-5 text-left transition ${
                selected
                  ? "border-[var(--lp-green)] ring-2 ring-[var(--lp-green)]"
                  : "border-[var(--lp-border)] hover:border-[var(--lp-green)]"
              }`}
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--lp-bg-secondary)] text-3xl">
                {option.icon}
              </div>
              <h2 className="text-lg font-bold">{option.title}</h2>
              <p className="lp-body mt-2 text-sm">{option.body}</p>
              <span className="mt-4 inline-flex text-sm font-semibold text-[var(--lp-green-dark)]">
                {option.cta}
              </span>
            </button>
          );
        })}
      </div>

      <WizardNav nextDisabled={!inputMethod} onNext={() => inputMethod && nextStep()} />
    </div>
  );
}
