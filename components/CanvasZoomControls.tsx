"use client";

interface CanvasZoomControlsProps {
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
}

export function CanvasZoomControls({
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
}: CanvasZoomControlsProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <button type="button" onClick={onZoomOut} className="btn-secondary px-3 py-1.5 text-xs">
        Zoom uit
      </button>
      <button type="button" onClick={onZoomIn} className="btn-secondary px-3 py-1.5 text-xs">
        Zoom in
      </button>
      <button type="button" onClick={onFitToScreen} className="btn-secondary px-3 py-1.5 text-xs">
        Pas in scherm
      </button>
      <span className="text-xs text-[var(--ls-gray)]">{zoomPercent}%</span>
    </div>
  );
}
