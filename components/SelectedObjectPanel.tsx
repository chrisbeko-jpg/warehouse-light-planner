"use client";

import { useWarehouseStore } from "@/lib/warehouse-store";
import { getRectangleLabel } from "@/lib/canvas-scale";

export function SelectedObjectPanel() {
  const selectedRectangleId = useWarehouseStore((state) => state.selectedRectangleId);
  const rectangles = useWarehouseStore((state) => state.rectangles);
  const updateRectangle = useWarehouseStore((state) => state.updateRectangle);
  const removeRectangle = useWarehouseStore((state) => state.removeRectangle);

  const selected = rectangles.find((rect) => rect.id === selectedRectangleId);

  if (!selected) {
    return null;
  }

  const handleDimensionChange = (field: "width" | "height", value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    updateRectangle(selected.id, { [field]: parsed });
  };

  return (
    <div className="mt-4 rounded-lg border border-[var(--ls-gray-light)] bg-[var(--ls-bg)] p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--ls-black)]">
          Geselecteerd: {getRectangleLabel(selected)}
        </h3>
        <button
          type="button"
          onClick={() => removeRectangle(selected.id)}
          className="shrink-0 rounded-lg bg-[var(--ls-danger)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          Verwijderen
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-[var(--ls-gray)]">
          Lengte (m)
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={Number(selected.width.toFixed(2))}
            onChange={(e) => handleDimensionChange("width", e.target.value)}
            className="rounded-lg border border-[var(--ls-gray-light)] bg-white px-3 py-2 text-[var(--ls-black)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--ls-gray)]">
          Breedte (m)
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={Number(selected.height.toFixed(2))}
            onChange={(e) => handleDimensionChange("height", e.target.value)}
            className="rounded-lg border border-[var(--ls-gray-light)] bg-white px-3 py-2 text-[var(--ls-black)]"
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-[var(--ls-gray)]">
        Minimaal 0,1 m · Delete-toets verwijdert geselecteerd object.
      </p>
    </div>
  );
}
