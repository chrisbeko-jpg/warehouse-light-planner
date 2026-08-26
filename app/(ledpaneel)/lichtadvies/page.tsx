import type { Metadata } from "next";
import { PublicWizard } from "@/components/public-wizard/PublicWizard";

export const metadata: Metadata = {
  title: "AI Lichtadvies",
  description:
    "Start gratis AI Lichtadvies: upload uw plattegrond en ontvang een indicatief lichtplan voor uw kantoor.",
};

export default function LichtadviesPage() {
  return <PublicWizard />;
}
