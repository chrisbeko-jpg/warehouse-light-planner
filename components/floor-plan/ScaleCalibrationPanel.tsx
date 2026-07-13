"use client";

import { formatScaleLabel } from "@/lib/floor-plan-scale";
import { useFloorPlanStore } from "@/lib/floor-plan-store";

export function ScaleCalibrationPanel() {
  const editorMode = useFloorPlanStore((state) => state.editorMode);
  const setEditorMode = useFloorPlanStore((state) => state.setEditorMode);
  const calibrationDraft = useFloorPlanStore((state) => state.calibrationDraft);
  const calibrationDistanceMm = useFloorPlanStore((state) => state.calibrationDistanceMm);
  const setCalibrationDistanceMm = useFloorPlanStore(
    (state) => state.setCalibrationDistanceMm,
  );
  const resetCalibrationDraft = useFloorPlanStore(
    (state) => state.resetCalibrationDraft,
  );
  const applyCalibration = useFloorPlanStore((state) => state.applyCalibration);
  const pixelsPerMeter = useFloorPlanStore((state) => state.pixelsPerMeter);
  const background = useFloorPlanStore((state) => state.background);

  const startCalibration = () => {
    resetCalibrationDraft();
    setEditorMode("calibrate");
  };

  const handleApply = () => {
    const success = applyCalibration();
    if (!success) {
      window.alert("Vul twee punten en een geldige afstand in millimeters in.");
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[var(--ls-black)]">Schaal</h3>
      <p className="text-xs text-[var(--ls-gray)]">
        Selecteer twee punten op een bekende afstand en voer de werkelijke lengte in mm in.
      </p>
      <p className="text-xs font-medium text-[var(--ls-black)]">
        {formatScaleLabel(pixelsPerMeter)}
      </p>
      <button
        type="button"
        className="btn-secondary w-full text-sm"
        disabled={!background}
        onClick={startCalibration}
      >
        {editorMode === "calibrate" ? "Kalibratie actief…" : "Schaal instellen"}
      </button>
      {editorMode === "calibrate" && (
        <div className="space-y-2 rounded-lg border border-[var(--ls-gray-light)] bg-[var(--ls-bg)] p-3">
          <p className="text-xs text-[var(--ls-gray)]">
            Punten gekozen: {calibrationDraft.length}/2
          </p>
          <label className="block text-xs font-medium text-[var(--ls-black)]">
            Werkelijke afstand (mm)
            <input
              type="number"
              min={1}
              step={1}
              value={calibrationDistanceMm}
              onChange={(event) => setCalibrationDistanceMm(event.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--ls-gray-light)] px-2 py-1.5 text-sm"
              placeholder="bijv. 5000"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary flex-1 text-xs"
              onClick={handleApply}
            >
              Toepassen
            </button>
            <button
              type="button"
              className="btn-secondary flex-1 text-xs"
              onClick={() => {
                resetCalibrationDraft();
                setEditorMode("select");
              }}
            >
              Annuleer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
