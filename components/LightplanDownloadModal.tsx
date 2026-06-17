"use client";

import { useState } from "react";
import { calculateLighting } from "@/lib/calculations";
import {
  buildPdfFilename,
  generateLightplanPdf,
} from "@/lib/pdf/generate-lightplan-pdf";
import { formatEuroExVat } from "@/lib/format-currency";
import { getFillModeLabel } from "@/lib/line-fill";
import {
  mountingSystemLabel,
  submitLightplanToWeb3Forms,
} from "@/lib/web3forms";
import { useWarehouseStore } from "@/lib/warehouse-store";

interface LightplanDownloadModalProps {
  open: boolean;
  onClose: () => void;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function LightplanDownloadModal({ open, onClose }: LightplanDownloadModalProps) {
  const length = useWarehouseStore((s) => s.length);
  const width = useWarehouseStore((s) => s.width);
  const height = useWarehouseStore((s) => s.height);
  const lux = useWarehouseStore((s) => s.lux);
  const lineFillMode = useWarehouseStore((s) => s.lineFillMode);
  const mountingSystem = useWarehouseStore((s) => s.mountingSystem);
  const rectangles = useWarehouseStore((s) => s.rectangles);
  const lightLinePlan = useWarehouseStore((s) => s.lightLinePlan);
  const canvasExporter = useWarehouseStore((s) => s.canvasExporter);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const netArea = calculateLighting({ length, width, height }, lux, rectangles).netArea;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!name.trim()) {
      setError("Vul je naam in.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Vul een geldig e-mailadres in.");
      return;
    }
    if (!phone.trim()) {
      setError("Vul je telefoonnummer in.");
      return;
    }
    if (!lightLinePlan) {
      setError("Teken eerst lichtlijnen voordat je een lichtplan downloadt.");
      return;
    }

    setLoading(true);
    try {
      const { summary, lines, productList } = lightLinePlan;

      await submitLightplanToWeb3Forms(
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          company: company.trim() || undefined,
        },
        {
          length,
          width,
          height,
          lux,
          lineFillModeLabel: getFillModeLabel(lineFillMode),
          mountingSystemLabel: mountingSystemLabel(mountingSystem),
          netArea,
          lightLinesCount: lines.length,
          totalModules: summary.totalModules,
          blankPlates: summary.blankPlates,
          installedPowerW: summary.installedPowerW,
          advisedWattsPerModule: summary.advisedWattsPerModule,
          advisedTotalPowerW: summary.advisedTotalPowerW,
          expectedLuxAfterDimming: summary.expectedLuxAfterDimming,
          targetLux: summary.targetLux,
          totalExVat: productList.subtotal,
          materialLines: productList.export,
        },
      );

      const planImageWithoutHeatmap = canvasExporter
        ? await canvasExporter({ withHeatmap: false })
        : null;
      const planImageWithHeatmap = canvasExporter
        ? await canvasExporter({ withHeatmap: true })
        : null;

      const projectLabel = company.trim() || undefined;
      const pdfBlob = await generateLightplanPdf({
        email: email.trim(),
        projectName: projectLabel,
        length,
        width,
        height,
        lux,
        lineFillMode,
        mountingSystem,
        netArea,
        plan: lightLinePlan,
        planImageWithoutHeatmap,
        planImageWithHeatmap,
      });

      const filename = buildPdfFilename(projectLabel);
      downloadBlob(pdfBlob, filename);

      setMessage(
        "Bedankt voor je aanvraag! Je lichtplan is gedownload. We nemen zo snel mogelijk contact met je op.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis bij het versturen van je aanvraag.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl sm:p-6">
        <h2 className="ls-heading text-lg">Ontvang je lichtplan</h2>
        <p className="mt-1 text-sm text-[var(--ls-gray)]">
          Vul je gegevens in. Na verzending download je het indicatieve lichtplan als PDF.
        </p>

        {message ? (
          <div className="mt-4 space-y-4">
            <p className="rounded-lg border border-green-200 bg-[var(--ls-success-soft)] p-4 text-sm text-green-800">
              {message}
            </p>
            <button type="button" onClick={onClose} className="btn-primary w-full">
              Sluiten
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-[var(--ls-black)]">Naam *</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--ls-gray-light)] px-3 py-2"
                placeholder="Jan Jansen"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-[var(--ls-black)]">E-mailadres *</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--ls-gray-light)] px-3 py-2"
                placeholder="naam@bedrijf.nl"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-[var(--ls-black)]">Telefoonnummer *</span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--ls-gray-light)] px-3 py-2"
                placeholder="06 12345678"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-[var(--ls-black)]">Bedrijfsnaam (optioneel)</span>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--ls-gray-light)] px-3 py-2"
                placeholder="Bedrijf B.V."
              />
            </label>

            {lightLinePlan && (
              <p className="rounded-lg bg-[var(--ls-bg)] p-3 text-xs text-[var(--ls-gray)]">
                Totaal materialen: {formatEuroExVat(lightLinePlan.productList.subtotal)} excl. btw
              </p>
            )}

            {error && <p className="text-sm text-[var(--ls-danger)]">{error}</p>}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary w-full sm:flex-1"
                disabled={loading}
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="btn-primary w-full sm:flex-1"
                disabled={loading || !lightLinePlan}
              >
                {loading ? "Bezig…" : "Versturen & download PDF"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
