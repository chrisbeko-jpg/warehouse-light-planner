"use client";

import { useState } from "react";
import {
  AI_CALCULATOR_SUBMIT_ERROR_MESSAGE,
  AI_CALCULATOR_SUCCESS_MESSAGE,
  parseAiCalculatorApiResponse,
  validateAiCalculatorForm,
  type AiCalculatorFormData,
} from "@/lib/ai-calculator/form";

const EMPTY_FORM: AiCalculatorFormData = {
  companyName: "",
  contactPerson: "",
  email: "",
  telephone: "",
  website: "",
  description: "",
  desiredTimeline: "",
  remarks: "",
};

export function AiCalculatorForm({
  heading,
  intro,
  submitButtonText,
}: {
  heading: string;
  intro: string;
  submitButtonText: string;
}) {
  const [form, setForm] = useState<AiCalculatorFormData>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (patch: Partial<AiCalculatorFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateAiCalculatorForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/ai-calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const bodyText = await response.text();
      const data = parseAiCalculatorApiResponse(response, bodyText);
      if (!data.success) {
        setError(data.message || AI_CALCULATOR_SUBMIT_ERROR_MESSAGE);
        return;
      }
      setSuccess(true);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error("AI calculator submit failed:", err);
      setError(AI_CALCULATOR_SUBMIT_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <section id="ai-calculator-form" className="lp-section lp-section-alt" data-testid="ai-calculator-form">
        <div className="lp-container max-w-2xl">
          <div className="lp-card p-6 text-center" data-testid="ai-calculator-success">
            <h2 className="lp-heading-2">{AI_CALCULATOR_SUCCESS_MESSAGE}</h2>
            <p className="lp-body mt-3">
              Lightsale bekijkt uw wensen en neemt contact met u op.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="ai-calculator-form" className="lp-section lp-section-alt" data-testid="ai-calculator-form">
      <div className="lp-container max-w-2xl">
        <h2 className="lp-heading-2">{heading}</h2>
        <p className="lp-body mt-3">{intro}</p>
        <form className="lp-card mt-6 space-y-4 p-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Bedrijfsnaam *
              <input
                className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
                value={form.companyName}
                onChange={(e) => update({ companyName: e.target.value })}
                data-testid="ai-calc-company"
              />
            </label>
            <label className="block text-sm">
              Contactpersoon *
              <input
                className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
                value={form.contactPerson}
                onChange={(e) => update({ contactPerson: e.target.value })}
                data-testid="ai-calc-contact"
              />
            </label>
            <label className="block text-sm">
              E-mail *
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
                data-testid="ai-calc-email"
              />
            </label>
            <label className="block text-sm">
              Telefoon
              <input
                className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
                value={form.telephone}
                onChange={(e) => update({ telephone: e.target.value })}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              Website
              <input
                className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
                value={form.website}
                onChange={(e) => update({ website: e.target.value })}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              Korte omschrijving van de wens *
              <textarea
                className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
                rows={4}
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                data-testid="ai-calc-description"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              Eventueel gewenste planning
              <input
                className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
                value={form.desiredTimeline}
                onChange={(e) => update({ desiredTimeline: e.target.value })}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              Opmerkingen
              <textarea
                className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
                rows={3}
                value={form.remarks}
                onChange={(e) => update({ remarks: e.target.value })}
              />
            </label>
          </div>
          {error && (
            <p className="text-sm text-red-600" data-testid="ai-calculator-form-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="lp-btn-primary w-full sm:w-auto"
            disabled={submitting}
            data-testid="ai-calculator-submit"
          >
            {submitting ? "Versturen…" : submitButtonText}
          </button>
        </form>
      </div>
    </section>
  );
}
