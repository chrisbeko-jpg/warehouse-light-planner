"use client";

import Link from "next/link";
import { cmsFetch } from "@/lib/cms/admin-client";

export function PublishBar({
  previewHref,
  onSaved,
  onSave,
  onPublish,
}: {
  previewHref: string;
  onSaved?: (message: string) => void;
  onSave: () => Promise<void>;
  onPublish: () => Promise<void>;
}) {
  const revert = async () => {
    if (!window.confirm("Concept terugzetten naar laatst gepubliceerde versie?")) return;
    try {
      await cmsFetch("/api/internal/cms/revert", { method: "POST" });
      onSaved?.("Wijzigingen ongedaan gemaakt.");
      window.location.reload();
    } catch (err) {
      onSaved?.(err instanceof Error ? err.message : "Herstellen mislukt");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={previewHref} className="lp-btn-secondary" target="_blank">
        Voorbeeld bekijken
      </Link>
      <button type="button" className="lp-btn-secondary" onClick={() => void onSave()}>
        Opslaan als concept
      </button>
      <button type="button" className="lp-btn-primary" onClick={() => void onPublish()}>
        Publiceren
      </button>
      <button type="button" className="rounded border border-[var(--lp-border)] px-4 py-2 text-sm" onClick={() => void revert()}>
        Wijzigingen ongedaan maken
      </button>
    </div>
  );
}
