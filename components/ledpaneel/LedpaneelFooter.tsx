import Link from "next/link";
import { LedpaneelLogo } from "@/components/ledpaneel/LedpaneelLogo";
import { SITE_LINKS } from "@/lib/ledpaneel/site-config";

export function LedpaneelFooter() {
  return (
    <footer className="border-t border-[var(--lp-border)] bg-[var(--lp-bg-secondary)]">
      <div className="lp-container grid gap-8 py-12 md:grid-cols-3">
        <div>
          <LedpaneelLogo size="sm" />
          <p className="lp-body mt-4 text-sm">
            AI Lichtadvies ontwikkeld door{" "}
            <a href={SITE_LINKS.lightsaleUrl} className="lp-link" target="_blank" rel="noopener noreferrer">
              Lightsale
            </a>
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--lp-text-secondary)]">
            Navigatie
          </h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/lichtadvies" className="lp-link">AI Lichtadvies</Link></li>
            <li><Link href="/led-panelen" className="lp-link">LED-panelen</Link></li>
            <li><Link href="/kantoorverlichting" className="lp-link">Kantoorverlichting</Link></li>
            <li><Link href="/werkwijze" className="lp-link">Werkwijze</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--lp-text-secondary)]">
            Contact &amp; juridisch
          </h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/contact" className="lp-link">Contact</Link></li>
            <li><Link href="/privacy" className="lp-link">Privacyverklaring</Link></li>
            <li><a href={`mailto:${SITE_LINKS.contactEmail}`} className="lp-link">{SITE_LINKS.contactEmail}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--lp-border)] py-4 text-center text-xs text-[var(--lp-text-secondary)]">
        © {new Date().getFullYear()} ledpaneel.nl — indicatief lichtadvies, geen officiële lichtberekening.
      </div>
    </footer>
  );
}
