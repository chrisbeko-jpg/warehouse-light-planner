"use client";

import { useState } from "react";
import { exportPlanSnapshots } from "@/lib/public-wizard/export-plan-snapshot";
import {
  LEAD_SUBMIT_ERROR_MESSAGE,
  parseLeadApiResponse,
  resolveLeadContactDelivery,
  validateLeadForm,
} from "@/lib/public-wizard/lead-form";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
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
  deliverySameAsCompany: true,
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
  const backgroundWidth = usePublicWizardStore((s) => s.backgroundWidth);
  const backgroundHeight = usePublicWizardStore((s) => s.backgroundHeight);
  const setSubmitResult = usePublicWizardStore((s) => s.setSubmitResult);
  const submitReference = usePublicWizardStore((s) => s.submitReference);
  const submitEmail = usePublicWizardStore((s) => s.submitEmail);
  const goToEditor = usePublicWizardStore((s) => s.goToEditor);

  const update = (patch: Partial<LeadContactForm>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (
        next.deliverySameAsCompany ||
        patch.deliverySameAsCompany === true ||
        patch.address !== undefined ||
        patch.postalCode !== undefined ||
        patch.city !== undefined
      ) {
        if (next.deliverySameAsCompany) {
          next.deliveryAddress = next.address;
          next.deliveryPostalCode = next.postalCode;
          next.deliveryCity = next.city;
        }
      }
      if (patch.deliverySameAsCompany === false) {
        next.deliveryAddress = "";
        next.deliveryPostalCode = "";
        next.deliveryCity = "";
      }
      return next;
    });
    setError(null);
  };

  const handleSubmit = async () => {
    const contact = resolveLeadContactDelivery(form);
    const validationError = validateLeadForm(contact);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!roomFunction || !atmosphere || !pixelsPerMeter || !backgroundDataUrl) {
      setError("Wizardgegevens ontbreken. Start opnieuw.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const snapshots = await exportPlanSnapshots({
        backgroundDataUrl,
        backgroundWidth,
        backgroundHeight,
        roomVertices,
        fixtures,
        pixelsPerMeter,
        targetLux,
        ceilingHeightM,
      });

      const response = await fetch("/api/public-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact,
          roomFunction,
          ceilingHeightM,
          targetLux,
          atmosphere,
          preferredProductId,
          fixtures,
          roomVertices,
          pixelsPerMeter,
          floorPlanDataUrl: backgroundDataUrl,
          lightPlanImageBase64: snapshots.lightPlanPng,
          heatmapImageBase64: snapshots.heatmapPng,
        }),
      });

      const bodyText = await response.text();
      const data = parseLeadApiResponse(response, bodyText);
      if (!data.success || !data.reference) {
        setError(data.message || LEAD_SUBMIT_ERROR_MESSAGE);
        return;
      }
      setSubmitResult(data.reference, contact.email);
    } catch (err) {
      console.error("Lead submit failed:", err);
      setError(LEAD_SUBMIT_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitReference) {
    return (
      <WizardCard className="text-center">
        <h1 className="mb-4 text-2xl font-bold">Bedankt voor uw aanvraag.</h1>
        <p className="mb-4 text-[var(--lp-text-secondary)]">
          Lightsale controleert het lichtplan en de productspecificatie. U ontvangt vervolgens het
          uitgewerkte lichtplan samen met een projectofferte.
        </p>
        <p className="font-semibold">Referentie: {submitReference}</p>
        <p className="text-sm text-[var(--lp-text-secondary)]">Bevestiging verzonden naar: {submitEmail}</p>
      </WizardCard>
    );
  }

  return (
    <div>
      <h1 className="lp-heading-2 mb-2">Ontvang mijn lichtplan + projectofferte</h1>
      <p className="lp-body mb-4">
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
          label="Gewenste leverdatum"
          type="date"
          value={form.desiredDeliveryDate}
          onChange={(v) => update({ desiredDeliveryDate: v })}
        />

        <label className="sm:col-span-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            data-testid="delivery-same-checkbox"
            checked={form.deliverySameAsCompany}
            onChange={(e) => update({ deliverySameAsCompany: e.target.checked })}
          />
          Afleveradres is gelijk aan bedrijfsadres
        </label>

        {!form.deliverySameAsCompany && (
          <div
            data-testid="delivery-fields-section"
            className="sm:col-span-2 grid gap-3 rounded-lg border border-[var(--lp-border)] bg-[var(--lp-bg-secondary)] p-4 sm:grid-cols-2"
          >
            <p className="sm:col-span-2 text-sm font-semibold">Afwijkend afleveradres</p>
            <Field
              label="Adres *"
              value={form.deliveryAddress}
              onChange={(v) => update({ deliveryAddress: v })}
              testId="delivery-address"
            />
            <Field
              label="Postcode *"
              value={form.deliveryPostalCode}
              onChange={(v) => update({ deliveryPostalCode: v })}
              testId="delivery-postal-code"
            />
            <Field
              label="Plaats *"
              value={form.deliveryCity}
              onChange={(v) => update({ deliveryCity: v })}
              testId="delivery-city"
            />
          </div>
        )}

        <label className="sm:col-span-2 block text-sm">
          Opmerkingen
          <textarea
            value={form.remarks}
            onChange={(e) => update({ remarks: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            rows={3}
          />
        </label>

        <label className="sm:col-span-2 flex items-start gap-2 text-xs text-[var(--lp-text-secondary)]">
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

      {error && (
        <p className="mt-3 text-sm text-[var(--lp-danger)]" data-testid="lead-form-error">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          data-testid="edit-light-plan-button"
          className="lp-btn-secondary px-8 py-3"
          onClick={() => goToEditor()}
        >
          Lichtplan aanpassen
        </button>
        <WizardNav
          showPrev
          nextLabel={submitting ? "Versturen…" : "Ontvang lichtplan + offerte"}
          nextDisabled={submitting}
          onNext={() => void handleSubmit()}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        type={type}
        value={value}
        disabled={disabled}
        data-testid={testId}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2 disabled:bg-[var(--lp-bg-secondary)]"
      />
    </label>
  );
}
