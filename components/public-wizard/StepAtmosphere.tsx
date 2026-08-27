"use client";

import { useEffect, useMemo, useState } from "react";
import { AtmosphereCardImage } from "@/components/public-wizard/AtmosphereCardImage";
import { ATMOSPHERES, getAtmosphere } from "@/lib/public-wizard/atmospheres";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardNav } from "@/components/public-wizard/WizardShell";
import type { AtmosphereId } from "@/types/public-wizard";

interface WizardAtmosphereChoiceView {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageMediaId: string | null;
  imageUrl: string | null;
  imageAlt: string;
  enabled: boolean;
  badgeText?: string;
}

function isSelectableAtmosphere(id: string, enabled: boolean | undefined): boolean {
  if (enabled === false) return false;
  if (id === "premium_architectural" || id === "luxe") return false;
  return id === "warm" || id === "neutraal";
}

function AtmosphereCardBody({ item }: { item: WizardAtmosphereChoiceView }) {
  return (
    <div className="space-y-2 p-4">
      <h2 className="text-lg font-bold">{item.title}</h2>
      <p className="text-sm font-medium text-[var(--lp-green-dark)]">{item.subtitle}</p>
      <p className="text-sm text-[var(--lp-text-secondary)]">{item.description}</p>
    </div>
  );
}

export function StepAtmosphere() {
  const atmosphere = usePublicWizardStore((s) => s.atmosphere);
  const selectAtmosphere = usePublicWizardStore((s) => s.selectAtmosphere);
  const nextStep = usePublicWizardStore((s) => s.nextStep);
  const [cmsChoices, setCmsChoices] = useState<WizardAtmosphereChoiceView[]>([]);

  useEffect(() => {
    void fetch("/api/cms/wizard", { cache: "no-store" })
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
        imageMediaId: null,
        imageUrl: null as string | null,
        imageAlt: item.title,
        enabled: item.id !== "premium_architectural",
        badgeText: item.id === "premium_architectural" ? "ONLY PREMIUM" : undefined,
      }));
    }
    return cmsChoices;
  }, [cmsChoices]);

  return (
    <div>
      <h1 className="lp-heading-2 mb-2">Welke sfeer zoekt u?</h1>
      <p className="lp-body mb-6">
        Kies warm of helder functioneel. Premium architectonisch volgt later.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        {atmosphereChoices.map((item) => {
          const fallback = getAtmosphere(item.id as AtmosphereId);
          const selectable = isSelectableAtmosphere(item.id, item.enabled);
          const selected = selectable && atmosphere === item.id;

          if (!selectable) {
            return (
              <div
                key={item.id}
                data-testid={`atmosphere-option-${item.id}`}
                data-disabled="true"
                aria-disabled="true"
                className="cursor-not-allowed overflow-hidden rounded-2xl border-2 border-[var(--lp-border)] text-left"
              >
                <AtmosphereCardImage
                  choiceId={item.id}
                  imageUrl={item.imageUrl}
                  imageAlt={item.imageAlt}
                  title={item.title}
                  fallbackGradient={fallback.imageGradient}
                  premiumOverlay
                  badgeText={item.badgeText ?? "ONLY PREMIUM"}
                />
                <AtmosphereCardBody item={item} />
              </div>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              data-testid={`atmosphere-option-${item.id}`}
              onClick={() => selectAtmosphere(item.id as AtmosphereId)}
              aria-pressed={selected}
              className={`overflow-hidden rounded-2xl border-2 text-left transition ${
                selected
                  ? "border-[var(--lp-green)] ring-2 ring-[var(--lp-green)]"
                  : "border-[var(--lp-border)] hover:border-[var(--lp-green)]"
              }`}
            >
              <AtmosphereCardImage
                choiceId={item.id}
                imageUrl={item.imageUrl}
                imageAlt={item.imageAlt}
                title={item.title}
                fallbackGradient={fallback.imageGradient}
              />
              <AtmosphereCardBody item={item} />
            </button>
          );
        })}
      </div>

      <WizardNav
        nextLabel="Volgende: upload plattegrond"
        nextDisabled={!atmosphere}
        onNext={() => {
          if (atmosphere) nextStep();
        }}
      />
    </div>
  );
}
