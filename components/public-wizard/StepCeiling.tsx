"use client";

import { useEffect, useMemo, useState } from "react";
import { CEILING_TYPES, getCeilingType } from "@/lib/public-wizard/ceiling-types";
import { getCeilingFallback } from "@/lib/ledpaneel/fallback-images";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardNav } from "@/components/public-wizard/WizardShell";
import { WIZARD_COPY } from "@/lib/public-wizard/wizard-copy";
import type { CeilingTypeId } from "@/types/public-wizard";

interface WizardCeilingChoiceView {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  imageAlt: string;
}

export function StepCeiling() {
  const ceilingType = usePublicWizardStore((s) => s.ceilingType);
  const selectCeilingType = usePublicWizardStore((s) => s.selectCeilingType);
  const nextStep = usePublicWizardStore((s) => s.nextStep);
  const [cmsChoices, setCmsChoices] = useState<WizardCeilingChoiceView[]>([]);

  useEffect(() => {
    void fetch("/api/cms/wizard", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ceilingChoices?: WizardCeilingChoiceView[] } | null) => {
        if (data?.ceilingChoices?.length) setCmsChoices(data.ceilingChoices);
      })
      .catch(() => undefined);
  }, []);

  const ceilingChoices = useMemo(() => {
    if (cmsChoices.length === 0) {
      return CEILING_TYPES.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        imageUrl: getCeilingFallback(item.id) ?? item.image,
        imageAlt: item.imageAlt,
      }));
    }
    return cmsChoices.map((choice) => {
      const fallback = getCeilingType(choice.id as CeilingTypeId);
      return {
        ...choice,
        title: choice.title || fallback.title,
        description: choice.description || fallback.description,
        imageUrl: choice.imageUrl ?? getCeilingFallback(choice.id) ?? fallback.image,
        imageAlt: choice.imageAlt || fallback.imageAlt,
      };
    });
  }, [cmsChoices]);

  return (
    <div>
      <h1 className="lp-heading-2 mb-2">{WIZARD_COPY.ceiling.title}</h1>
      <p className="lp-body mb-6">{WIZARD_COPY.ceiling.intro}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ceilingChoices.map((item) => {
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
              <div className="relative h-[132px] w-full overflow-hidden bg-[var(--lp-bg-secondary)] sm:h-[140px]">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.imageAlt}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                ) : null}
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
