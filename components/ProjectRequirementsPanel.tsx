"use client";

import Image from "next/image";
import { useState } from "react";
import { formatEuroExVat } from "@/lib/format-currency";
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
      sizes="48px"
      onError={() => setFailed(true)}
    />
  );
}

interface ProjectRequirementsPanelProps {
  productList: MaterialListResult;
}

export function ProjectRequirementsPanel({ productList }: ProjectRequirementsPanelProps) {
  if (productList.items.length === 0) return null;

  return (
    <section className="ls-card p-5">
      <h2 className="ls-heading text-lg">Projectlijst benodigdheden</h2>
      <p className="mb-4 text-sm text-[var(--ls-navy-muted)]">
        Overzicht van alle onderdelen · prijzen excl. btw
      </p>

      <div className="ls-table-scroll">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[var(--ls-navy-muted)]">
              <th className="py-2 pr-3 font-medium">Artikel</th>
              <th className="py-2 pr-3 font-medium">Omschrijving</th>
              <th className="py-2 pr-3 text-right font-medium">Aantal</th>
              <th className="py-2 pr-3 text-right font-medium">Stuk excl.</th>
              <th className="py-2 text-right font-medium">Totaal excl.</th>
            </tr>
          </thead>
          <tbody>
            {productList.items.map((item) => (
              <tr key={item.sku} className="border-b border-slate-100">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="relative h-10 w-12 shrink-0 overflow-hidden rounded border border-slate-200 bg-white">
                      <ProductThumbnail src={item.image} alt={item.name} />
                    </div>
                    <span className="font-medium text-[var(--ls-navy)]">{item.sku}</span>
                  </div>
                </td>
                <td className="py-2 pr-3 text-[var(--ls-navy-muted)]">{item.name}</td>
                <td className="py-2 pr-3 text-right font-medium text-[var(--ls-navy)]">
                  {item.quantity}
                </td>
                <td className="py-2 pr-3 text-right text-[var(--ls-navy-muted)]">
                  {formatEuroExVat(item.unitPrice)}
                </td>
                <td className="py-2 text-right font-semibold text-[var(--ls-navy)]">
                  {formatEuroExVat(item.totalPrice)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="pt-4 text-right font-semibold text-[var(--ls-navy)]">
                Totaal excl. btw
              </td>
              <td className="pt-4 text-right text-lg font-bold text-[var(--ls-yellow)]">
                {formatEuroExVat(productList.subtotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
