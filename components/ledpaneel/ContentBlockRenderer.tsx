import Link from "next/link";
import type { ContentBlock, CmsSiteContent } from "@/types/cms";
import { imagePublicUrl } from "@/lib/cms/content-store";

function BlockImage({ imageId, alt }: { imageId?: string; alt?: string }) {
  if (!imageId) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-[var(--lp-border)] bg-[var(--lp-bg-secondary)] text-sm text-[var(--lp-text-secondary)]">
        Afbeelding
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imagePublicUrl(imageId)}
      alt={alt ?? ""}
      className="aspect-[4/3] w-full rounded-2xl border border-[var(--lp-border)] object-cover"
    />
  );
}

export function ContentBlockRenderer({
  block,
  site,
}: {
  block: ContentBlock;
  site: CmsSiteContent;
}) {
  switch (block.type) {
    case "hero":
      return (
        <section className="lp-section bg-[var(--lp-bg-secondary)]">
          <div className="lp-container grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--lp-green-dark)]">
                AI Lichtadvies voor uw kantoor
              </p>
              <h1 className="lp-heading-1">{block.headline}</h1>
              <p className="lp-body mt-4 text-lg">{block.subheadline}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={block.primaryCtaHref} className="lp-btn-primary">
                  {block.primaryCta}
                </Link>
                <Link href={block.secondaryCtaHref} className="lp-btn-secondary">
                  {block.secondaryCta}
                </Link>
              </div>
              <p className="mt-4 text-xs text-[var(--lp-text-secondary)]">
                Indicatief lichtadvies — het definitieve lichtplan wordt door Lightsale gecontroleerd.
              </p>
            </div>
            <div>
              <BlockImage imageId={block.imageId} alt={block.headline} />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-medium text-[var(--lp-text-secondary)]">
                <div className="lp-card p-3">Plattegrond</div>
                <div className="lp-card p-3 text-[var(--lp-green-dark)]">AI</div>
                <div className="lp-card p-3">Lichtplan</div>
              </div>
            </div>
          </div>
        </section>
      );
    case "steps":
      return (
        <section className="lp-section">
          <div className="lp-container">
            <h2 className="lp-heading-2 mb-8 text-center">{block.heading}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {block.items.map((item, i) => (
                <article key={item.title} className="lp-card p-5">
                  <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--lp-green-soft)] text-sm font-bold text-[var(--lp-green-dark)]">
                    {i + 1}
                  </span>
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="lp-body mt-2 text-sm">{item.description}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href={block.ctaHref} className="lp-btn-primary">
                {block.cta}
              </Link>
            </div>
          </div>
        </section>
      );
    case "benefits":
      return (
        <section className="lp-section lp-section-alt">
          <div className="lp-container">
            <h2 className="lp-heading-2 mb-8">{block.heading}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {block.items.map((item) => (
                <article key={item.title} className="lp-card p-5">
                  <h3 className="font-bold text-[var(--lp-green-dark)]">{item.title}</h3>
                  <p className="lp-body mt-2 text-sm">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      );
    case "products":
      return (
        <section className="lp-section">
          <div className="lp-container">
            <h2 className="lp-heading-2">{block.heading}</h2>
            <p className="lp-body mt-3 max-w-2xl">{block.intro}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {block.items.map((item) => (
                <article key={item.name} className="lp-card overflow-hidden">
                  <BlockImage imageId={item.imageId} alt={item.name} />
                  <div className="p-4">
                    <h3 className="text-sm font-bold">{item.name}</h3>
                    <p className="lp-body mt-1 text-sm">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      );
    case "example":
      return (
        <section className="lp-section lp-section-alt">
          <div className="lp-container grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="lp-heading-2">{block.heading}</h2>
              <p className="lp-body mt-4">{block.body}</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--lp-text-secondary)]">
                <li>• Geplaatste LED-panelen en downlights</li>
                <li>• Light Indicator / heatmap</li>
                <li>• Indicatief luxniveau en aantallen</li>
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(block.imageIds.length > 0 ? block.imageIds : [undefined, undefined]).map((id, i) => (
                <BlockImage key={id ?? i} imageId={id} alt={`Voorbeeld ${i + 1}`} />
              ))}
            </div>
          </div>
        </section>
      );
    case "text":
      return (
        <section className="lp-section">
          <div className="lp-container max-w-3xl">
            {block.heading && <h2 className="lp-heading-2">{block.heading}</h2>}
            <p className="lp-body mt-4 whitespace-pre-line">{block.body}</p>
          </div>
        </section>
      );
    case "text-image":
    case "image-text":
      return (
        <section className="lp-section">
          <div
            className={`lp-container grid items-center gap-8 lg:grid-cols-2 ${
              block.type === "image-text" ? "lg:[direction:rtl]" : ""
            }`}
          >
            <div className={block.type === "image-text" ? "lg:[direction:ltr]" : ""}>
              <h2 className="lp-heading-2">{block.heading}</h2>
              <p className="lp-body mt-4">{block.body}</p>
            </div>
            <div className={block.type === "image-text" ? "lg:[direction:ltr]" : ""}>
              <BlockImage imageId={block.imageId} alt={block.heading} />
            </div>
          </div>
        </section>
      );
    case "cta":
      return (
        <section className="lp-section lp-section-alt">
          <div className="lp-container text-center">
            <h2 className="lp-heading-2">{block.heading}</h2>
            <p className="lp-body mx-auto mt-3 max-w-2xl">{block.body}</p>
            <Link href={block.buttonHref} className="lp-btn-primary mt-6">
              {block.buttonText}
            </Link>
          </div>
        </section>
      );
    case "faq":
      return (
        <section className="lp-section">
          <div className="lp-container max-w-3xl">
            <h2 className="lp-heading-2 mb-6">{block.heading}</h2>
            <div className="space-y-4">
              {block.items.map((item) => (
                <details key={item.question} className="lp-card p-4">
                  <summary className="cursor-pointer font-semibold">{item.question}</summary>
                  <p className="lp-body mt-2 text-sm">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      );
    case "quote":
      return (
        <section className="lp-section">
          <div className="lp-container max-w-3xl">
            <blockquote className="lp-card border-l-4 border-[var(--lp-green)] p-6 text-lg italic">
              “{block.quote}”
            </blockquote>
            <p className="mt-3 text-sm font-medium text-[var(--lp-text-secondary)]">— {block.author}</p>
          </div>
        </section>
      );
    default:
      return null;
  }
}

export function PageBlocks({ site, pageSlug }: { site: CmsSiteContent; pageSlug: string }) {
  const page =
    pageSlug === "/" ? site.homepage : site.pages[pageSlug.replace(/^\//, "")];
  if (!page) return null;
  return (
    <>
      {page.blocks.map((block) => (
        <ContentBlockRenderer key={block.id} block={block} site={site} />
      ))}
    </>
  );
}
