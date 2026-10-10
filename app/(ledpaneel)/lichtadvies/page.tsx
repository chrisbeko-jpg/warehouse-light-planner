import type { Metadata } from "next";
import { PublicWizard } from "@/components/public-wizard/PublicWizard";

export const metadata: Metadata = {
  title: "Online lichtplan maken | Lichtplanner",
  description:
    "Stel je lichtplan samen: ruimte, plafondtype en maatvoering naar armatuurverdeling, indicatieve lux en materiaalbegroting voor installateurs.",
};

export default function LichtadviesPage() {
  return <PublicWizard />;
}
