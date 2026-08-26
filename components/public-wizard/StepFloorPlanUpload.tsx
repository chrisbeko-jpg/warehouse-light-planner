"use client";

import { useRef, useState } from "react";
import { BACKGROUND_ACCEPT, loadBackgroundFile } from "@/lib/load-background-image";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardCard, WizardNav } from "@/components/public-wizard/WizardShell";

export function StepFloorPlanUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const backgroundDataUrl = usePublicWizardStore((s) => s.backgroundDataUrl);
  const backgroundFileName = usePublicWizardStore((s) => s.backgroundFileName);
  const setBackground = usePublicWizardStore((s) => s.setBackground);
  const nextStep = usePublicWizardStore((s) => s.nextStep);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploadError(null);
      const loaded = await loadBackgroundFile(file);
      setBackground(loaded.dataUrl, loaded.fileName, loaded.width, loaded.height);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload mislukt");
    }
  };

  return (
    <div>
      <h1 className="lp-heading-2 mb-2">Upload uw plattegrond</h1>
      <p className="lp-body mb-6">
        Upload een PDF, PNG of JPG. In de volgende stap kalibreert u de schaal en tekent u de ruimte.
      </p>

      <WizardCard className="space-y-4">
        <input ref={inputRef} type="file" accept={BACKGROUND_ACCEPT} className="hidden" onChange={handleUpload} />
        <button type="button" className="lp-btn-primary" onClick={() => inputRef.current?.click()}>
          {backgroundDataUrl ? "Vervang plattegrond" : "Kies bestand"}
        </button>
        {backgroundFileName && (
          <p className="text-sm text-[var(--lp-text-secondary)]">Geselecteerd: {backgroundFileName}</p>
        )}
        {backgroundDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundDataUrl}
            alt="Voorbeeld plattegrond"
            className="max-h-64 rounded-xl border border-[var(--lp-border)] object-contain"
          />
        )}
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
      </WizardCard>

      <WizardNav
        nextLabel="Plattegrond gebruiken"
        nextDisabled={!backgroundDataUrl}
        onNext={() => {
          if (backgroundDataUrl) nextStep();
        }}
      />
    </div>
  );
}
