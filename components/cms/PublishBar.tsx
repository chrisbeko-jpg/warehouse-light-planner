"use client";

import Link from "next/link";
import { useState } from "react";
import { cmsFetch } from "@/lib/cms/admin-client";

export function PublishBar({
  previewHref,
  onSaved,
  onSave,
  onPublish,
  saveLabel = "Opslaan als concept",
  publishLabel = "Publiceren",
  saveSuccessMessage = "Wijzigingen opgeslagen",
  publishSuccessMessage = "Gepubliceerd",
  saveDisabled = false,
}: {
  previewHref: string;
  onSaved?: (message: string, type?: "success" | "error") => void;
  onSave: () => Promise<void>;
  onPublish: () => Promise<void>;
  saveDisabled?: boolean;
  saveLabel?: string;
  publishLabel?: string;
  saveSuccessMessage?: string;
  publishSuccessMessage?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const revert = async () => {
    if (!window.confirm("Concept terugzetten naar laatst gepubliceerde versie?")) return;
    try {
      await cmsFetch("/api/internal/cms/revert", { method: "POST" });
      onSaved?.("Wijzigingen ongedaan gemaakt.", "success");
      window.location.reload();
    } catch (err) {
      onSaved?.(err instanceof Error ? err.message : "Herstellen mislukt", "error");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
      onSaved?.(saveSuccessMessage, "success");
    } catch (err) {
      onSaved?.(err instanceof Error ? err.message : "Opslaan is niet gelukt.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await onPublish();
      onSaved?.(publishSuccessMessage, "success");
    } catch (err) {
      onSaved?.(err instanceof Error ? err.message : "Publiceren is niet gelukt.", "error");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={previewHref} className="lp-btn-secondary" target="_blank">
        Voorbeeld bekijken
      </Link>
      <button
        type="button"
        className="lp-btn-secondary"
        disabled={saving || publishing || saveDisabled}
        onClick={() => void handleSave()}
      >
        {saving ? "Opslaan..." : saveLabel}
      </button>
      <button
        type="button"
        className="lp-btn-primary"
        disabled={saving || publishing}
        onClick={() => void handlePublish()}
      >
        {publishing ? "Publiceren..." : publishLabel}
      </button>
      <button
        type="button"
        className="rounded border border-[var(--lp-border)] px-4 py-2 text-sm"
        disabled={saving || publishing}
        onClick={() => void revert()}
      >
        Wijzigingen ongedaan maken
      </button>
    </div>
  );
}
