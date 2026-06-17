"use client";

import { useState } from "react";
import { useWarehouseStore } from "@/lib/warehouse-store";
import { LightplanDownloadModal } from "@/components/LightplanDownloadModal";

export function CanvasToolbar() {
  const addRectangle = useWarehouseStore((state) => state.addRectangle);
  const generateLightLinesAuto = useWarehouseStore((state) => state.generateLightLinesAuto);
  const toggleHeatmap = useWarehouseStore((state) => state.toggleHeatmap);
  const toggleLightLineDrawMode = useWarehouseStore((state) => state.toggleLightLineDrawMode);
  const showHeatmap = useWarehouseStore((state) => state.showHeatmap);
  const lightLineDrawMode = useWarehouseStore((state) => state.lightLineDrawMode);
  const lightLinesGenerated = useWarehouseStore((state) => state.lightLinesGenerated);
  const lightLinePlan = useWarehouseStore((state) => state.lightLinePlan);

  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  return (
    <>
      <section className="ls-card flex flex-wrap gap-3 p-4">
        <button type="button" onClick={() => addRectangle("shelf")} className="btn-primary">
          Stelling toevoegen
        </button>
        <button
          type="button"
          onClick={toggleLightLineDrawMode}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            lightLineDrawMode ? "btn-dark" : "btn-primary"
          }`}
        >
          {lightLineDrawMode ? "Tekenen actief…" : "Lichtlijn tekenen"}
        </button>
        {lightLinePlan && (
          <button type="button" onClick={() => setPdfModalOpen(true)} className="btn-primary">
            Download lichtplan PDF
          </button>
        )}
        <button
          type="button"
          onClick={() => addRectangle("obstruction")}
          className="btn-secondary"
        >
          Obstructie toevoegen
        </button>
        <button
          type="button"
          onClick={generateLightLinesAuto}
          className="btn-secondary"
          title="Optioneel: automatische gangpaddetectie"
        >
          Automatisch genereren
        </button>
        {lightLinesGenerated && (
          <button
            type="button"
            onClick={toggleHeatmap}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              showHeatmap ? "btn-dark" : "btn-secondary"
            }`}
          >
            {showHeatmap ? "Heatmap uit" : "Heatmap aan"}
          </button>
        )}
        <p className="self-center text-sm text-[var(--ls-navy-muted)]">
          Teken lichtlijnen handmatig (raster 0,5 m). Berekeningen worden direct bijgewerkt.
        </p>
      </section>

      <LightplanDownloadModal open={pdfModalOpen} onClose={() => setPdfModalOpen(false)} />
    </>
  );
}
