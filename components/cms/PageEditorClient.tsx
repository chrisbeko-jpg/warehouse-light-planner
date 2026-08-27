"use client";

import { useCallback, useEffect, useState } from "react";
import type { ContentBlock, ContentBlockType, CmsPage, CmsSiteContent } from "@/types/cms";
import { CMS_BLOCK_LABELS } from "@/types/cms";
import { BlockEditor } from "@/components/cms/BlockEditor";
import { PublishBar } from "@/components/cms/PublishBar";
import { cmsFetch } from "@/lib/cms/admin-client";
import { createDefaultBlock } from "@/lib/cms/merge";

export function PageEditorClient({
  slug,
  initialPage,
  previewSlug,
}: {
  slug: string;
  initialPage: CmsPage;
  previewSlug: string;
}) {
  const [page, setPage] = useState(initialPage);
  const [images, setImages] = useState<CmsSiteContent["images"]>({});
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    const data = await cmsFetch<{ site: CmsSiteContent }>("/api/internal/cms?draft=1");
    setImages(data.site.images);
    setDraftUpdatedAt(data.site.draftUpdatedAt ?? null);
    setPublishedAt(data.site.publishedAt ?? null);
  }, []);

  useEffect(() => {
    void loadImages().catch((err) => {
      setMessage(err instanceof Error ? err.message : "Laden mislukt.");
      setMessageType("error");
    });
  }, [loadImages]);

  const applySavedPage = (site: CmsSiteContent) => {
    const key = slug.replace(/^\//, "");
    const savedPage =
      key === "" || slug === "/" || key === "homepage" ? site.homepage : site.pages[key];
    if (savedPage) setPage(savedPage);
    setImages(site.images);
    setDraftUpdatedAt(site.draftUpdatedAt ?? null);
    setPublishedAt(site.publishedAt ?? null);
  };

  const notify = (text: string, type: "success" | "error" = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const saveDraft = async () => {
    const data = await cmsFetch<{ site: CmsSiteContent; draftUpdatedAt?: string }>("/api/internal/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageSlug: slug, page: { ...page, status: "draft" } }),
    });
    applySavedPage(data.site);
    if (data.draftUpdatedAt) setDraftUpdatedAt(data.draftUpdatedAt);
  };

  const publish = async () => {
    await saveDraft();
    const data = await cmsFetch<{ site: CmsSiteContent; publishedAt?: string | null }>(
      "/api/internal/cms/publish",
      { method: "POST" },
    );
    applySavedPage(data.site);
    setPublishedAt(data.publishedAt ?? data.site.publishedAt ?? null);
    setPage((current) => ({ ...current, status: "published" }));
  };

  const updateBlock = (index: number, block: ContentBlock) => {
    setPage((p) => {
      const blocks = [...p.blocks];
      blocks[index] = block;
      return { ...p, blocks };
    });
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    setPage((p) => {
      const blocks = [...p.blocks];
      const target = index + direction;
      if (target < 0 || target >= blocks.length) return p;
      [blocks[index], blocks[target]] = [blocks[target]!, blocks[index]!];
      return { ...p, blocks };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{page.title}</h2>
          <p className="text-sm text-[var(--lp-text-secondary)]">
            {slug === "homepage" ? "/" : `/${slug}`}
          </p>
          <p className="mt-1 text-xs text-[var(--lp-text-secondary)]">
            Laatst opgeslagen:{" "}
            {draftUpdatedAt ? new Date(draftUpdatedAt).toLocaleString("nl-NL") : "—"}
            {" · "}
            Laatst gepubliceerd: {publishedAt ? new Date(publishedAt).toLocaleString("nl-NL") : "—"}
          </p>
        </div>
        <PublishBar
          previewHref={`/internal/preview/${previewSlug}`}
          onSave={saveDraft}
          onPublish={publish}
          saveSuccessMessage="Pagina opgeslagen als concept"
          publishSuccessMessage="Pagina gepubliceerd"
          onSaved={(text, type) => notify(text, type ?? "success")}
        />
      </div>

      {message && (
        <p
          className={`rounded-lg p-3 text-sm ${
            messageType === "error"
              ? "border border-red-200 bg-red-50 text-red-700"
              : "bg-[var(--lp-green-soft)]"
          }`}
          data-testid="page-editor-message"
        >
          {message}
        </p>
      )}

      <section className="lp-card grid gap-4 p-6">
        <h3 className="font-bold">Basis & SEO</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            Pagina titel
            <input className="mt-1 w-full rounded border px-3 py-2" value={page.title} onChange={(e) => setPage({ ...page, title: e.target.value })} />
          </label>
          <label className="block text-sm">
            Intro
            <input className="mt-1 w-full rounded border px-3 py-2" value={page.intro ?? ""} onChange={(e) => setPage({ ...page, intro: e.target.value })} />
          </label>
          <label className="block text-sm">
            SEO title
            <input className="mt-1 w-full rounded border px-3 py-2" value={page.seo.title} onChange={(e) => setPage({ ...page, seo: { ...page.seo, title: e.target.value } })} />
          </label>
          <label className="block text-sm">
            Meta description
            <textarea className="mt-1 w-full rounded border px-3 py-2" rows={2} value={page.seo.description} onChange={(e) => setPage({ ...page, seo: { ...page.seo, description: e.target.value } })} />
          </label>
          <label className="block text-sm">
            Open Graph title
            <input className="mt-1 w-full rounded border px-3 py-2" value={page.seo.ogTitle ?? ""} onChange={(e) => setPage({ ...page, seo: { ...page.seo, ogTitle: e.target.value } })} />
          </label>
          <label className="block text-sm">
            Open Graph description
            <textarea className="mt-1 w-full rounded border px-3 py-2" rows={2} value={page.seo.ogDescription ?? ""} onChange={(e) => setPage({ ...page, seo: { ...page.seo, ogDescription: e.target.value } })} />
          </label>
          <label className="block text-sm">
            Canonical
            <input className="mt-1 w-full rounded border px-3 py-2" value={page.seo.canonical ?? ""} onChange={(e) => setPage({ ...page, seo: { ...page.seo, canonical: e.target.value } })} />
          </label>
          <label className="block text-sm">
            Open Graph image
            <select className="mt-1 w-full rounded border px-3 py-2" value={page.seo.ogImageId ?? ""} onChange={(e) => setPage({ ...page, seo: { ...page.seo, ogImageId: e.target.value || undefined } })}>
              <option value="">Geen</option>
              {Object.values(images).map((img) => (
                <option key={img.id} value={img.id}>{img.title ?? img.filename}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={page.seo.noindex ?? false} onChange={(e) => setPage({ ...page, seo: { ...page.seo, noindex: e.target.checked } })} />
            Noindex (niet indexeren)
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold">Contentblokken</h3>
          <select
            className="rounded border px-3 py-2 text-sm"
            defaultValue=""
            onChange={(e) => {
              const type = e.target.value as ContentBlockType;
              if (!type) return;
              setPage((p) => ({ ...p, blocks: [...p.blocks, createDefaultBlock(type)] }));
              e.target.value = "";
            }}
          >
            <option value="">Blok toevoegen…</option>
            {Object.entries(CMS_BLOCK_LABELS).map(([type, label]) => (
              <option key={type} value={type}>{label}</option>
            ))}
          </select>
        </div>

        {page.blocks.map((block, index) => (
          <article key={block.id} className="lp-card space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{CMS_BLOCK_LABELS[block.type]}</p>
              <div className="flex gap-1">
                <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => moveBlock(index, -1)}>↑</button>
                <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => moveBlock(index, 1)}>↓</button>
                <button type="button" className="rounded border px-2 py-1 text-xs text-red-600" onClick={() => setPage((p) => ({ ...p, blocks: p.blocks.filter((_, i) => i !== index) }))}>Verwijderen</button>
              </div>
            </div>
            <BlockEditor block={block} images={images} onChange={(next) => updateBlock(index, next)} />
          </article>
        ))}
      </section>
    </div>
  );
}
