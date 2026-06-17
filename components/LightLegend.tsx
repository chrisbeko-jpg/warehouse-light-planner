"use client";

function LegendItem({
  color,
  label,
  border,
}: {
  color: string;
  label: string;
  border?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--ls-gray)]">
      <span
        className="inline-block h-3 w-5 rounded-sm"
        style={{ backgroundColor: color, border: border ?? "none" }}
      />
      {label}
    </div>
  );
}

export function LightLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-[var(--ls-gray-light)] bg-[var(--ls-bg)] p-3">
      <LegendItem color="#F5C400" label="Geel = LED-module" border="1px solid #111111" />
      <LegendItem color="#E5E5E5" label="Grijs = blindplaat" border="1px solid #9CA3AF" />
      <LegendItem color="#2B2B2B" label="Donkergrijs = draagrail" />
      <span className="flex items-center gap-1 text-xs text-[var(--ls-gray)]">
        <span className="text-sm">⚡</span> Voedingsstuk 230V
      </span>
      <span className="flex items-center gap-1 text-xs text-[var(--ls-gray)]">
        <span className="inline-block h-3 w-1 bg-black" /> Zwart = eindstuk
      </span>
      <span className="flex items-center gap-1 text-xs text-[var(--ls-gray)]">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--ls-gray)]" /> Grijs =
        ophangpunt
      </span>
    </div>
  );
}
