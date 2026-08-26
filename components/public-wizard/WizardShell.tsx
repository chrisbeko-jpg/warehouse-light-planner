"use client";

import { usePublicWizardStore, WIZARD_STEP_LABELS } from "@/lib/public-wizard/store";

export function WizardProgress() {
  const step = usePublicWizardStore((s) => s.step);
  const setStep = usePublicWizardStore((s) => s.setStep);
  const progressSteps = WIZARD_STEP_LABELS.filter((s) => s.showInProgress);
  const currentIdx = progressSteps.findIndex((s) => s.id === step);

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Wizard voortgang">
      {progressSteps.map((item, idx) => {
        const active = item.id === step;
        const done = idx < currentIdx;
        const canNavigate = idx <= currentIdx;
        return (
          <button
            key={item.id}
            type="button"
            disabled={!canNavigate}
            onClick={() => {
              if (canNavigate) setStep(item.id);
            }}
            data-testid={`wizard-progress-${item.id}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold sm:px-4 sm:text-sm ${
              active
                ? "bg-[var(--lp-green)] text-white"
                : done
                  ? "bg-[var(--lp-green-dark)] text-white"
                  : "bg-[var(--lp-bg-secondary)] text-[var(--lp-text-secondary)]"
            } ${canNavigate ? "cursor-pointer" : "cursor-default opacity-60"}`}
          >
            {item.label}
          </button>
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
        <button type="button" className="lp-btn-secondary px-8" onClick={onPrev ?? prevStep}>
          Vorige
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        data-testid="wizard-next-button"
        className="lp-btn-primary px-8 py-3 text-base font-bold disabled:opacity-50"
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
    <div className={`lp-card p-4 sm:p-6 ${className}`}>{children}</div>
  );
}
