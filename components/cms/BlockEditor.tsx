"use client";

import type { ContentBlock, CmsImageRecord } from "@/types/cms";
import { RichTextEditor } from "@/components/cms/RichTextEditor";
import { MediaPicker } from "@/components/cms/MediaPicker";
import { applyMediaId, readMediaId, EXAMPLE_IMAGE_SLOT_COUNT } from "@/lib/cms/media";
import { getExampleImageSlots } from "@/lib/cms/normalize-media";

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
  onImagesChange,
}: {
  block: ContentBlock;
  images: Record<string, CmsImageRecord>;
  onChange: (block: ContentBlock) => void;
  onImagesChange?: (images: Record<string, CmsImageRecord>) => void;
}) {
  const pickerProps = { images, onImagesChange };
  switch (block.type) {
    case "hero":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tagline"><input className={inputClass()} value={block.tagline ?? ""} onChange={(e) => onChange({ ...block, tagline: e.target.value })} /></Field>
          <Field label="Kop (H1)"><input className={inputClass()} value={block.headline} onChange={(e) => onChange({ ...block, headline: e.target.value })} /></Field>
          <Field label="Subtitel"><textarea className={inputClass()} rows={3} value={block.subheadline} onChange={(e) => onChange({ ...block, subheadline: e.target.value })} /></Field>
          <MediaPicker
            {...pickerProps}
            value={readMediaId(block)}
            onChange={(mediaId) => onChange(applyMediaId(block, mediaId))}
            label="Hero afbeelding"
          />
          <Field label="Alt-tekst hero"><input className={inputClass()} value={block.altTextOverride ?? block.imageAlt ?? ""} onChange={(e) => onChange({ ...block, altTextOverride: e.target.value, imageAlt: e.target.value })} /></Field>
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
          <MediaPicker
            {...pickerProps}
            value={readMediaId(block)}
            onChange={(mediaId) => onChange(applyMediaId(block, mediaId))}
          />
          <Field label="Alt-tekst"><input className={inputClass()} value={block.altTextOverride ?? block.imageAlt ?? ""} onChange={(e) => onChange({ ...block, altTextOverride: e.target.value, imageAlt: e.target.value })} /></Field>
          <div className="md:col-span-2">
            <RichTextEditor value={block.html ?? `<p>${block.body}</p>`} onChange={(html) => onChange({ ...block, html, body: block.body })} />
          </div>
        </div>
      );
    case "wide-image":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <MediaPicker
            {...pickerProps}
            value={readMediaId(block)}
            onChange={(mediaId) => onChange(applyMediaId(block, mediaId))}
          />
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
              <MediaPicker
                {...pickerProps}
                value={readMediaId(item)}
                onChange={(mediaId) => {
                  const items = [...block.items];
                  items[i] = applyMediaId(item, mediaId);
                  onChange({ ...block, items });
                }}
              />
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
          <p className="text-xs text-[var(--lp-text-secondary)]">Afbeeldingen (4 vaste slots)</p>
          {Array.from({ length: EXAMPLE_IMAGE_SLOT_COUNT }, (_, slot) => {
            const slots = getExampleImageSlots(block);
            const current = slots[slot] ?? { mediaId: null };
            return (
              <MediaPicker
                key={slot}
                {...pickerProps}
                value={readMediaId(current)}
                onChange={(mediaId) => {
                  const nextSlots = [...getExampleImageSlots(block)];
                  nextSlots[slot] = mediaId
                    ? {
                        mediaId,
                        title: current.title ?? `Voorbeeld ${slot + 1}`,
                        altTextOverride: current.altTextOverride,
                      }
                    : { mediaId: null };
                  onChange({
                    ...block,
                    resultExamples: nextSlots,
                    imageIds: nextSlots.map((item) => readMediaId(item)).filter((id): id is string => Boolean(id)),
                  });
                }}
                label={`Voorbeeld ${slot + 1}`}
              />
            );
          })}
        </>
      );
    case "quote":
      return (
        <>
          <Field label="Quote"><textarea className={inputClass()} rows={3} value={block.quote} onChange={(e) => onChange({ ...block, quote: e.target.value })} /></Field>
          <Field label="Auteur"><input className={inputClass()} value={block.author} onChange={(e) => onChange({ ...block, author: e.target.value })} /></Field>
        </>
      );
    case "ai-calculator-cta":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Kop"><input className={inputClass()} value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} /></Field>
          <Field label="CTA tekst"><input className={inputClass()} value={block.buttonText} onChange={(e) => onChange({ ...block, buttonText: e.target.value })} /></Field>
          <Field label="CTA link"><input className={inputClass()} value={block.buttonHref} onChange={(e) => onChange({ ...block, buttonHref: e.target.value })} /></Field>
          <Field label="Tekst"><textarea className={inputClass()} rows={3} value={block.body} onChange={(e) => onChange({ ...block, body: e.target.value })} /></Field>
        </div>
      );
    case "ai-calculator-form":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Kop"><input className={inputClass()} value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} /></Field>
          <Field label="Intro"><textarea className={inputClass()} rows={3} value={block.intro} onChange={(e) => onChange({ ...block, intro: e.target.value })} /></Field>
          <Field label="Knop tekst"><input className={inputClass()} value={block.submitButtonText} onChange={(e) => onChange({ ...block, submitButtonText: e.target.value })} /></Field>
        </div>
      );
    default:
      return null;
  }
}
