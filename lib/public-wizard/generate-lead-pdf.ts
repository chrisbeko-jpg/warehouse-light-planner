import { jsPDF } from "jspdf";
import { CALCULATION_DISCLAIMER } from "@/lib/public-wizard/calculation";
import { formatPriceRange } from "@/lib/public-wizard/pricing";
import { getAtmosphere } from "@/lib/public-wizard/atmospheres";
import { getRoomFunction } from "@/lib/public-wizard/room-functions";
import { PUBLIC_PRODUCT_BY_ID } from "@/lib/public-wizard/products";
import type { PublicLeadRecord } from "@/types/public-wizard";

const MARGIN = 18;

export function generatePublicLeadPdf(record: PublicLeadRecord): string {
  const doc = new jsPDF();
  const { contact, wizard, reference } = record;
  const room = getRoomFunction(wizard.roomFunction);
  const atmosphere = getAtmosphere(wizard.atmosphere);

  let y = 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Lightsale — Indicatief lichtplan", MARGIN, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Referentie: ${reference}`, MARGIN, y);
  y += 6;
  doc.text(`Datum: ${new Date(record.createdAt).toLocaleDateString("nl-NL")}`, MARGIN, y);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.text("Klantgegevens", MARGIN, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  const clientLines = [
    contact.companyName,
    contact.contactPerson,
    `${contact.address}, ${contact.postalCode} ${contact.city}`,
    contact.telephone,
    contact.email,
  ];
  for (const line of clientLines) {
    doc.text(line, MARGIN, y);
    y += 5;
  }
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Project", MARGIN, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  const projectLines = [
    `Ruimte: ${room.name}`,
    `Plafondhoogte: ${wizard.ceilingHeightM} m`,
    `Doel lux: ${wizard.targetLux}`,
    `Sfeer: ${atmosphere.title}`,
    `Oppervlakte: ${wizard.result.areaM2.toFixed(2)} m²`,
    `Armaturen: ${wizard.result.fixtureCount}`,
    `Totaal vermogen: ${wizard.result.totalWattage} W`,
    `Indicatief gemiddeld: ${wizard.result.indicativeAverageLux} lux`,
    `Voldoet aan doel: ${wizard.result.meetsTarget ? "Ja" : "Nee"}`,
    `Indicatieve prijs: ${formatPriceRange(wizard.price)}`,
  ];
  for (const line of projectLines) {
    doc.text(line, MARGIN, y);
    y += 5;
  }
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Producten", MARGIN, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  const counts: Record<string, number> = {};
  for (const f of wizard.fixtures) {
    const name = PUBLIC_PRODUCT_BY_ID[f.productId]?.name ?? f.productId;
    counts[name] = (counts[name] ?? 0) + 1;
  }
  for (const [name, qty] of Object.entries(counts)) {
    doc.text(`${name}: ${qty} st`, MARGIN, y);
    y += 5;
  }

  y += 8;
  doc.setFontSize(8);
  const disclaimerLines = doc.splitTextToSize(CALCULATION_DISCLAIMER, 175);
  doc.text(disclaimerLines, MARGIN, y);

  const dataUri = doc.output("datauristring");
  const base64 = dataUri.split(",")[1] ?? "";
  return base64;
}
