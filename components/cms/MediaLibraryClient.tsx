"use client";

import { useCallback, useEffect, useState } from "react";
import type { CmsImageRecord, CmsSiteContent } from "@/types/cms";
import { cmsFetch } from "@/lib/cms/admin-client";
import { imagePublicUrl } from "@/lib/cms/image-url";

function formatBytes(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibraryClient() {
  const [images, setImages] = useState<CmsImageRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");

  const load = useCallback(async () => {
    const data = await cmsFetch<{ site: CmsSiteContent }>("/api/internal/cms?draft=1");
    setImages(Object.values(data.site.images).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("alt", uploadAlt || file.name);
    if (uploadTitle) form.append("title", uploadTitle);
    await cmsFetch("/api/internal/cms", { method: "POST", body: form });
    setMessage("Afbeelding geüpload.");
    setUploadAlt("");
    setUploadTitle("");
    void load();
  };

  const updateMeta = async (id: string, patch: { alt?: string; title?: string }) => {
    await cmsFetch(`/api/internal/cms/images/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setMessage("Opgeslagen.");
    void load();
  };

  const replaceFile = async (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    await cmsFetch(`/api/internal/cms/images/${id}`, { method: "PUT", body: form });
    setMessage("Afbeelding vervangen.");
    void load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Afbeelding verwijderen?")) return;
    await cmsFetch(`/api/internal/cms/images/${id}`, { method: "DELETE" });
    setMessage("Afbeelding verwijderd.");
    void load();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Afbeeldingen / Media</h2>
      {message && <p className="rounded-lg bg-[var(--lp-green-soft)] p-3 text-sm">{message}</p>}

      <section className="lp-card space-y-3 p-6">
        <h3 className="font-bold">Uploaden</h3>
        <input type="text" placeholder="Titel" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" />
        <input type="text" placeholder="Alt-tekst" value={uploadAlt} onChange={(e) => setUploadAlt(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" />
        <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
        <p className="text-xs text-[var(--lp-text-secondary)]">JPG, PNG, WebP. SVG alleen indien veilig (geen scripts).</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img) => (
          <article key={img.id} className="lp-card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePublicUrl(img.id)} alt={img.alt} className="aspect-video w-full object-cover" />
            <div className="space-y-2 p-4 text-sm">
              <p className="font-semibold">{img.title ?? img.filename}</p>
              <p className="text-xs text-[var(--lp-text-secondary)]">{img.filename} · {formatBytes(img.fileSizeBytes)} · {new Date(img.createdAt).toLocaleDateString("nl-NL")}</p>
              <label className="block">
                Alt-tekst
                <input className="mt-1 w-full rounded border px-2 py-1" defaultValue={img.alt} onBlur={(e) => { if (e.target.value !== img.alt) void updateMeta(img.id, { alt: e.target.value }); }} />
              </label>
              <label className="block">
                Titel
                <input className="mt-1 w-full rounded border px-2 py-1" defaultValue={img.title ?? ""} onBlur={(e) => { if (e.target.value !== (img.title ?? "")) void updateMeta(img.id, { title: e.target.value }); }} />
              </label>
              <p className="break-all text-xs text-[var(--lp-text-secondary)]">{imagePublicUrl(img.id)}</p>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer rounded border px-2 py-1 text-xs">
                  Vervangen
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void replaceFile(img.id, f); }} />
                </label>
                <button type="button" className="rounded border px-2 py-1 text-xs text-red-600" onClick={() => void remove(img.id)}>Verwijderen</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
