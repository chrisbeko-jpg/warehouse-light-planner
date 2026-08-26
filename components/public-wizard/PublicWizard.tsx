"use client";

import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardProgress } from "@/components/public-wizard/WizardShell";
import { StepRoom } from "@/components/public-wizard/StepRoom";
import { StepAtmosphere } from "@/components/public-wizard/StepAtmosphere";
import { StepFloorPlan } from "@/components/public-wizard/StepFloorPlan";
import { StepGenerate } from "@/components/public-wizard/StepGenerate";
import { StepResult } from "@/components/public-wizard/StepResult";
import { StepRequest } from "@/components/public-wizard/StepRequest";

export function PublicWizard() {
  const step = usePublicWizardStore((s) => s.step);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ls-yellow-hover)]">
          Lightsale · LED Paneel Wizard
        </p>
        <p className="text-sm text-[var(--ls-gray)]">
          Maak in enkele minuten een indicatief lichtplan voor uw kantoorruimte.
        </p>
      </header>
      <WizardProgress />
      {step === "room" && <StepRoom />}
      {step === "atmosphere" && <StepAtmosphere />}
      {step === "floorplan" && <StepFloorPlan />}
      {step === "generate" && <StepGenerate />}
      {step === "result" && <StepResult />}
      {step === "request" && <StepRequest />}
    </div>
  );
}
