"use client";

import dynamic from "next/dynamic";
import { LedpaneelLogo } from "@/components/ledpaneel/LedpaneelLogo";
import { useEffect } from "react";
import { setActiveProductCatalog } from "@/lib/public-wizard/products";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardProgress } from "@/components/public-wizard/WizardShell";
import { StepRoom } from "@/components/public-wizard/StepRoom";
import { StepAtmosphere } from "@/components/public-wizard/StepAtmosphere";
import { StepCeiling } from "@/components/public-wizard/StepCeiling";
import { StepInputMethod } from "@/components/public-wizard/StepInputMethod";
import { StepManualDimensions } from "@/components/public-wizard/StepManualDimensions";
import { StepFloorPlanUpload } from "@/components/public-wizard/StepFloorPlanUpload";
import { StepResult } from "@/components/public-wizard/StepResult";
import { StepRequest } from "@/components/public-wizard/StepRequest";

const StepEditor = dynamic(
  () => import("@/components/public-wizard/StepEditor").then((m) => m.StepEditor),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--lp-bg)]">
        <p className="text-sm text-[var(--lp-text-secondary)]">Editor laden…</p>
      </div>
    ),
  },
);

export function PublicWizard() {
  const step = usePublicWizardStore((s) => s.step);

  useEffect(() => {
    void fetch("/api/cms/wizard", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { products?: Parameters<typeof setActiveProductCatalog>[0] } | null) => {
        if (data?.products?.length) setActiveProductCatalog(data.products);
      })
      .catch(() => undefined);
  }, []);

  if (step === "editor") {
    return <StepEditor />;
  }

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
      <div className="mb-8">
        <WizardProgress />
      </div>
      {step === "room" && <StepRoom />}
      {step === "atmosphere" && <StepAtmosphere />}
      {step === "ceiling" && <StepCeiling />}
      {step === "inputMethod" && <StepInputMethod />}
      {step === "dimensions" && <StepManualDimensions />}
      {step === "floorplan" && <StepFloorPlanUpload />}
      {step === "result" && <StepResult />}
      {step === "request" && <StepRequest />}
    </div>
  );
}
