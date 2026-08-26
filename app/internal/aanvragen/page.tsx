"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatMaterialPrice } from "@/lib/public-wizard/pricing";
import type { LeadStatus, PublicLeadRecord } from "@/types/public-wizard";

const STATUSES: LeadStatus[] = [
  "nieuw",
  "in_behandeling",
  "offerte_gemaakt",
  "verzonden",
  "gewonnen",
  "verloren",
];

function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/internal_admin_token=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export default function InternalLeadsPage() {
  const [leads, setLeads] = useState<PublicLeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    const token = getTokenFromCookie();
    if (!token) {
      setError("Geen token gevonden.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/internal/leads", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Kon aanvragen niet laden");
      const data = (await response.json()) as { leads: PublicLeadRecord[] };
      setLeads(data.leads);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Laden mislukt");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  const updateStatus = async (reference: string, status: LeadStatus) => {
    const token = getTokenFromCookie();
    if (!token) return;
    await fetch("/api/internal/leads", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reference, status }),
    });
    void fetchLeads();
  };

  const downloadPdf = async (reference: string) => {
    const token = getTokenFromCookie();
    if (!token) return;
    const response = await fetch("/api/internal/leads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reference, action: "download-pdf" }),
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reference}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Lichtplan aanvragen</h1>
        <Link href="/internal/content" className="text-sm font-medium text-[var(--lp-green-dark)] hover:underline">
          Contentbeheer →
        </Link>
      </div>
      {loading && <p>Laden…</p>}
      {error && <p className="text-red-600">{error}</p>}
      <div className="space-y-4">
        {leads.map((lead) => (
          <article key={lead.reference} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{lead.contact.companyName}</p>
                <p className="text-sm text-gray-500">
                  {lead.reference} · {new Date(lead.createdAt).toLocaleString("nl-NL")}
                </p>
                <p className="text-sm">
                  {lead.contact.contactPerson} · {lead.contact.email} · {lead.contact.telephone}
                </p>
                <p className="text-sm">
                  Indicatief: {lead.wizard.result.indicativeAverageLux} lux ·{" "}
                  {formatMaterialPrice(lead.wizard.price)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={lead.status}
                  onChange={(e) => void updateStatus(lead.reference, e.target.value as LeadStatus)}
                  className="rounded border px-2 py-1 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => void downloadPdf(lead.reference)}
                >
                  PDF downloaden
                </button>
              </div>
            </div>
            {(lead.lightPlanImageBase64 || lead.heatmapImageBase64 || lead.floorPlanDataUrl) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {lead.floorPlanDataUrl && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-gray-500">Originele plattegrond</p>
                    <img src={lead.floorPlanDataUrl} alt="Plattegrond" className="max-h-48 rounded border object-contain" />
                  </div>
                )}
                {lead.lightPlanImageBase64 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-gray-500">Lichtplan</p>
                    <img src={`data:image/png;base64,${lead.lightPlanImageBase64}`} alt="Lichtplan" className="max-h-48 rounded border object-contain" />
                  </div>
                )}
                {lead.heatmapImageBase64 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-gray-500">Light Indicator</p>
                    <img src={`data:image/png;base64,${lead.heatmapImageBase64}`} alt="Heatmap" className="max-h-48 rounded border object-contain" />
                  </div>
                )}
              </div>
            )}
            {(lead.wizard.price?.lines?.length ?? 0) > 0 && (
              <ul className="mt-3 text-sm text-gray-600">
                {lead.wizard.price.lines.map((line) => (
                  <li key={line.productId}>
                    {line.quantity} × {line.name} — €{line.subtotalEuro.toFixed(2)}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
        {!loading && leads.length === 0 && (
          <p className="text-sm text-gray-500">Nog geen aanvragen opgeslagen.</p>
        )}
      </div>
    </main>
  );
}
