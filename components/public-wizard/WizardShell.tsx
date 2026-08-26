"use client";

import { usePublicWizardStore, WIZARD_STEP_LABELS } from "@/lib/public-wizard/store";
import type { WizardStepId } from "@/types/public-wizard";

export function WizardProgress() {
  const step = usePublicWizardStore((s) => s.step);
  const currentIdx = WIZARD_STEP_LABELS.findIndex((s) => s.id === step);

  return (
    <nav className="mb-8 flex flex-wrap gap-2" aria-label="Wizard voortgang">
      {WIZARD_STEP_LABELS.map((item, idx) => {
        const active = item.id === step;
        const done = idx < currentIdx;
        return (
          <div
            key={item.id}
            className={`rounded-full px-3 py-1 text-xs font-semibold sm:px-4 sm:text-sm ${
              active
                ? "bg-[var(--ls-yellow)] text-[var(--ls-black)]"
                : done
                  ? "bg-[var(--ls-dark)] text-white"
                  : "bg-[var(--ls-gray-light)] text-[var(--ls-gray)]"
            }`}
          >
            {idx + 1}. {item.label}
          </div>
        );
      })}
    </nav>
  );
}

export function WizardNav({
  onNext,
  onPrev,
  nextLabel = "Volgende",
  nextDisabled = false,
  showPrev = true,
}: {
  onNext?: () => void;
  onPrev?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showPrev?: boolean;
}) {
  const prevStep = usePublicWizardStore((s) => s.prevStep);
  const step = usePublicWizardStore((s) => s.step);

  return (
    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
      {showPrev && step !== "room" ? (
        <button type="button" className="btn-secondary px-8" onClick={onPrev ?? prevStep}>
          Vorige
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        data-testid="wizard-next-button"
        className="btn-primary px-8 py-3 text-base font-bold"
        disabled={nextDisabled}
        onClick={onNext}
      >
        {nextLabel}
      </button>
    </div>
  );
}

export function WizardCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--ls-gray-light)] bg-white p-4 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function stepIndex(step: WizardStepId): number {
  return WIZARD_STEP_LABELS.findIndex((s) => s.id === step);
}
