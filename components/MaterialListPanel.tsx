"use client";

import Image from "next/image";
import { useState } from "react";
import { useWarehouseStore } from "@/lib/warehouse-store";
import { formatNumber } from "@/lib/calculations";
import { formatEuroExVat, VAT_RATE_LABEL } from "@/lib/format-currency";
import { getFillModeLabel } from "@/lib/line-fill";
import type { MaterialListResult } from "@/types";

function ProductThumbnail({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
        📦
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-contain p-1"
      sizes="64px"
      onError={() => setFailed(true)}
    />
  );
}

interface MaterialListPanelProps {
  productList: MaterialListResult;
}

export function MaterialListPanel({ productList }: MaterialListPanelProps) {
  const lineFillMode = useWarehouseStore((state) => state.lineFillMode);
  const [expanded, setExpanded] = useState(false);

  if (productList.items.length === 0) {
    return (
      <section className="ls-card p-5">
        <h2 className="ls-heading text-lg">Materiaallijst</h2>
        <p className="mt-2 text-sm text-[var(--ls-navy-muted)]">Geen producten om weer te geven.</p>
      </section>
    );
  }

  return (
    <section className="ls-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-start justify-between gap-3 p-5 text-left hover:bg-slate-50"
      >
        <div>
          <h2 className="ls-heading text-lg">Materiaallijst</h2>
          <p className="mt-1 text-xs text-[var(--ls-navy-muted)]">
            Alle prijzen excl. btw · {getFillModeLabel(lineFillMode)}
          </p>
        </div>
        <span className="shrink-0 text-sm font-medium text-[var(--ls-yellow)]">
          {expanded ? "Inklappen ▲" : "Details ▼"}
        </span>
      </button>

      <div className="border-t border-slate-100 px-5 pb-5">
        <dl className="grid gap-2 pt-4 text-sm sm:grid-cols-2">
          <SummaryRow
            label="Totaal excl. btw"
            value={formatEuroExVat(productList.subtotal)}
            highlight
          />
          <SummaryRow label="LED-modules" value={`${productList.totalLedModules} stuks`} />
          <SummaryRow label="Blindplaten" value={`${productList.totalBlankPlates} stuks`} />
          <SummaryRow
            label="Geïnstalleerd vermogen"
            value={`${formatNumber(productList.installedPowerW)}W`}
          />
          <SummaryRow
            label="Advies ingesteld vermogen"
            value={`${productList.advisedWattsPerModule}W per module`}
          />
          <SummaryRow
            label="Totaal vermogen volgens advies"
            value={`${formatNumber(productList.advisedTotalPowerW)}W`}
          />
          <SummaryRow label="Vulling" value={getFillModeLabel(lineFillMode)} />
        </dl>

        {expanded && (
          <div className="mt-5 space-y-3">
            {productList.items.map((item) => (
              <div
                key={item.sku}
                className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded border border-slate-200 bg-white">
                  <ProductThumbnail src={item.image} alt={item.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--ls-navy-muted)]">{item.sku}</p>
                  <p className="text-sm font-medium text-[var(--ls-navy)]">{item.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="text-[var(--ls-navy-muted)]">{item.quantity} stuks</span>
                    <span className="text-[var(--ls-navy-muted)]">
                      {formatEuroExVat(item.unitPrice)} / stuk excl.
                    </span>
                    <span className="font-semibold text-[var(--ls-navy)]">
                      {formatEuroExVat(item.totalPrice)} excl.
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
              <SummaryRow
                label="Totaal materialen excl. btw"
                value={formatEuroExVat(productList.subtotal)}
                highlight
              />
              <SummaryRow
                label={`Btw ${VAT_RATE_LABEL}`}
                value={formatEuroExVat(productList.vatAmount)}
              />
              <SummaryRow
                label="Totaal incl. btw"
                value={formatEuroExVat(productList.totalInclVat)}
                muted
              />
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={muted ? "text-slate-500" : "text-[var(--ls-navy-muted)]"}>{label}</dt>
      <dd
        className={
          highlight
            ? "font-bold text-[var(--ls-navy)]"
            : muted
              ? "text-sm text-slate-500"
              : "font-semibold text-[var(--ls-navy)]"
        }
      >
        {value}
      </dd>
    </div>
  );
}
