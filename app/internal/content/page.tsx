"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CmsPage, CmsSiteContent } from "@/types/cms";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/internal_admin_token=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export default function InternalContentPage() {
  const [site, setSite] = useState<CmsSiteContent | null>(null);
  const [hero, setHero] = useState<{ headline: string; subheadline: string; primaryCta: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadAlt, setUploadAlt] = useState("");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const res = await fetch("/api/internal/cms", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = (await res.json()) as { site: CmsSiteContent };
    setSite(data.site);
    const heroBlock = data.site.homepage.blocks.find((b) => b.type === "hero");
    if (heroBlock?.type === "hero") {
      setHero({ headline: heroBlock.headline, subheadline: heroBlock.subheadline, primaryCta: heroBlock.primaryCta });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveHomepage = async () => {
    const token = getToken();
    if (!token || !site || !hero) return;
    const homepage: CmsPage = {
      ...site.homepage,
      blocks: site.homepage.blocks.map((b) =>
        b.type === "hero" ? { ...b, ...hero } : b,
      ),
    };
    await fetch("/api/internal/cms", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ homepage }),
    });
    setMessage("Homepage opgeslagen.");
    void load();
  };

  const uploadImage = async (file: File) => {
    const token = getToken();
    if (!token) return;
    const form = new FormData();
    form.append("file", file);
    form.append("alt", uploadAlt || file.name);
    const res = await fetch("/api/internal/cms", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
    if (res.ok) {
      setMessage("Afbeelding geüpload.");
      void load();
    }
  };

  return (
    <main className="lp-container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="lp-heading-2">Contentbeheer</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/internal/aanvragen" className="lp-link">Aanvragen</Link>
          <Link href="/" className="lp-link" target="_blank">Publieke site</Link>
        </div>
      </div>

      {message && <p className="mb-4 rounded-lg bg-[var(--lp-green-soft)] p-3 text-sm">{message}</p>}

      {hero && (
        <section className="lp-card mb-6 space-y-3 p-6">
          <h2 className="font-bold">Homepage hero</h2>
          <label className="block text-sm">Titel<input className="mt-1 w-full rounded border border-[var(--lp-border)] px-3 py-2" value={hero.headline} onChange={(e) => setHero({ ...hero, headline: e.target.value })} /></label>
          <label className="block text-sm">Tekst<input className="mt-1 w-full rounded border border-[var(--lp-border)] px-3 py-2" value={hero.subheadline} onChange={(e) => setHero({ ...hero, subheadline: e.target.value })} /></label>
          <label className="block text-sm">CTA<input className="mt-1 w-full rounded border border-[var(--lp-border)] px-3 py-2" value={hero.primaryCta} onChange={(e) => setHero({ ...hero, primaryCta: e.target.value })} /></label>
          <button type="button" className="lp-btn-primary" onClick={() => void saveHomepage()}>Opslaan</button>
        </section>
      )}

      <section className="lp-card space-y-3 p-6">
        <h2 className="font-bold">Afbeelding uploaden</h2>
        <input type="text" placeholder="Alt-tekst" value={uploadAlt} onChange={(e) => setUploadAlt(e.target.value)} className="w-full rounded border border-[var(--lp-border)] px-3 py-2 text-sm" />
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f); }} />
        {site && Object.keys(site.images).length > 0 && (
          <ul className="text-sm text-[var(--lp-text-secondary)]">
            {Object.values(site.images).map((img) => (
              <li key={img.id}>{img.filename} — {img.alt}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
