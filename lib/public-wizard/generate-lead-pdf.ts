import { jsPDF } from "jspdf";
import { CALCULATION_DISCLAIMER } from "@/lib/public-wizard/calculation";
import {
  formatMaterialPrice,
  MATERIAL_PRICE_DISCLAIMER,
  MATERIAL_PRICE_FOOTNOTE,
} from "@/lib/public-wizard/pricing";
import { getAtmosphere } from "@/lib/public-wizard/atmospheres";
import { getRoomFunction } from "@/lib/public-wizard/room-functions";
import type { PublicLeadRecord } from "@/types/public-wizard";

const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;

function addImagePage(doc: jsPDF, title: string, imageBase64: string | null, metaLines: string[]) {
  doc.addPage();
  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, MARGIN, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const line of metaLines) {
    doc.text(line, MARGIN, y);
    y += 5;
  }
  y += 4;

  if (imageBase64) {
    const maxW = PAGE_W - MARGIN * 2;
    const maxH = PAGE_H - y - MARGIN;
    try {
      doc.addImage(`data:image/png;base64,${imageBase64}`, "PNG", MARGIN, y, maxW, maxH, undefined, "FAST");
    } catch {
      doc.text("Afbeelding kon niet worden geladen.", MARGIN, y + 10);
    }
  } else {
    doc.text("Geen plattegrondafbeelding beschikbaar.", MARGIN, y + 10);
  }
}

export function generatePublicLeadPdf(record: PublicLeadRecord): string {
  const doc = new jsPDF();
  const { contact, wizard, reference, lightPlanImageBase64, heatmapImageBase64 } = record;
  const room = getRoomFunction(wizard.roomFunction);
  const atmosphere = getAtmosphere(wizard.atmosphere);

  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("AI Lichtadvies — Intern dossier", MARGIN, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Referentie: ${reference}`, MARGIN, y);
  y += 5;
  doc.text(`Datum: ${new Date(record.createdAt).toLocaleString("nl-NL")}`, MARGIN, y);
  y += 8;

  const clientBlock = [
    `Bedrijf: ${contact.companyName}`,
    `Contact: ${contact.contactPerson}`,
    `Telefoon: ${contact.telephone}`,
    `E-mail: ${contact.email}`,
    `Adres: ${contact.address}, ${contact.postalCode} ${contact.city}`,
    `Afleveradres: ${contact.deliveryAddress}, ${contact.deliveryPostalCode} ${contact.deliveryCity}`,
    `Project: ${contact.projectName || "—"}`,
    `Opmerkingen: ${contact.remarks || "—"}`,
  ];
  for (const line of clientBlock) {
    doc.text(line, MARGIN, y);
    y += 5;
  }
  y += 4;
  doc.text(`Ruimte: ${room.name} · Sfeer: ${atmosphere.title} · Plafond: ${wizard.ceilingHeightM} m`, MARGIN, y);
  y += 5;
  doc.text(`Doel lux: ${wizard.targetLux} · Indicatief: ${wizard.result.indicativeAverageLux} lux · Voldoet: ${wizard.result.meetsTarget ? "Ja" : "Nee"}`, MARGIN, y);

  addImagePage(doc, "Pagina 1 — Lichtplan", lightPlanImageBase64, [
    `Oppervlakte: ${wizard.result.areaM2.toFixed(2)} m²`,
    `Armaturen: ${wizard.result.fixtureCount} · Vermogen: ${wizard.result.totalWattage} W`,
    "Originele plattegrond met ingetekende ruimte en geplaatste armaturen.",
  ]);

  addImagePage(doc, "Pagina 2 — Light Indicator", heatmapImageBase64, [
    `Doel lux: ${wizard.targetLux}`,
    `Indicatief gemiddeld: ${wizard.result.indicativeAverageLux} lux`,
    `Status: ${wizard.result.meetsTarget ? "Voldoet" : "Voldoet niet"}`,
    "Indicatieve lichtverdeling — geen gevalideerde lichtberekening.",
  ]);

  doc.addPage();
  y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Pagina 3 — Artikellijst en prijsindicatie", MARGIN, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Product", MARGIN, y);
  doc.text("Aantal", MARGIN + 90, y);
  doc.text("Prijs/st", MARGIN + 115, y);
  doc.text("Subtotaal", MARGIN + 145, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  for (const line of wizard.price.lines) {
    doc.text(line.name, MARGIN, y);
    doc.text(String(line.quantity), MARGIN + 90, y);
    doc.text(`€${line.unitEuro.toFixed(2)}`, MARGIN + 115, y);
    doc.text(`€${line.subtotalEuro.toFixed(2)}`, MARGIN + 145, y);
    y += 5;
  }
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text(`Materiaalindicatie: ${formatMaterialPrice(wizard.price)}`, MARGIN, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(MATERIAL_PRICE_DISCLAIMER, MARGIN, y);
  y += 5;
  doc.text(MATERIAL_PRICE_FOOTNOTE, MARGIN, y);
  y += 8;
  const disclaimerLines = doc.splitTextToSize(CALCULATION_DISCLAIMER, 175);
  doc.text(disclaimerLines, MARGIN, y);

  const dataUri = doc.output("datauristring");
  return dataUri.split(",")[1] ?? "";
}
