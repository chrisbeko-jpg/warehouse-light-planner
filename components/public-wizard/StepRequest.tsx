"use client";

import { useState } from "react";
import { usePublicWizardStore, validateLeadForm } from "@/lib/public-wizard/store";
import { WizardCard, WizardNav } from "@/components/public-wizard/WizardShell";
import type { LeadContactForm } from "@/types/public-wizard";

const EMPTY_FORM: LeadContactForm = {
  companyName: "",
  contactPerson: "",
  address: "",
  postalCode: "",
  city: "",
  telephone: "",
  email: "",
  deliveryAddress: "",
  deliveryPostalCode: "",
  deliveryCity: "",
  projectName: "",
  remarks: "",
  desiredDeliveryDate: "",
  deliverySameAsCompany: false,
  privacyConsent: false,
};

export function StepRequest() {
  const [form, setForm] = useState<LeadContactForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const roomFunction = usePublicWizardStore((s) => s.roomFunction);
  const ceilingHeightM = usePublicWizardStore((s) => s.ceilingHeightM);
  const targetLux = usePublicWizardStore((s) => s.targetLux);
  const atmosphere = usePublicWizardStore((s) => s.atmosphere);
  const preferredProductId = usePublicWizardStore((s) => s.preferredProductId);
  const fixtures = usePublicWizardStore((s) => s.fixtures);
  const roomVertices = usePublicWizardStore((s) => s.roomVertices);
  const pixelsPerMeter = usePublicWizardStore((s) => s.pixelsPerMeter);
  const backgroundDataUrl = usePublicWizardStore((s) => s.backgroundDataUrl);
  const setSubmitResult = usePublicWizardStore((s) => s.setSubmitResult);
  const submitReference = usePublicWizardStore((s) => s.submitReference);
  const submitEmail = usePublicWizardStore((s) => s.submitEmail);

  const update = (patch: Partial<LeadContactForm>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (patch.deliverySameAsCompany === true) {
        next.deliveryAddress = next.address;
        next.deliveryPostalCode = next.postalCode;
        next.deliveryCity = next.city;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const validationError = validateLeadForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!roomFunction || !atmosphere || !pixelsPerMeter) {
      setError("Wizardgegevens ontbreken. Start opnieuw.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/public-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: form,
          roomFunction,
          ceilingHeightM,
          targetLux,
          atmosphere,
          preferredProductId,
          fixtures,
          roomVertices,
          pixelsPerMeter,
          floorPlanDataUrl: backgroundDataUrl,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        reference?: string;
        error?: string;
      };
      if (!response.ok || !data.ok || !data.reference) {
        throw new Error(data.error ?? "Aanvraag mislukt");
      }
      setSubmitResult(data.reference, form.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aanvraag mislukt");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitReference) {
    return (
      <WizardCard className="text-center">
        <h1 className="mb-4 text-2xl font-bold">Bedankt voor uw aanvraag.</h1>
        <p className="mb-4 text-[var(--ls-gray)]">
          Lightsale controleert het lichtplan en de productspecificatie. U ontvangt vervolgens het
          uitgewerkte lichtplan samen met een projectofferte.
        </p>
        <p className="font-semibold">Referentie: {submitReference}</p>
        <p className="text-sm text-[var(--ls-gray)]">Bevestiging verzonden naar: {submitEmail}</p>
      </WizardCard>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Ontvang mijn lichtplan + projectofferte</h1>
      <p className="mb-4 text-[var(--ls-gray)]">
        Vul uw gegevens in. U ontvangt geen directe PDF-download — Lightsale stuurt het uitgewerkte
        plan na controle.
      </p>

      <WizardCard className="grid gap-3 sm:grid-cols-2">
        <Field label="Bedrijfsnaam *" value={form.companyName} onChange={(v) => update({ companyName: v })} />
        <Field label="Contactpersoon *" value={form.contactPerson} onChange={(v) => update({ contactPerson: v })} />
        <Field label="Adres *" value={form.address} onChange={(v) => update({ address: v })} />
        <Field label="Postcode *" value={form.postalCode} onChange={(v) => update({ postalCode: v })} />
        <Field label="Plaats *" value={form.city} onChange={(v) => update({ city: v })} />
        <Field label="Telefoon *" value={form.telephone} onChange={(v) => update({ telephone: v })} />
        <Field label="E-mail *" type="email" value={form.email} onChange={(v) => update({ email: v })} />
        <Field label="Projectnaam" value={form.projectName} onChange={(v) => update({ projectName: v })} />
        <Field
          label="Afleveradres *"
          value={form.deliveryAddress}
          onChange={(v) => update({ deliveryAddress: v })}
          disabled={form.deliverySameAsCompany}
        />
        <Field
          label="Aflever postcode *"
          value={form.deliveryPostalCode}
          onChange={(v) => update({ deliveryPostalCode: v })}
          disabled={form.deliverySameAsCompany}
        />
        <Field
          label="Aflever plaats *"
          value={form.deliveryCity}
          onChange={(v) => update({ deliveryCity: v })}
          disabled={form.deliverySameAsCompany}
        />
        <Field
          label="Gewenste leverdatum"
          type="date"
          value={form.desiredDeliveryDate}
          onChange={(v) => update({ desiredDeliveryDate: v })}
        />
        <label className="sm:col-span-2 block text-sm">
          Opmerkingen
          <textarea
            value={form.remarks}
            onChange={(e) => update({ remarks: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            rows={3}
          />
        </label>
        <label className="sm:col-span-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.deliverySameAsCompany}
            onChange={(e) => update({ deliverySameAsCompany: e.target.checked })}
          />
          Afleveradres is gelijk aan bedrijfsadres
        </label>
        <label className="sm:col-span-2 flex items-start gap-2 text-xs text-[var(--ls-gray)]">
          <input
            type="checkbox"
            checked={form.privacyConsent}
            onChange={(e) => update({ privacyConsent: e.target.checked })}
            className="mt-1"
          />
          Ik ga akkoord met het verwerken van mijn gegevens door Lightsale voor het opstellen van een
          indicatief lichtplan en projectofferte. Mijn gegevens worden niet gedeeld met derden.
        </label>
      </WizardCard>

      {error && <p className="mt-3 text-sm text-[var(--ls-danger)]">{error}</p>}

      <WizardNav
        showPrev
        nextLabel={submitting ? "Versturen…" : "Ontvang lichtplan + offerte"}
        nextDisabled={submitting}
        onNext={() => void handleSubmit()}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-[var(--ls-gray-light)] px-3 py-2 disabled:bg-[var(--ls-bg)]"
      />
    </label>
  );
}
