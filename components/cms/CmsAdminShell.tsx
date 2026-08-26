"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/internal/content", label: "Dashboard", exact: true },
  { href: "/internal/content/pages", label: "Pagina's" },
  { href: "/internal/content/homepage", label: "Homepage" },
  { href: "/internal/content/wizard/rooms", label: "AI Ruimtes" },
  { href: "/internal/content/wizard/atmospheres", label: "AI Sferen" },
  { href: "/internal/content/media", label: "Media" },
  { href: "/internal/content/pages/kantoorverlichting", label: "SEO" },
  { href: "/internal/content/navigation", label: "Navigatie" },
];

export function CmsAdminShell({
  children,
  meta,
}: {
  children: React.ReactNode;
  meta?: { publishedAt?: string | null; draftUpdatedAt?: string | null };
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[var(--lp-bg)]">
      <header className="border-b border-[var(--lp-border)] bg-white">
        <div className="lp-container flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <h1 className="text-lg font-bold">Contentbeheer</h1>
            {meta && (
              <p className="text-xs text-[var(--lp-text-secondary)]">
                Laatst opgeslagen:{" "}
                {meta.draftUpdatedAt ? new Date(meta.draftUpdatedAt).toLocaleString("nl-NL") : "—"}
                {" · "}
                Laatst gepubliceerd:{" "}
                {meta.publishedAt ? new Date(meta.publishedAt).toLocaleString("nl-NL") : "—"}
              </p>
            )}
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/internal/aanvragen" className="lp-link">
              Aanvragen
            </Link>
            <Link href="/" className="lp-link" target="_blank">
              Publieke site
            </Link>
          </div>
        </div>
        <nav className="lp-container flex flex-wrap gap-2 pb-4">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  active ? "bg-[var(--lp-green)] text-white" : "bg-[var(--lp-bg-secondary)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="lp-container py-8">{children}</main>
    </div>
  );
}
