"use client";

import { formatAreaM2 } from "@/lib/polygon-area";
import { useFloorPlanStore } from "@/lib/floor-plan-store";

export function RoomListPanel() {
  const rooms = useFloorPlanStore((state) => state.rooms);
  const selectedRoomId = useFloorPlanStore((state) => state.selectedRoomId);
  const selectRoom = useFloorPlanStore((state) => state.selectRoom);
  const editorMode = useFloorPlanStore((state) => state.editorMode);
  const setEditorMode = useFloorPlanStore((state) => state.setEditorMode);
  const cancelPolygonDraft = useFloorPlanStore((state) => state.cancelPolygonDraft);
  const finishPolygonDraft = useFloorPlanStore((state) => state.finishPolygonDraft);
  const undoPolygonDraftPoint = useFloorPlanStore((state) => state.undoPolygonDraftPoint);
  const polygonDraft = useFloorPlanStore((state) => state.polygonDraft);
  const background = useFloorPlanStore((state) => state.background);

  const startDrawing = () => {
    cancelPolygonDraft();
    setEditorMode("drawRoom");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--ls-black)]">Ruimtes</h3>
        <span className="text-xs text-[var(--ls-gray)]">{rooms.length}</span>
      </div>
      <button
        type="button"
        className="btn-primary w-full text-sm"
        disabled={!background}
        onClick={startDrawing}
      >
        {editorMode === "drawRoom" ? "Tekenen actief…" : "Ruimte tekenen"}
      </button>
      {editorMode === "drawRoom" && (
        <div className="space-y-2 rounded-lg border border-[var(--ls-gray-light)] bg-[var(--ls-bg)] p-3">
          <p className="text-xs text-[var(--ls-gray)]">
            Klik punten op de plattegrond. Sluit de polygon door op het eerste punt te tikken
            of gebruik &lsquo;Sluit polygon&rsquo;.
          </p>
          <p className="text-xs font-medium text-[var(--ls-black)]">
            Punten: {polygonDraft.length}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary text-xs"
              onClick={() => finishPolygonDraft()}
              disabled={polygonDraft.length < 3}
            >
              Sluit polygon
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={undoPolygonDraftPoint}
              disabled={polygonDraft.length === 0}
            >
              Undo punt
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={cancelPolygonDraft}
            >
              Annuleer
            </button>
          </div>
        </div>
      )}
      <ul className="max-h-48 space-y-1 overflow-y-auto">
        {rooms.length === 0 && (
          <li className="text-xs text-[var(--ls-gray)]">Nog geen ruimtes getekend.</li>
        )}
        {rooms.map((room) => (
          <li key={room.id}>
            <button
              type="button"
              onClick={() => selectRoom(room.id)}
              className={`w-full rounded-md border px-2 py-2 text-left text-sm transition-colors ${
                selectedRoomId === room.id
                  ? "border-[var(--ls-yellow)] bg-[var(--ls-yellow-soft)]"
                  : "border-[var(--ls-gray-light)] bg-[var(--ls-white)] hover:bg-[var(--ls-bg)]"
              }`}
            >
              <span className="font-medium text-[var(--ls-black)]">{room.name}</span>
              <span className="mt-0.5 block text-xs text-[var(--ls-gray)]">
                {room.roomType} · {formatAreaM2(room.areaM2)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
