"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ATMOSPHERES, getAtmosphere } from "@/lib/public-wizard/atmospheres";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardNav } from "@/components/public-wizard/WizardShell";
import type { AtmosphereId } from "@/types/public-wizard";

interface WizardAtmosphereChoiceView {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string | null;
  imageAlt: string;
  flow: "standard" | "kantoorverlichting";
}

export function StepAtmosphere() {
  const atmosphere = usePublicWizardStore((s) => s.atmosphere);
  const selectAtmosphere = usePublicWizardStore((s) => s.selectAtmosphere);
  const nextStep = usePublicWizardStore((s) => s.nextStep);
  const router = useRouter();
  const [cmsChoices, setCmsChoices] = useState<WizardAtmosphereChoiceView[]>([]);

  useEffect(() => {
    void fetch("/api/cms/wizard")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { atmosphereChoices?: WizardAtmosphereChoiceView[] } | null) => {
        if (data?.atmosphereChoices?.length) setCmsChoices(data.atmosphereChoices);
      })
      .catch(() => undefined);
  }, []);

  const atmosphereChoices = useMemo(() => {
    if (cmsChoices.length === 0) {
      return ATMOSPHERES.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        description: item.presentationText,
        imageUrl: null as string | null,
        imageAlt: item.title,
        flow: item.id === "luxe" ? ("kantoorverlichting" as const) : ("standard" as const),
      }));
    }
    return cmsChoices;
  }, [cmsChoices]);

  return (
    <div>
      <h1 className="lp-heading-2 mb-2">Kies de lichtsfeer</h1>
      <p className="lp-body mb-6">
        Selecteer de gewenste uitstraling voor uw kantoorverlichting.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        {atmosphereChoices.map((item) => {
          const fallback = getAtmosphere(item.id as AtmosphereId);
          const isLuxe = item.flow === "kantoorverlichting";
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`atmosphere-option-${item.id}`}
              onClick={() => {
                if (isLuxe) {
                  router.push("/kantoorverlichting");
                  return;
                }
                selectAtmosphere(item.id as AtmosphereId);
              }}
              aria-pressed={!isLuxe && atmosphere === item.id}
              className={`overflow-hidden rounded-2xl border-2 text-left transition ${
                !isLuxe && atmosphere === item.id
                  ? "border-[var(--lp-green)] ring-2 ring-[var(--lp-green)]"
                  : "border-[var(--lp-border)] hover:border-[var(--lp-green)]"
              }`}
            >
              <div className={`relative h-40 bg-gradient-to-br ${fallback.imageGradient}`}>
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.imageAlt || item.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="space-y-2 p-4">
                <h2 className="text-lg font-bold">{item.title}</h2>
                <p className="text-sm font-medium text-[var(--lp-green-dark)]">{item.subtitle}</p>
                <p className="text-sm text-[var(--lp-text-secondary)]">{item.description}</p>
                {isLuxe && (
                  <p className="text-sm font-semibold text-[var(--lp-green-dark)]">
                    Bekijk professioneel kantoorlichtadvies →
                  </p>
                )}
              </div>
            </button>
          );
        })}
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
