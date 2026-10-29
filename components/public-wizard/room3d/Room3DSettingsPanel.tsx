"use client";

import { usePublicWizardStore } from "@/lib/public-wizard/store";
import type { Room3DFloorType } from "@/types/public-wizard";

const FLOOR_PRESETS: Array<{ type: Room3DFloorType; label: string; color: string }> = [
  { type: "gray", label: "Standaard grijs", color: "#A3A3A3" },
  { type: "parquet", label: "Parket", color: "#c9a66b" },
  { type: "resin", label: "Gietvloer", color: "#d4d4d4" },
  { type: "custom", label: "Eigen kleur", color: "#94a3b8" },
];

export function Room3DSettingsPanel({ wallCount }: { wallCount: number }) {
  const room3D = usePublicWizardStore((s) => s.room3D);
  const patchRoom3D = usePublicWizardStore((s) => s.patchRoom3D);
  const setRoom3DFloor = usePublicWizardStore((s) => s.setRoom3DFloor);
  const addRoom3DWindow = usePublicWizardStore((s) => s.addRoom3DWindow);
  const updateRoom3DWindow = usePublicWizardStore((s) => s.updateRoom3DWindow);
  const removeRoom3DWindow = usePublicWizardStore((s) => s.removeRoom3DWindow);

  return (
    <div className="space-y-4 text-xs">
      <div>
        <p className="mb-1 font-semibold">Plafond tonen</p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={room3D.showCeiling}
            onChange={(e) => patchRoom3D({ showCeiling: e.target.checked })}
          />
          {room3D.showCeiling ? "Aan" : "Uit"}
        </label>
      </div>

      <div>
        <p className="mb-1 font-semibold">Vloer</p>
        <div className="flex flex-col gap-1">
          {FLOOR_PRESETS.map((preset) => (
            <button
              key={preset.type}
              type="button"
              className={`rounded border px-2 py-1 text-left ${
                room3D.floor.type === preset.type ? "border-[var(--lp-primary)]" : "border-[var(--lp-border)]"
              }`}
              onClick={() => setRoom3DFloor({ type: preset.type, color: preset.color })}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {(room3D.floor.type === "custom" || room3D.floor.type === "resin") && (
          <label className="mt-2 flex items-center gap-2">
            Kleur
            <input
              type="color"
              value={room3D.floor.color}
              onChange={(e) => setRoom3DFloor({ color: e.target.value })}
            />
          </label>
        )}
      </div>

      <div>
        <p className="mb-1 font-semibold">Daglicht (visueel)</p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={room3D.dayLightEnabled}
            onChange={(e) => patchRoom3D({ dayLightEnabled: e.target.checked })}
          />
          Extra daglichtindruk
        </label>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <p className="font-semibold">Ramen</p>
          <button type="button" className="text-[var(--lp-primary)]" onClick={() => addRoom3DWindow()}>
            + Raam
          </button>
        </div>
        {room3D.windows.length === 0 && (
          <p className="text-[var(--lp-text-secondary)]">Nog geen ramen. Kunstlichtberekening blijft ongewijzigd.</p>
        )}
        {room3D.windows.map((win) => (
          <div key={win.id} className="mb-2 rounded border border-[var(--lp-border)] p-2">
            <label className="mb-1 block">
              Wand
              <select
                className="mt-0.5 w-full rounded border px-1 py-0.5"
                value={win.wallIndex}
                onChange={(e) =>
                  updateRoom3DWindow(win.id, { wallIndex: Number(e.target.value) })
                }
              >
                {Array.from({ length: wallCount }, (_, i) => (
                  <option key={i} value={i}>
                    Wand {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-1 block">
              Positie langs wand (m)
              <input
                type="number"
                step="0.1"
                min={0}
                className="mt-0.5 w-full rounded border px-1 py-0.5"
                value={win.offsetAlongWallM}
                onChange={(e) =>
                  updateRoom3DWindow(win.id, { offsetAlongWallM: Number(e.target.value) })
                }
              />
            </label>
            <label className="mb-1 block">
              Breedte (m)
              <input
                type="number"
                step="0.1"
                min={0.4}
                className="mt-0.5 w-full rounded border px-1 py-0.5"
                value={win.widthM}
                onChange={(e) => updateRoom3DWindow(win.id, { widthM: Number(e.target.value) })}
              />
            </label>
            <label className="mb-1 block">
              Hoogte (m)
              <input
                type="number"
                step="0.1"
                min={0.4}
                className="mt-0.5 w-full rounded border px-1 py-0.5"
                value={win.heightM}
                onChange={(e) => updateRoom3DWindow(win.id, { heightM: Number(e.target.value) })}
              />
            </label>
            <label className="mb-1 block">
              Borstwering (m)
              <input
                type="number"
                step="0.1"
                min={0}
                className="mt-0.5 w-full rounded border px-1 py-0.5"
                value={win.sillHeightM}
                onChange={(e) =>
                  updateRoom3DWindow(win.id, { sillHeightM: Number(e.target.value) })
                }
              />
            </label>
            <button
              type="button"
              className="text-red-600"
              onClick={() => removeRoom3DWindow(win.id)}
            >
              Verwijderen
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
