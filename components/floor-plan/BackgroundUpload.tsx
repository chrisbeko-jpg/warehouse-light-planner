"use client";

import { useRef } from "react";
import { BACKGROUND_ACCEPT, loadBackgroundFile } from "@/lib/load-background-image";
import { useFloorPlanStore } from "@/lib/floor-plan-store";

export function BackgroundUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const background = useFloorPlanStore((state) => state.background);
  const uploadError = useFloorPlanStore((state) => state.uploadError);
  const setBackground = useFloorPlanStore((state) => state.setBackground);
  const setUploadError = useFloorPlanStore((state) => state.setUploadError);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      setUploadError(null);
      const loaded = await loadBackgroundFile(file);
      setBackground(loaded);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Upload mislukt.",
      );
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[var(--ls-black)]">Achtergrond</h3>
      <p className="text-xs text-[var(--ls-gray)]">
        Upload een PDF, PNG of JPG als plattegrond.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={BACKGROUND_ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        className="btn-primary w-full text-sm"
        onClick={() => inputRef.current?.click()}
      >
        {background ? "Vervang achtergrond" : "Upload plattegrond"}
      </button>
      {background && (
        <p className="text-xs text-[var(--ls-gray)]">
          {background.fileName} · {background.width}×{background.height} px
        </p>
      )}
      {uploadError && (
        <p className="text-xs text-[var(--ls-danger)]">{uploadError}</p>
      )}
    </div>
  );
}
