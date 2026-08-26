"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LedpaneelLogo } from "@/components/ledpaneel/LedpaneelLogo";

const NAV = [
  { href: "/led-panelen", label: "LED-panelen" },
  { href: "/kantoorverlichting", label: "Kantoorverlichting" },
  { href: "/werkwijze", label: "Werkwijze" },
  { href: "/over-ons", label: "Over ons" },
  { href: "/contact", label: "Contact" },
];

export function LedpaneelHeader() {
  const pathname = usePathname();
  const isWizard = pathname.startsWith("/lichtadvies");

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--lp-border)] bg-white/95 backdrop-blur">
      <div className="lp-container flex items-center justify-between gap-4 py-4">
        <LedpaneelLogo />
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Hoofdnavigatie">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium no-underline ${
                pathname === item.href ? "text-[var(--lp-green-dark)]" : "text-[var(--lp-text-secondary)] hover:text-[var(--lp-text)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/lichtadvies" className="lp-btn-primary shrink-0 text-sm">
          {isWizard ? "AI Lichtadvies" : "Start gratis AI Lichtadvies"}
        </Link>
      </div>
    </header>
  );
}
