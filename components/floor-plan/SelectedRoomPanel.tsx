"use client";

import { CEILING_TYPES, ROOM_TYPES } from "@/types/floor-plan";
import { formatAreaM2 } from "@/lib/polygon-area";
import { useFloorPlanStore } from "@/lib/floor-plan-store";

export function SelectedRoomPanel() {
  const rooms = useFloorPlanStore((state) => state.rooms);
  const selectedRoomId = useFloorPlanStore((state) => state.selectedRoomId);
  const updateRoom = useFloorPlanStore((state) => state.updateRoom);
  const deleteRoom = useFloorPlanStore((state) => state.deleteRoom);

  const room = rooms.find((entry) => entry.id === selectedRoomId);
  if (!room) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--ls-gray-light)] p-3">
        <p className="text-xs text-[var(--ls-gray)]">
          Selecteer een ruimte om naam, type en plafondgegevens te bewerken.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--ls-gray-light)] bg-[var(--ls-white)] p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--ls-black)]">Geselecteerde ruimte</h3>
        <button
          type="button"
          className="text-xs font-medium text-[var(--ls-danger)]"
          onClick={() => deleteRoom(room.id)}
        >
          Verwijder
        </button>
      </div>
      <p className="text-xs text-[var(--ls-gray)]">
        Oppervlakte: <strong>{formatAreaM2(room.areaM2)}</strong>
      </p>
      <label className="block text-xs font-medium text-[var(--ls-black)]">
        Naam
        <input
          type="text"
          value={room.name}
          onChange={(event) => updateRoom(room.id, { name: event.target.value })}
          className="mt-1 w-full rounded-md border border-[var(--ls-gray-light)] px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block text-xs font-medium text-[var(--ls-black)]">
        Ruimtetype
        <select
          value={room.roomType}
          onChange={(event) =>
            updateRoom(room.id, {
              roomType: event.target.value as typeof room.roomType,
            })
          }
          className="mt-1 w-full rounded-md border border-[var(--ls-gray-light)] px-2 py-1.5 text-sm"
        >
          {ROOM_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-[var(--ls-black)]">
        Plafondhoogte (m)
        <input
          type="number"
          min={1}
          step={0.1}
          value={room.ceilingHeight}
          onChange={(event) =>
            updateRoom(room.id, {
              ceilingHeight: Number.parseFloat(event.target.value) || 0,
            })
          }
          className="mt-1 w-full rounded-md border border-[var(--ls-gray-light)] px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block text-xs font-medium text-[var(--ls-black)]">
        Plafondtype
        <select
          value={room.ceilingType}
          onChange={(event) =>
            updateRoom(room.id, {
              ceilingType: event.target.value as typeof room.ceilingType,
            })
          }
          className="mt-1 w-full rounded-md border border-[var(--ls-gray-light)] px-2 py-1.5 text-sm"
        >
          {CEILING_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-[var(--ls-black)]">
        Doellux (lx)
        <input
          type="number"
          min={50}
          step={50}
          value={room.targetLux}
          onChange={(event) =>
            updateRoom(room.id, {
              targetLux: Number.parseInt(event.target.value, 10) || 0,
            })
          }
          className="mt-1 w-full rounded-md border border-[var(--ls-gray-light)] px-2 py-1.5 text-sm"
        />
      </label>
    </div>
  );
}
