"use client";

import type { ContentBlock, CmsImageRecord } from "@/types/cms";
import { RichTextEditor } from "@/components/cms/RichTextEditor";
import { ImageSelect } from "@/components/cms/ImageSelect";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function inputClass() {
  return "w-full rounded border border-[var(--lp-border)] px-3 py-2 text-sm";
}

export function BlockEditor({
  block,
  images,
  onChange,
}: {
  block: ContentBlock;
  images: Record<string, CmsImageRecord>;
  onChange: (block: ContentBlock) => void;
}) {
  switch (block.type) {
    case "hero":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tagline"><input className={inputClass()} value={block.tagline ?? ""} onChange={(e) => onChange({ ...block, tagline: e.target.value })} /></Field>
          <Field label="Kop (H1)"><input className={inputClass()} value={block.headline} onChange={(e) => onChange({ ...block, headline: e.target.value })} /></Field>
          <Field label="Subtitel"><textarea className={inputClass()} rows={3} value={block.subheadline} onChange={(e) => onChange({ ...block, subheadline: e.target.value })} /></Field>
          <ImageSelect images={images} value={block.imageId} onChange={(imageId) => onChange({ ...block, imageId })} label="Hero afbeelding" />
          <Field label="Alt-tekst hero"><input className={inputClass()} value={block.imageAlt ?? ""} onChange={(e) => onChange({ ...block, imageAlt: e.target.value })} /></Field>
          <Field label="Primaire CTA"><input className={inputClass()} value={block.primaryCta} onChange={(e) => onChange({ ...block, primaryCta: e.target.value })} /></Field>
          <Field label="Primaire link"><input className={inputClass()} value={block.primaryCtaHref} onChange={(e) => onChange({ ...block, primaryCtaHref: e.target.value })} /></Field>
          <Field label="Secundaire CTA"><input className={inputClass()} value={block.secondaryCta} onChange={(e) => onChange({ ...block, secondaryCta: e.target.value })} /></Field>
          <Field label="Secundaire link"><input className={inputClass()} value={block.secondaryCtaHref} onChange={(e) => onChange({ ...block, secondaryCtaHref: e.target.value })} /></Field>
        </div>
      );
    case "rich-text":
      return (
        <>
          <Field label="Kop (optioneel)"><input className={inputClass()} value={block.heading ?? ""} onChange={(e) => onChange({ ...block, heading: e.target.value })} /></Field>
          <RichTextEditor value={block.html} onChange={(html) => onChange({ ...block, html })} />
        </>
      );
    case "text":
      return (
        <>
          <Field label="Kop (optioneel)"><input className={inputClass()} value={block.heading ?? ""} onChange={(e) => onChange({ ...block, heading: e.target.value })} /></Field>
          <Field label="Tekst (plain)"><textarea className={inputClass()} rows={3} value={block.body} onChange={(e) => onChange({ ...block, body: e.target.value })} /></Field>
          <RichTextEditor value={block.html ?? `<p>${block.body}</p>`} onChange={(html) => onChange({ ...block, html })} />
        </>
      );
    case "text-image":
    case "image-text":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Kop"><input className={inputClass()} value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} /></Field>
          <ImageSelect images={images} value={block.imageId} onChange={(imageId) => onChange({ ...block, imageId })} />
          <Field label="Alt-tekst"><input className={inputClass()} value={block.imageAlt ?? ""} onChange={(e) => onChange({ ...block, imageAlt: e.target.value })} /></Field>
          <div className="md:col-span-2">
            <RichTextEditor value={block.html ?? `<p>${block.body}</p>`} onChange={(html) => onChange({ ...block, html, body: block.body })} />
          </div>
        </div>
      );
    case "wide-image":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <ImageSelect images={images} value={block.imageId} onChange={(imageId) => onChange({ ...block, imageId })} />
          <Field label="Alt-tekst"><input className={inputClass()} value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })} /></Field>
          <Field label="Bijschrift"><input className={inputClass()} value={block.caption ?? ""} onChange={(e) => onChange({ ...block, caption: e.target.value })} /></Field>
        </div>
      );
    case "comparison":
      return (
        <>
          <Field label="Kop"><input className={inputClass()} value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} /></Field>
          {block.columns.map((col, colIndex) => (
            <div key={colIndex} className="rounded-lg border border-[var(--lp-border)] p-4">
              <p className="mb-2 text-xs font-semibold">Kolom {colIndex + 1}</p>
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="Titel"><input className={inputClass()} value={col.title} onChange={(e) => { const columns = [...block.columns]; columns[colIndex] = { ...col, title: e.target.value }; onChange({ ...block, columns }); }} /></Field>
                <Field label="Intro"><input className={inputClass()} value={col.intro} onChange={(e) => { const columns = [...block.columns]; columns[colIndex] = { ...col, intro: e.target.value }; onChange({ ...block, columns }); }} /></Field>
                <Field label="CTA tekst"><input className={inputClass()} value={col.ctaText} onChange={(e) => { const columns = [...block.columns]; columns[colIndex] = { ...col, ctaText: e.target.value }; onChange({ ...block, columns }); }} /></Field>
                <Field label="CTA link"><input className={inputClass()} value={col.ctaHref} onChange={(e) => { const columns = [...block.columns]; columns[colIndex] = { ...col, ctaHref: e.target.value }; onChange({ ...block, columns }); }} /></Field>
                <div className="md:col-span-2">
                  <Field label="Punten (één per regel)">
                    <textarea className={inputClass()} rows={4} value={col.items.join("\n")} onChange={(e) => { const columns = [...block.columns]; columns[colIndex] = { ...col, items: e.target.value.split("\n").filter(Boolean) }; onChange({ ...block, columns }); }} />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </>
      );
    case "benefits":
      return (
        <>
          <Field label="Kop"><input className={inputClass()} value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} /></Field>
          {block.items.map((item, i) => (
            <div key={i} className="grid gap-2 rounded border p-3 md:grid-cols-2">
              <Field label="Titel"><input className={inputClass()} value={item.title} onChange={(e) => { const items = [...block.items]; items[i] = { ...item, title: e.target.value }; onChange({ ...block, items }); }} /></Field>
              <Field label="Omschrijving"><textarea className={inputClass()} rows={2} value={item.description} onChange={(e) => { const items = [...block.items]; items[i] = { ...item, description: e.target.value }; onChange({ ...block, items }); }} /></Field>
            </div>
          ))}
          <button type="button" className="text-sm text-[var(--lp-green-dark)]" onClick={() => onChange({ ...block, items: [...block.items, { title: "Nieuw", description: "" }] })}>+ Voordeel</button>
        </>
      );
    case "steps":
      return (
        <>
          <Field label="Kop"><input className={inputClass()} value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} /></Field>
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="CTA tekst"><input className={inputClass()} value={block.cta} onChange={(e) => onChange({ ...block, cta: e.target.value })} /></Field>
            <Field label="CTA link"><input className={inputClass()} value={block.ctaHref} onChange={(e) => onChange({ ...block, ctaHref: e.target.value })} /></Field>
          </div>
          {block.items.map((item, i) => (
            <div key={i} className="grid gap-2 rounded border p-3 md:grid-cols-2">
              <Field label={`Stap ${i + 1} titel`}><input className={inputClass()} value={item.title} onChange={(e) => { const items = [...block.items]; items[i] = { ...item, title: e.target.value }; onChange({ ...block, items }); }} /></Field>
              <Field label="Omschrijving"><textarea className={inputClass()} rows={2} value={item.description} onChange={(e) => { const items = [...block.items]; items[i] = { ...item, description: e.target.value }; onChange({ ...block, items }); }} /></Field>
            </div>
          ))}
          <button type="button" className="text-sm text-[var(--lp-green-dark)]" onClick={() => onChange({ ...block, items: [...block.items, { title: "Nieuwe stap", description: "" }] })}>+ Stap</button>
        </>
      );
    case "products":
      return (
        <>
          <Field label="Kop"><input className={inputClass()} value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} /></Field>
          <Field label="Intro"><textarea className={inputClass()} rows={2} value={block.intro} onChange={(e) => onChange({ ...block, intro: e.target.value })} /></Field>
          {block.items.map((item, i) => (
            <div key={i} className="grid gap-2 rounded border p-3 md:grid-cols-2">
              <Field label="Naam"><input className={inputClass()} value={item.name} onChange={(e) => { const items = [...block.items]; items[i] = { ...item, name: e.target.value }; onChange({ ...block, items }); }} /></Field>
              <ImageSelect images={images} value={item.imageId} onChange={(imageId) => { const items = [...block.items]; items[i] = { ...item, imageId }; onChange({ ...block, items }); }} />
              <div className="md:col-span-2"><Field label="Omschrijving"><textarea className={inputClass()} rows={2} value={item.description} onChange={(e) => { const items = [...block.items]; items[i] = { ...item, description: e.target.value }; onChange({ ...block, items }); }} /></Field></div>
            </div>
          ))}
          <button type="button" className="text-sm text-[var(--lp-green-dark)]" onClick={() => onChange({ ...block, items: [...block.items, { name: "Product", description: "" }] })}>+ Product</button>
        </>
      );
    case "cta":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Kop"><input className={inputClass()} value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} /></Field>
          <Field label="Tekst"><textarea className={inputClass()} rows={3} value={block.body} onChange={(e) => onChange({ ...block, body: e.target.value })} /></Field>
          <Field label="Knop tekst"><input className={inputClass()} value={block.buttonText} onChange={(e) => onChange({ ...block, buttonText: e.target.value })} /></Field>
          <Field label="Knop link"><input className={inputClass()} value={block.buttonHref} onChange={(e) => onChange({ ...block, buttonHref: e.target.value })} /></Field>
          <Field label="Secundaire knop"><input className={inputClass()} value={block.secondaryButtonText ?? ""} onChange={(e) => onChange({ ...block, secondaryButtonText: e.target.value })} /></Field>
          <Field label="Secundaire link"><input className={inputClass()} value={block.secondaryButtonHref ?? ""} onChange={(e) => onChange({ ...block, secondaryButtonHref: e.target.value })} /></Field>
        </div>
      );
    case "faq":
      return (
        <>
          <Field label="Kop"><input className={inputClass()} value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} /></Field>
          {block.items.map((item, i) => (
            <div key={i} className="space-y-2 rounded border p-3">
              <Field label="Vraag"><input className={inputClass()} value={item.question} onChange={(e) => { const items = [...block.items]; items[i] = { ...item, question: e.target.value }; onChange({ ...block, items }); }} /></Field>
              <Field label="Antwoord (tekst)"><textarea className={inputClass()} rows={2} value={item.answer} onChange={(e) => { const items = [...block.items]; items[i] = { ...item, answer: e.target.value }; onChange({ ...block, items }); }} /></Field>
              <RichTextEditor value={item.answerHtml ?? `<p>${item.answer}</p>`} onChange={(html) => { const items = [...block.items]; items[i] = { ...item, answerHtml: html }; onChange({ ...block, items }); }} />
              <button type="button" className="text-xs text-red-600" onClick={() => onChange({ ...block, items: block.items.filter((_, idx) => idx !== i) })}>Vraag verwijderen</button>
            </div>
          ))}
          <button type="button" className="text-sm text-[var(--lp-green-dark)]" onClick={() => onChange({ ...block, items: [...block.items, { question: "Nieuwe vraag?", answer: "Antwoord." }] })}>+ Vraag</button>
        </>
      );
    case "example":
      return (
        <>
          <Field label="Kop"><input className={inputClass()} value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} /></Field>
          <Field label="Tekst"><textarea className={inputClass()} rows={3} value={block.body} onChange={(e) => onChange({ ...block, body: e.target.value })} /></Field>
          <p className="text-xs text-[var(--lp-text-secondary)]">Afbeeldingen (max. 4)</p>
          {[0, 1, 2, 3].map((slot) => (
            <ImageSelect
              key={slot}
              images={images}
              value={block.imageIds[slot]}
              onChange={(imageId) => {
                const imageIds = [...block.imageIds];
                if (imageId) imageIds[slot] = imageId;
                else imageIds.splice(slot, 1);
                onChange({ ...block, imageIds: imageIds.filter(Boolean) });
              }}
              label={`Afbeelding ${slot + 1}`}
            />
          ))}
        </>
      );
    case "quote":
      return (
        <>
          <Field label="Quote"><textarea className={inputClass()} rows={3} value={block.quote} onChange={(e) => onChange({ ...block, quote: e.target.value })} /></Field>
          <Field label="Auteur"><input className={inputClass()} value={block.author} onChange={(e) => onChange({ ...block, author: e.target.value })} /></Field>
        </>
      );
    default:
      return null;
  }
}
