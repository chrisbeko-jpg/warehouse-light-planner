"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CmsPage, CmsSiteContent, CmsWizardContent } from "@/types/cms";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/internal_admin_token=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export default function InternalContentPage() {
  const [site, setSite] = useState<CmsSiteContent | null>(null);
  const [hero, setHero] = useState<{ headline: string; subheadline: string; primaryCta: string } | null>(null);
  const [wizard, setWizard] = useState<CmsWizardContent | null>(null);
  const [kantoorPage, setKantoorPage] = useState<CmsPage | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadAlt, setUploadAlt] = useState("");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const res = await fetch("/api/internal/cms", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = (await res.json()) as { site: CmsSiteContent };
    setSite(data.site);
    setWizard(data.site.wizard);
    setKantoorPage(data.site.pages.kantoorverlichting ?? null);
    const heroBlock = data.site.homepage.blocks.find((b) => b.type === "hero");
    if (heroBlock?.type === "hero") {
      setHero({ headline: heroBlock.headline, subheadline: heroBlock.subheadline, primaryCta: heroBlock.primaryCta });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveHomepage = async () => {
    const token = getToken();
    if (!token || !site || !hero) return;
    const homepage: CmsPage = {
      ...site.homepage,
      blocks: site.homepage.blocks.map((b) => (b.type === "hero" ? { ...b, ...hero } : b)),
    };
    await fetch("/api/internal/cms", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ homepage }),
    });
    setMessage("Homepage opgeslagen.");
    void load();
  };

  const saveWizard = async () => {
    const token = getToken();
    if (!token || !wizard) return;
    await fetch("/api/internal/cms", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ wizard }),
    });
    setMessage("Wizard-keuzes opgeslagen.");
    void load();
  };

  const saveKantoorPage = async () => {
    const token = getToken();
    if (!token || !kantoorPage) return;
    await fetch("/api/internal/cms", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ pageSlug: "kantoorverlichting", page: kantoorPage }),
    });
    setMessage("Kantoorverlichting-pagina opgeslagen.");
    void load();
  };

  const uploadImage = async (file: File) => {
    const token = getToken();
    if (!token) return;
    const form = new FormData();
    form.append("file", file);
    form.append("alt", uploadAlt || file.name);
    const res = await fetch("/api/internal/cms", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (res.ok) {
      setMessage("Afbeelding geüpload.");
      void load();
    }
  };

  const imageOptions =
    site &&
    Object.values(site.images).map((img) => (
      <option key={img.id} value={img.id}>
        {img.filename} — {img.alt}
      </option>
    ));

  return (
    <main className="lp-container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="lp-heading-2">Contentbeheer</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/internal/aanvragen" className="lp-link">
            Aanvragen
          </Link>
          <Link href="/" className="lp-link" target="_blank">
            Publieke site
          </Link>
        </div>
      </div>

      {message && <p className="mb-4 rounded-lg bg-[var(--lp-green-soft)] p-3 text-sm">{message}</p>}

      {hero && (
        <section className="lp-card mb-6 space-y-3 p-6">
          <h2 className="font-bold">Homepage hero</h2>
          <label className="block text-sm">
            Titel
            <input
              className="mt-1 w-full rounded border border-[var(--lp-border)] px-3 py-2"
              value={hero.headline}
              onChange={(e) => setHero({ ...hero, headline: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Tekst
            <input
              className="mt-1 w-full rounded border border-[var(--lp-border)] px-3 py-2"
              value={hero.subheadline}
              onChange={(e) => setHero({ ...hero, subheadline: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            CTA
            <input
              className="mt-1 w-full rounded border border-[var(--lp-border)] px-3 py-2"
              value={hero.primaryCta}
              onChange={(e) => setHero({ ...hero, primaryCta: e.target.value })}
            />
          </label>
          <button type="button" className="lp-btn-primary" onClick={() => void saveHomepage()}>
            Opslaan
          </button>
        </section>
      )}

      {wizard && (
        <>
          <section className="lp-card mb-6 space-y-4 p-6">
            <h2 className="font-bold">AI Lichtadvies – Ruimtekeuzes</h2>
            {wizard.roomChoices.map((choice, index) => (
              <div key={choice.id} className="rounded-lg border border-[var(--lp-border)] p-4">
                <p className="mb-2 text-xs font-semibold text-[var(--lp-text-secondary)]">ID: {choice.id}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-sm">
                    Titel
                    <input
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={choice.title}
                      onChange={(e) => {
                        const next = [...wizard.roomChoices];
                        next[index] = { ...choice, title: e.target.value };
                        setWizard({ ...wizard, roomChoices: next });
                      }}
                    />
                  </label>
                  <label className="text-sm">
                    Voorgestelde lux
                    <input
                      type="number"
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={choice.suggestedLux}
                      onChange={(e) => {
                        const next = [...wizard.roomChoices];
                        next[index] = { ...choice, suggestedLux: Number(e.target.value) };
                        setWizard({ ...wizard, roomChoices: next });
                      }}
                    />
                  </label>
                  <label className="text-sm sm:col-span-2">
                    Omschrijving
                    <textarea
                      className="mt-1 w-full rounded border px-2 py-1"
                      rows={2}
                      value={choice.description}
                      onChange={(e) => {
                        const next = [...wizard.roomChoices];
                        next[index] = { ...choice, description: e.target.value };
                        setWizard({ ...wizard, roomChoices: next });
                      }}
                    />
                  </label>
                  <label className="text-sm">
                    Afbeelding
                    <select
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={choice.imageId ?? ""}
                      onChange={(e) => {
                        const next = [...wizard.roomChoices];
                        next[index] = { ...choice, imageId: e.target.value || undefined };
                        setWizard({ ...wizard, roomChoices: next });
                      }}
                    >
                      <option value="">Geen afbeelding</option>
                      {imageOptions}
                    </select>
                  </label>
                  <label className="text-sm">
                    Alt-tekst
                    <input
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={choice.imageAlt}
                      onChange={(e) => {
                        const next = [...wizard.roomChoices];
                        next[index] = { ...choice, imageAlt: e.target.value };
                        setWizard({ ...wizard, roomChoices: next });
                      }}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={choice.active}
                      onChange={(e) => {
                        const next = [...wizard.roomChoices];
                        next[index] = { ...choice, active: e.target.checked };
                        setWizard({ ...wizard, roomChoices: next });
                      }}
                    />
                    Actief
                  </label>
                </div>
              </div>
            ))}
          </section>

          <section className="lp-card mb-6 space-y-4 p-6">
            <h2 className="font-bold">AI Lichtadvies – Sfeerkeuzes</h2>
            {wizard.atmosphereChoices.map((choice, index) => (
              <div key={choice.id} className="rounded-lg border border-[var(--lp-border)] p-4">
                <p className="mb-2 text-xs font-semibold text-[var(--lp-text-secondary)]">ID: {choice.id}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-sm">
                    Titel
                    <input
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={choice.title}
                      onChange={(e) => {
                        const next = [...wizard.atmosphereChoices];
                        next[index] = { ...choice, title: e.target.value };
                        setWizard({ ...wizard, atmosphereChoices: next });
                      }}
                    />
                  </label>
                  <label className="text-sm">
                    Subtitel
                    <input
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={choice.subtitle}
                      onChange={(e) => {
                        const next = [...wizard.atmosphereChoices];
                        next[index] = { ...choice, subtitle: e.target.value };
                        setWizard({ ...wizard, atmosphereChoices: next });
                      }}
                    />
                  </label>
                  <label className="text-sm sm:col-span-2">
                    Omschrijving
                    <textarea
                      className="mt-1 w-full rounded border px-2 py-1"
                      rows={2}
                      value={choice.description}
                      onChange={(e) => {
                        const next = [...wizard.atmosphereChoices];
                        next[index] = { ...choice, description: e.target.value };
                        setWizard({ ...wizard, atmosphereChoices: next });
                      }}
                    />
                  </label>
                  <label className="text-sm">
                    Afbeelding
                    <select
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={choice.imageId ?? ""}
                      onChange={(e) => {
                        const next = [...wizard.atmosphereChoices];
                        next[index] = { ...choice, imageId: e.target.value || undefined };
                        setWizard({ ...wizard, atmosphereChoices: next });
                      }}
                    >
                      <option value="">Geen afbeelding</option>
                      {imageOptions}
                    </select>
                  </label>
                  <label className="text-sm">
                    Alt-tekst
                    <input
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={choice.imageAlt}
                      onChange={(e) => {
                        const next = [...wizard.atmosphereChoices];
                        next[index] = { ...choice, imageAlt: e.target.value };
                        setWizard({ ...wizard, atmosphereChoices: next });
                      }}
                    />
                  </label>
                  <label className="text-sm">
                    Flow
                    <select
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={choice.flow}
                      onChange={(e) => {
                        const next = [...wizard.atmosphereChoices];
                        next[index] = {
                          ...choice,
                          flow: e.target.value as "standard" | "kantoorverlichting",
                        };
                        setWizard({ ...wizard, atmosphereChoices: next });
                      }}
                    >
                      <option value="standard">Standaard wizard</option>
                      <option value="kantoorverlichting">Kantoorverlichting-pagina</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={choice.active}
                      onChange={(e) => {
                        const next = [...wizard.atmosphereChoices];
                        next[index] = { ...choice, active: e.target.checked };
                        setWizard({ ...wizard, atmosphereChoices: next });
                      }}
                    />
                    Actief
                  </label>
                </div>
              </div>
            ))}
            <button type="button" className="lp-btn-primary" onClick={() => void saveWizard()}>
              Wizard-keuzes opslaan
            </button>
          </section>
        </>
      )}

      {kantoorPage && (
        <section className="lp-card mb-6 space-y-3 p-6">
          <h2 className="font-bold">Kantoorverlichting-pagina</h2>
          <label className="block text-sm">
            Paginatitel
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={kantoorPage.title}
              onChange={(e) => setKantoorPage({ ...kantoorPage, title: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Intro
            <textarea
              className="mt-1 w-full rounded border px-3 py-2"
              rows={2}
              value={kantoorPage.intro ?? ""}
              onChange={(e) => setKantoorPage({ ...kantoorPage, intro: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            SEO title
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={kantoorPage.seo.title}
              onChange={(e) =>
                setKantoorPage({
                  ...kantoorPage,
                  seo: { ...kantoorPage.seo, title: e.target.value, ogTitle: e.target.value },
                })
              }
            />
          </label>
          <label className="block text-sm">
            Meta description
            <textarea
              className="mt-1 w-full rounded border px-3 py-2"
              rows={2}
              value={kantoorPage.seo.description}
              onChange={(e) =>
                setKantoorPage({
                  ...kantoorPage,
                  seo: {
                    ...kantoorPage.seo,
                    description: e.target.value,
                    ogDescription: e.target.value,
                  },
                })
              }
            />
          </label>
          <label className="block text-sm">
            Open Graph image
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={kantoorPage.seo.ogImageId ?? ""}
              onChange={(e) =>
                setKantoorPage({
                  ...kantoorPage,
                  seo: { ...kantoorPage.seo, ogImageId: e.target.value || undefined },
                })
              }
            >
              <option value="">Geen afbeelding</option>
              {imageOptions}
            </select>
          </label>
          <p className="text-xs text-[var(--lp-text-secondary)]">
            Contentblokken ({kantoorPage.blocks.length}) worden opgeslagen zoals ingesteld. Pas teksten aan via
            de blokken in site.json of breid later de editor uit.
          </p>
          <button type="button" className="lp-btn-primary" onClick={() => void saveKantoorPage()}>
            Kantoorverlichting opslaan
          </button>
        </section>
      )}

      <section className="lp-card space-y-3 p-6">
        <h2 className="font-bold">Afbeelding uploaden</h2>
        <input
          type="text"
          placeholder="Alt-tekst"
          value={uploadAlt}
          onChange={(e) => setUploadAlt(e.target.value)}
          className="w-full rounded border border-[var(--lp-border)] px-3 py-2 text-sm"
        />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadImage(f);
          }}
        />
        {site && Object.keys(site.images).length > 0 && (
          <ul className="text-sm text-[var(--lp-text-secondary)]">
            {Object.values(site.images).map((img) => (
              <li key={img.id}>
                {img.filename} — {img.alt}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
