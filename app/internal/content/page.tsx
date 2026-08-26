import Link from "next/link";

const SECTIONS = [
  { href: "/internal/content/pages", title: "Pagina's", desc: "Tekstpagina's bewerken met WYSIWYG en contentblokken." },
  { href: "/internal/content/homepage", title: "Homepage", desc: "Hero, stappen, voordelen en homepage-secties." },
  { href: "/internal/content/wizard/rooms", title: "AI Lichtadvies – Ruimtes", desc: "Afbeeldingen en teksten voor ruimtekeuzes." },
  { href: "/internal/content/wizard/atmospheres", title: "AI Lichtadvies – Sferen", desc: "Warm, helder en Premium-teaser (disabled)." },
  { href: "/internal/content/pages/ai-calculator", title: "AI Calculator (B2B)", desc: "Landingspagina, SEO en formulier voor eigen AI-calculator." },
  { href: "/internal/content/media", title: "Afbeeldingen / Media", desc: "Uploaden, vervangen en alt-teksten beheren." },
  { href: "/internal/content/pages/kantoorverlichting", title: "SEO – Kantoorverlichting", desc: "SEO title, meta description en landingspagina." },
  { href: "/internal/content/navigation", title: "Navigatie", desc: "Header- en footerlinks." },
];

export default function ContentDashboardPage() {
  return (
      <div className="space-y-6">
        <p className="max-w-2xl text-[var(--lp-text-secondary)]">
          Beheer publieke webteksten, afbeeldingen, wizard-keuzes en SEO. Wijzigingen opslaan als concept en
          publiceren wanneer u klaar bent.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => (
            <Link key={section.href} href={section.href} className="lp-card block p-5 transition hover:border-[var(--lp-green)]">
              <h2 className="font-bold">{section.title}</h2>
              <p className="mt-2 text-sm text-[var(--lp-text-secondary)]">{section.desc}</p>
            </Link>
          ))}
        </div>
      </div>
  );
}
