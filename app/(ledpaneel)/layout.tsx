import type { Metadata } from "next";
import { LedpaneelFooter } from "@/components/ledpaneel/LedpaneelFooter";
import { LedpaneelHeader } from "@/components/ledpaneel/LedpaneelHeader";
import { SITE_LINKS } from "@/lib/ledpaneel/site-config";
import "./ledpaneel.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_LINKS.siteUrl),
  title: {
    default: "ledpaneel.nl | AI Lichtadvies voor kantoorverlichting",
    template: "%s | ledpaneel.nl",
  },
  description:
    "Upload uw plattegrond en ontvang binnen enkele minuten een indicatief lichtplan, lichtberekening en projectprijs.",
};

export default function LedpaneelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp-shell flex min-h-screen flex-col">
      <LedpaneelHeader />
      <main className="flex-1">{children}</main>
      <LedpaneelFooter />
    </div>
  );
}
