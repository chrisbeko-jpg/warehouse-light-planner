"use client";

import { useWarehouseStore } from "@/lib/warehouse-store";
import type { LuxLevel, LineFillMode, MountingSystem } from "@/types";

const LUX_OPTIONS: LuxLevel[] = [150, 300, 500, 750];

const MOUNTING_OPTIONS: Array<{ value: MountingSystem; label: string }> = [
  { value: "staalkabel", label: "Staalkabel pendel" },
  { value: "montagebeugel", label: "Montagebeugel" },
];

const FILL_OPTIONS: Array<{ value: LineFillMode; label: string; description: string }> = [
  {
    value: "continuous",
    label: "Continu gevuld",
    description: "Alle posities LED-module. Dim indien nodig.",
  },
  {
    value: "alternating",
    label: "Om-en-om met blindplaten",
    description: "Afwisselend LED-module en blindplaat.",
  },
];

export function WarehouseForm() {
  const {
    length,
    width,
    height,
    lux,
    mountingSystem,
    includeEdgeZones,
    lineFillMode,
    setLength,
    setWidth,
    setHeight,
    setLux,
    setMountingSystem,
    setIncludeEdgeZones,
    setLineFillMode,
  } = useWarehouseStore();

  return (
    <section className="ls-card p-5">
      <h2 className="ls-heading mb-1 text-lg">Projectgegevens</h2>
      <p className="mb-4 text-sm text-[var(--ls-navy-muted)]">
        Bedrijfshal &amp; magazijn · indicatieve lichtberekening
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-[var(--ls-navy-muted)]">
          Lengte (m)
          <input
            type="number"
            min={1}
            step={0.5}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="rounded-lg border border-[var(--ls-gray-light)] px-3 py-2 text-[var(--ls-black)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--ls-navy-muted)]">
          Breedte (m)
          <input
            type="number"
            min={1}
            step={0.5}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="rounded-lg border border-[var(--ls-gray-light)] px-3 py-2 text-[var(--ls-black)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--ls-navy-muted)]">
          Hoogte (m)
          <input
            type="number"
            min={1}
            step={0.5}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="rounded-lg border border-[var(--ls-gray-light)] px-3 py-2 text-[var(--ls-black)]"
          />
        </label>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-semibold text-[var(--ls-navy)]">
          Gewenst lux-niveau
        </legend>
        <div className="flex flex-wrap gap-2">
          {LUX_OPTIONS.map((option) => (
            <label
              key={option}
              className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition-colors ${
                lux === option
                  ? "border-[var(--ls-yellow)] bg-[var(--ls-yellow-soft)] text-[var(--ls-black)]"
                  : "border-[var(--ls-gray-light)] bg-white text-[var(--ls-gray)] hover:bg-[var(--ls-bg)]"
              }`}
            >
              <input
                type="radio"
                name="lux"
                value={option}
                checked={lux === option}
                onChange={() => setLux(option)}
                className="sr-only"
              />
              {option} lux
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-semibold text-[var(--ls-navy)]">
          Ophangsysteem
        </legend>
        <div className="flex flex-wrap gap-2">
          {MOUNTING_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition-colors ${
                mountingSystem === option.value
                  ? "border-[var(--ls-yellow)] bg-[var(--ls-yellow-soft)] text-[var(--ls-black)]"
                  : "border-[var(--ls-gray-light)] bg-white text-[var(--ls-gray)] hover:bg-[var(--ls-bg)]"
              }`}
            >
              <input
                type="radio"
                name="mounting"
                value={option.value}
                checked={mountingSystem === option.value}
                onChange={() => setMountingSystem(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-semibold text-[var(--ls-navy)]">
          Lichtlijnvulling
        </legend>
        <div className="space-y-2">
          {FILL_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                lineFillMode === option.value
                  ? "border-[var(--ls-yellow)] bg-[var(--ls-yellow-soft)]"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="lineFill"
                value={option.value}
                checked={lineFillMode === option.value}
                onChange={() => setLineFillMode(option.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--ls-navy)]">
                  {option.label}
                </span>
                <span className="block text-xs text-[var(--ls-navy-muted)]">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-semibold text-[var(--ls-navy)]">Randzones</legend>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ls-navy-muted)]">
          <input
            type="checkbox"
            checked={includeEdgeZones}
            onChange={(e) => setIncludeEdgeZones(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Randzones meeverlichten
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Standaard uit: geen lichtlijnen tussen wand en eerste/laatste stelling.
        </p>
      </fieldset>
    </section>
  );
}
