"use client";

import type { CmsImageRecord } from "@/types/cms";
import { imagePublicUrl } from "@/lib/cms/image-url";

export function ImageSelect({
  images,
  value,
  onChange,
  label = "Afbeelding",
}: {
  images: Record<string, CmsImageRecord>;
  value?: string;
  onChange: (id: string | undefined) => void;
  label?: string;
}) {
  const selected = value ? images[value] : null;
  return (
    <label className="block text-sm">
      {label}
      <select
        className="mt-1 w-full rounded border border-[var(--lp-border)] px-3 py-2"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">Geen afbeelding</option>
        {Object.values(images).map((img) => (
          <option key={img.id} value={img.id}>
            {img.title ?? img.filename} — {img.alt}
          </option>
        ))}
      </select>
      {selected && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imagePublicUrl(selected.id)}
          alt={selected.alt}
          className="mt-2 h-24 w-auto rounded-lg border border-[var(--lp-border)] object-cover"
        />
      )}
    </label>
  );
}
