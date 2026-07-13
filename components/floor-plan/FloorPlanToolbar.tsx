"use client";

import { useFloorPlanStore } from "@/lib/floor-plan-store";
import type { FloorPlanEditorMode } from "@/types/floor-plan";

const MODES: Array<{ id: FloorPlanEditorMode; label: string }> = [
  { id: "select", label: "Selecteren" },
  { id: "pan", label: "Pannen" },
];

export function FloorPlanToolbar() {
  const editorMode = useFloorPlanStore((state) => state.editorMode);
  const setEditorMode = useFloorPlanStore((state) => state.setEditorMode);
  const viewState = useFloorPlanStore((state) => state.viewState);
  const updateViewState = useFloorPlanStore((state) => state.updateViewState);
  const background = useFloorPlanStore((state) => state.background);

  const zoomPercent = Math.round(viewState.scale * 100);

  const zoomIn = () =>
    updateViewState({
      scale: Math.min(8, Number((viewState.scale * 1.2).toFixed(3))),
    });

  const zoomOut = () =>
    updateViewState({
      scale: Math.max(0.1, Number((viewState.scale / 1.2).toFixed(3))),
    });

  const fitToScreen = () => {
    updateViewState({ scale: 1, positionX: 40, positionY: 40 });
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => setEditorMode(mode.id)}
          className={
            editorMode === mode.id
              ? "btn-primary px-3 py-1.5 text-xs"
              : "btn-secondary px-3 py-1.5 text-xs"
          }
        >
          {mode.label}
        </button>
      ))}
      <span className="mx-1 hidden h-4 w-px bg-[var(--ls-gray-light)] sm:inline" />
      <button type="button" onClick={zoomOut} className="btn-secondary px-3 py-1.5 text-xs">
        Zoom uit
      </button>
      <button type="button" onClick={zoomIn} className="btn-secondary px-3 py-1.5 text-xs">
        Zoom in
      </button>
      <button
        type="button"
        onClick={fitToScreen}
        className="btn-secondary px-3 py-1.5 text-xs"
        disabled={!background}
      >
        Reset weergave
      </button>
      <span className="text-xs text-[var(--ls-gray)]">{zoomPercent}%</span>
    </div>
  );
}
