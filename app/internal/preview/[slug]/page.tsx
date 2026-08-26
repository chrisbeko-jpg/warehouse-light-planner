import { notFound } from "next/navigation";
import { PageBlocks } from "@/components/ledpaneel/ContentBlockRenderer";
import { LedpaneelFooter } from "@/components/ledpaneel/LedpaneelFooter";
import { LedpaneelHeader } from "@/components/ledpaneel/LedpaneelHeader";
import { loadCmsDraft } from "@/lib/cms/content-store";
import "@/app/(ledpaneel)/ledpaneel.css";

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await loadCmsDraft();
  const pageSlug = slug === "homepage" ? "/" : slug;
  const page = slug === "homepage" ? site.homepage : site.pages[slug];
  if (!page) notFound();

  const showPageHeader = page.blocks[0]?.type !== "hero";

  return (
    <div className="lp-shell flex min-h-screen flex-col">
      <div className="border-b border-orange-300 bg-orange-50 py-2 text-center text-sm font-medium text-orange-900">
        Preview — conceptinhoud (nog niet gepubliceerd)
      </div>
      <LedpaneelHeader />
      <main className="flex-1">
        {showPageHeader && (
          <section className="border-b border-[var(--lp-border)] bg-[var(--lp-bg-secondary)] py-12">
            <div className="lp-container">
              <h1 className="lp-heading-1">{page.title}</h1>
              {page.intro && <p className="lp-body mt-4 max-w-2xl">{page.intro}</p>}
            </div>
          </section>
        )}
        <PageBlocks site={site} pageSlug={pageSlug} />
      </main>
      <LedpaneelFooter />
    </div>
  );
}
