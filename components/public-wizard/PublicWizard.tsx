"use client";

import { LedpaneelLogo } from "@/components/ledpaneel/LedpaneelLogo";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardProgress } from "@/components/public-wizard/WizardShell";
import { StepRoom } from "@/components/public-wizard/StepRoom";
import { StepAtmosphere } from "@/components/public-wizard/StepAtmosphere";
import { StepFloorPlanUpload } from "@/components/public-wizard/StepFloorPlanUpload";
import { StepEditor } from "@/components/public-wizard/StepEditor";
import { StepResult } from "@/components/public-wizard/StepResult";
import { StepRequest } from "@/components/public-wizard/StepRequest";

export function PublicWizard() {
  const step = usePublicWizardStore((s) => s.step);

  return (
    <div className="lp-container py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <LedpaneelLogo size="sm" />
          <p className="mt-2 text-sm font-semibold text-[var(--lp-green-dark)]">AI Lichtadvies</p>
          <p className="text-sm text-[var(--lp-text-secondary)]">
            Indicatief lichtadvies — het definitieve lichtplan wordt door Lightsale gecontroleerd.
          </p>
        </div>
      </header>
      <WizardProgress />
      {step === "room" && <StepRoom />}
      {step === "atmosphere" && <StepAtmosphere />}
      {step === "floorplan" && <StepFloorPlanUpload />}
      {step === "editor" && <StepEditor />}
      {step === "result" && <StepResult />}
      {step === "request" && <StepRequest />}
    </div>
  );
}
