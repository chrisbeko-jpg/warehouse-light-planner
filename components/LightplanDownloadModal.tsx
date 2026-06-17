"use client";

import { useState } from "react";
import { calculateLighting } from "@/lib/calculations";
import {
  buildPdfFilename,
  generateLightplanPdf,
} from "@/lib/pdf/generate-lightplan-pdf";
import { formatEuroExVat } from "@/lib/format-currency";
import { getFillModeLabel } from "@/lib/line-fill";
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

  const [email, setEmail] = useState("");
  const [projectName, setProjectName] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const netArea = calculateLighting({ length, width, height }, lux, rectangles).netArea;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!isValidEmail(email)) {
      setError("Vul een geldig e-mailadres in.");
      return;
    }
    if (!consent) {
      setError("Geef toestemming om je aanvraag te versturen.");
      return;
    }
    if (!lightLinePlan) {
      setError("Teken eerst lichtlijnen voordat je een lichtplan downloadt.");
      return;
    }

    setLoading(true);
    try {
      const planImageWithoutHeatmap = canvasExporter
        ? await canvasExporter({ withHeatmap: false })
        : null;
      const planImageWithHeatmap = canvasExporter
        ? await canvasExporter({ withHeatmap: true })
        : null;
      const pdfBlob = await generateLightplanPdf({
        email: email.trim(),
        projectName: projectName.trim() || undefined,
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

      const filename = buildPdfFilename(projectName.trim() || undefined);
      const pdfBase64 = await blobToBase64(pdfBlob);

      const response = await fetch("/api/send-lightplan-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          projectName: projectName.trim() || undefined,
          length,
          width,
          height,
          lux,
          lineFillMode: getFillModeLabel(lineFillMode),
          mountingSystem,
          totalExVat: lightLinePlan.productList.subtotal,
          materialLines: lightLinePlan.productList.export,
          pdfBase64,
          pdfFilename: filename,
        }),
      });

      const result = (await response.json()) as {
        ok: boolean;
        emailSent?: boolean;
        message?: string;
        error?: string;
      };

      if (!result.ok) {
        throw new Error(result.error ?? "Verzenden mislukt");
      }

      downloadBlob(pdfBlob, filename);

      if (result.emailSent) {
        setMessage("PDF gedownload. Aanvraag is verstuurd naar Lightsale en een kopie naar jouw e-mail.");
      } else {
        setMessage(
          result.message ??
            "PDF is gedownload, maar e-mail kon nog niet worden verstuurd omdat mailconfiguratie ontbreekt.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis bij het genereren van de PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="ls-heading text-lg">Ontvang je lichtplan</h2>
        <p className="mt-1 text-sm text-[var(--ls-navy-muted)]">
          Vul je gegevens in om het indicatieve lichtplan als PDF te downloaden.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-[var(--ls-navy)]">E-mailadres *</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="naam@bedrijf.nl"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-[var(--ls-navy)]">Projectnaam (optioneel)</span>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Magazijn Utrecht"
            />
          </label>

          <label className="flex items-start gap-2 text-sm text-[var(--ls-navy-muted)]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            Ik ga akkoord dat Lightsale mijn aanvraag ontvangt om contact op te nemen over dit
            lichtplan.
          </label>

          {lightLinePlan && (
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-[var(--ls-navy-muted)]">
              Totaal materialen: {formatEuroExVat(lightLinePlan.productList.subtotal)} excl. btw
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Annuleren
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={loading || !lightLinePlan}>
              {loading ? "Bezig…" : "Download PDF"}
            </button>
          </div>
        </form>
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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
