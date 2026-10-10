"use client";

import { useCallback, useEffect, useState } from "react";
import type { CmsSiteContent, CmsWizardContent, WizardProductCms } from "@/types/cms";
import { PublishBar } from "@/components/cms/PublishBar";
import { cmsFetch } from "@/lib/cms/admin-client";
import { PUBLIC_PRODUCT_BY_ID, isPublicProductId } from "@/lib/public-wizard/products";

export function ProductCatalogEditor() {
  const [wizard, setWizard] = useState<CmsWizardContent | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await cmsFetch<{ site: CmsSiteContent }>("/api/internal/cms?draft=1");
    setWizard(data.site.wizard);
    setDraftUpdatedAt(data.site.draftUpdatedAt ?? null);
    setPublishedAt(data.site.publishedAt ?? null);
  }, []);

  useEffect(() => {
    void load().catch((err) => {
      setMessage(err instanceof Error ? err.message : "Laden mislukt.");
      setMessageType("error");
    });
  }, [load]);

  const updateProduct = (index: number, patch: Partial<WizardProductCms>) => {
    if (!wizard) return;
    const products = wizard.products.map((product, productIndex) =>
      productIndex === index ? { ...product, ...patch } : product,
    );
    setWizard({ ...wizard, products });
  };

  const save = async () => {
    if (!wizard) throw new Error("Geen productgegevens geladen.");
    const data = await cmsFetch<{ site: CmsSiteContent; draftUpdatedAt?: string }>("/api/internal/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wizard }),
    });
    setWizard(data.site.wizard);
    setDraftUpdatedAt(data.draftUpdatedAt ?? data.site.draftUpdatedAt ?? null);
  };

  const publish = async () => {
    await save();
    const data = await cmsFetch<{ site: CmsSiteContent; publishedAt?: string | null }>(
      "/api/internal/cms/publish",
      { method: "POST" },
    );
    setWizard(data.site.wizard);
    setPublishedAt(data.publishedAt ?? data.site.publishedAt ?? null);
    setDraftUpdatedAt(data.site.draftUpdatedAt ?? null);
  };

  if (!wizard) return <p>Laden…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">AI Lichtadvies – Producten</h2>
          <p className="max-w-2xl text-sm text-[var(--lp-text-secondary)]">
            Prijzen, lumen, vermogen, bundelhoek en afmetingen. Een gepubliceerde wijziging is leidend in de
            configurator, de resultatenaanduiding en de offerteaanvraag.
          </p>
        </div>
        <PublishBar
          previewHref="/lichtadvies"
          onSave={save}
          onPublish={publish}
          publishSuccessMessage="Productgegevens gepubliceerd"
          onSaved={(text, type) => {
            setMessage(text);
            setMessageType(type ?? "success");
          }}
        />
      </div>
      <p className="text-xs text-[var(--lp-text-secondary)]">
        Laatst opgeslagen: {draftUpdatedAt ? new Date(draftUpdatedAt).toLocaleString("nl-NL") : "—"}
        {" · "}
        Laatst gepubliceerd: {publishedAt ? new Date(publishedAt).toLocaleString("nl-NL") : "—"}
      </p>
      {message && (
        <p
          className={`rounded-lg p-3 text-sm ${
            messageType === "error" ? "border border-red-200 bg-red-50 text-red-700" : "bg-[var(--lp-green-soft)]"
          }`}
        >
          {message}
        </p>
      )}
      <div className="space-y-4">
        {wizard.products.map((product, index) => {
          const note = isPublicProductId(product.id) ? PUBLIC_PRODUCT_BY_ID[product.id].photometryNote : undefined;
          const confirmed = isPublicProductId(product.id)
            ? PUBLIC_PRODUCT_BY_ID[product.id].photometryConfirmed
            : true;
          return (
            <article key={product.id} className="lp-card space-y-3 p-4" data-testid={`product-catalog-${product.id}`}>
              <div>
                <h3 className="font-bold">{product.name}</h3>
                <p className="text-xs text-[var(--lp-text-secondary)]">{product.id}</p>
              </div>
              {!confirmed && note && (
                <p className="rounded-lg bg-orange-50 p-2 text-xs text-orange-900">{note}</p>
              )}
              <label className="block text-sm">
                Naam
                <input
                  className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
                  value={product.name}
                  onChange={(event) => updateProduct(index, { name: event.target.value })}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <NumberField
                  label="Prijs excl. btw (€)"
                  value={product.unitPriceEuro}
                  step="0.01"
                  onChange={(unitPriceEuro) => updateProduct(index, { unitPriceEuro })}
                />
                <NumberField
                  label="Lumen"
                  value={product.lumens}
                  step="1"
                  onChange={(lumens) => updateProduct(index, { lumens })}
                />
                <NumberField
                  label="Vermogen (W)"
                  value={product.watts}
                  step="0.1"
                  onChange={(watts) => updateProduct(index, { watts })}
                />
                <NumberField
                  label="Bundelhoek (°)"
                  value={product.beamAngleDeg}
                  step="1"
                  onChange={(beamAngleDeg) => updateProduct(index, { beamAngleDeg })}
                />
                <NumberField
                  label="Breedte (m)"
                  value={product.widthM}
                  step="0.001"
                  onChange={(widthM) => updateProduct(index, { widthM })}
                />
                <NumberField
                  label="Lengte (m)"
                  value={product.heightM}
                  step="0.001"
                  onChange={(heightM) => updateProduct(index, { heightM })}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        type="number"
        step={step}
        className="mt-1 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
