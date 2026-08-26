"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CmsSiteContent, CmsWizardContent, WizardAtmosphereChoiceCms, WizardRoomChoiceCms } from "@/types/cms";
import { PublishBar } from "@/components/cms/PublishBar";
import { ImageSelect } from "@/components/cms/ImageSelect";
import { cmsFetch } from "@/lib/cms/admin-client";

export function WizardRoomsEditor() {
  return <WizardEditor mode="rooms" previewHref="/internal/preview/wizard-rooms" />;
}

export function WizardAtmospheresEditor() {
  return <WizardEditor mode="atmospheres" previewHref="/lichtadvies" />;
}

function WizardEditor({ mode, previewHref }: { mode: "rooms" | "atmospheres"; previewHref: string }) {
  const [wizard, setWizard] = useState<CmsWizardContent | null>(null);
  const [images, setImages] = useState<CmsSiteContent["images"]>({});
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await cmsFetch<{ site: CmsSiteContent }>("/api/internal/cms?draft=1");
    setWizard(data.site.wizard);
    setImages(data.site.images);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!wizard) return;
    await cmsFetch("/api/internal/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wizard }),
    });
    setMessage("Concept opgeslagen.");
  };

  const publish = async () => {
    await save();
    await cmsFetch("/api/internal/cms/publish", { method: "POST" });
    setMessage("Gepubliceerd.");
  };

  if (!wizard) return <p>Laden…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">
            {mode === "rooms" ? "AI Lichtadvies – Ruimtes" : "AI Lichtadvies – Sferen"}
          </h2>
          <p className="text-sm text-[var(--lp-text-secondary)]">
            Technische IDs blijven stabiel bij titel- of afbeeldingswijzigingen.
          </p>
        </div>
        <PublishBar previewHref={previewHref} onSave={save} onPublish={publish} onSaved={setMessage} />
      </div>

      {message && <p className="rounded-lg bg-[var(--lp-green-soft)] p-3 text-sm">{message}</p>}

      {mode === "rooms" &&
        wizard.roomChoices.map((choice, index) => (
          <RoomChoiceForm
            key={choice.id}
            choice={choice}
            images={images}
            onChange={(next) => {
              const roomChoices = [...wizard.roomChoices];
              roomChoices[index] = next;
              setWizard({ ...wizard, roomChoices });
            }}
          />
        ))}

      {mode === "atmospheres" &&
        wizard.atmosphereChoices.map((choice, index) => (
          <AtmosphereChoiceForm
            key={choice.id}
            choice={choice}
            images={images}
            onChange={(next) => {
              const atmosphereChoices = [...wizard.atmosphereChoices];
              atmosphereChoices[index] = next;
              setWizard({ ...wizard, atmosphereChoices });
            }}
          />
        ))}

      {mode === "atmospheres" && (
        <p className="text-sm text-[var(--lp-text-secondary)]">
          Preview sfeerkeuzes op de live wizard:{" "}
          <Link href="/lichtadvies" className="lp-link" target="_blank">
            /lichtadvies
          </Link>
        </p>
      )}
    </div>
  );
}

function RoomChoiceForm({
  choice,
  images,
  onChange,
}: {
  choice: WizardRoomChoiceCms;
  images: CmsSiteContent["images"];
  onChange: (choice: WizardRoomChoiceCms) => void;
}) {
  return (
    <article className="lp-card space-y-3 p-4">
      <p className="text-xs font-semibold text-[var(--lp-text-secondary)]">ID: {choice.id}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">Titel<input className="mt-1 w-full rounded border px-2 py-1" value={choice.title} onChange={(e) => onChange({ ...choice, title: e.target.value })} /></label>
        <label className="text-sm">Voorgestelde lux<input type="number" className="mt-1 w-full rounded border px-2 py-1" value={choice.suggestedLux} onChange={(e) => onChange({ ...choice, suggestedLux: Number(e.target.value) })} /></label>
        <label className="text-sm md:col-span-2">Omschrijving<textarea className="mt-1 w-full rounded border px-2 py-1" rows={2} value={choice.description} onChange={(e) => onChange({ ...choice, description: e.target.value })} /></label>
        <ImageSelect images={images} value={choice.imageId} onChange={(imageId) => onChange({ ...choice, imageId })} />
        <label className="text-sm">Alt-tekst<input className="mt-1 w-full rounded border px-2 py-1" value={choice.imageAlt} onChange={(e) => onChange({ ...choice, imageAlt: e.target.value })} /></label>
        <label className="text-sm">Sortering<input type="number" className="mt-1 w-full rounded border px-2 py-1" value={choice.sortOrder} onChange={(e) => onChange({ ...choice, sortOrder: Number(e.target.value) })} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={choice.active} onChange={(e) => onChange({ ...choice, active: e.target.checked })} />Actief</label>
      </div>
    </article>
  );
}

function AtmosphereChoiceForm({
  choice,
  images,
  onChange,
}: {
  choice: WizardAtmosphereChoiceCms;
  images: CmsSiteContent["images"];
  onChange: (choice: WizardAtmosphereChoiceCms) => void;
}) {
  const isPremium = choice.id === "premium_architectural";
  return (
    <article className="lp-card space-y-3 p-4">
      <p className="text-xs font-semibold text-[var(--lp-text-secondary)]">ID: {choice.id}</p>
      {isPremium && (
        <p className="rounded bg-[var(--lp-bg-secondary)] p-2 text-xs">
          Premium-teaser: zichtbaar op de site, maar niet selecteerbaar zolang &quot;Ingeschakeld&quot; uit staat.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">Titel<input className="mt-1 w-full rounded border px-2 py-1" value={choice.title} onChange={(e) => onChange({ ...choice, title: e.target.value })} /></label>
        <label className="text-sm">Subtitel<input className="mt-1 w-full rounded border px-2 py-1" value={choice.subtitle} onChange={(e) => onChange({ ...choice, subtitle: e.target.value })} /></label>
        <label className="text-sm md:col-span-2">Beschrijving<textarea className="mt-1 w-full rounded border px-2 py-1" rows={2} value={choice.description} onChange={(e) => onChange({ ...choice, description: e.target.value })} /></label>
        <ImageSelect images={images} value={choice.imageId} onChange={(imageId) => onChange({ ...choice, imageId })} />
        <label className="text-sm">Alt-tekst<input className="mt-1 w-full rounded border px-2 py-1" value={choice.imageAlt} onChange={(e) => onChange({ ...choice, imageAlt: e.target.value })} /></label>
        {isPremium && (
          <label className="text-sm md:col-span-2">Badge tekst<input className="mt-1 w-full rounded border px-2 py-1" value={choice.badgeText ?? "ONLY PREMIUM"} onChange={(e) => onChange({ ...choice, badgeText: e.target.value })} /></label>
        )}
        <label className="text-sm">Sortering<input type="number" className="mt-1 w-full rounded border px-2 py-1" value={choice.sortOrder} onChange={(e) => onChange({ ...choice, sortOrder: Number(e.target.value) })} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={choice.active} onChange={(e) => onChange({ ...choice, active: e.target.checked })} />Zichtbaar</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={choice.enabled} onChange={(e) => onChange({ ...choice, enabled: e.target.checked })} />Ingeschakeld (selecteerbaar)</label>
      </div>
    </article>
  );
}
