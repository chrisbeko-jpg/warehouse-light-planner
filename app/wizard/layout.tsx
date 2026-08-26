import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LED Lichtplan Wizard | Lightsale",
  description:
    "Maak in enkele minuten een indicatief kantoorlichtplan en vraag een projectofferte aan bij Lightsale.",
};

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
