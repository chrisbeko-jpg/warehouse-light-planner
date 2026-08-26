import Link from "next/link";
import { loadCmsDraft } from "@/lib/cms/content-store";

export default async function PagesListPage() {
  const site = await loadCmsDraft();
  const pages = Object.entries(site.pages).sort((a, b) => a[1].title.localeCompare(b[1].title));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Pagina&apos;s</h2>
        <Link href="/internal/content/homepage" className="lp-link text-sm">
          Homepage bewerken →
        </Link>
      </div>
      <div className="divide-y rounded-xl border border-[var(--lp-border)] bg-white">
        {pages.map(([slug, page]) => (
          <Link
            key={slug}
            href={`/internal/content/pages/${slug}`}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-[var(--lp-bg-secondary)]"
          >
            <div>
              <p className="font-semibold">{page.title}</p>
              <p className="text-sm text-[var(--lp-text-secondary)]">/{slug}</p>
            </div>
            <span className="text-xs text-[var(--lp-text-secondary)]">{page.blocks.length} blokken</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
