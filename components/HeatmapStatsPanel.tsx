"use client";

import { HEATMAP_DISCLAIMER, luxToHeatmapHex } from "@/lib/heatmap-engine";
import type { HeatmapStats } from "@/types";

const LEGEND_ITEMS = [
  { ratio: 0.3, label: "Lowspot" },
  { ratio: 0.65, label: "Lager lichtniveau" },
  { ratio: 0.9, label: "Rond gewenst niveau" },
  { ratio: 1.1, label: "Boven gewenst niveau" },
  { ratio: 1.35, label: "Hotspot" },
  { ratio: 1.7, label: "Veel licht" },
];

interface HeatmapStatsPanelProps {
  heatmap: HeatmapStats;
  targetLux: number;
}

export function HeatmapStatsPanel({ heatmap, targetLux }: HeatmapStatsPanelProps) {
  return (
    <div className="mt-3 space-y-3 rounded-lg border border-[var(--ls-gray-light)] bg-white p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-[var(--ls-gray)]">
            <span
              className="inline-block h-3 w-5 rounded-sm border border-[var(--ls-gray-light)]"
              style={{
                backgroundColor: luxToHeatmapHex(item.ratio * targetLux, targetLux),
              }}
            />
            {item.label}
          </div>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <Stat label="Min. lux" value={`${Math.round(heatmap.minLux)} lux`} />
        <Stat label="Gemiddelde lux" value={`${Math.round(heatmap.averageLux)} lux`} />
        <Stat label="Max. lux" value={`${Math.round(heatmap.maxLux)} lux`} />
        <Stat label="Uniformiteit min/gem." value={heatmap.uniformity.toFixed(2)} />
        <Stat label="Gewenst niveau" value={`${targetLux} lux`} />
      </dl>

      <p className="text-xs italic text-[var(--ls-gray)]">{HEATMAP_DISCLAIMER}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--ls-gray)]">{label}</dt>
      <dd className="font-semibold text-[var(--ls-black)]">{value}</dd>
    </div>
  );
}
