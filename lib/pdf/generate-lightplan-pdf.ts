import { jsPDF } from "jspdf";
import { formatEuroExVat, VAT_RATE_LABEL } from "@/lib/format-currency";
import { formatNumber } from "@/lib/calculations";
import { getFillModeLabel } from "@/lib/line-fill";
import { HEATMAP_DISCLAIMER } from "@/lib/heatmap-engine";
import { MODULE_WATTAGE_MAX } from "@/lib/light-analysis";
import { PDF_BRAND } from "@/lib/brand-colors";

export interface LightplanPdfInput {
  email: string;
  projectName?: string;
  length: number;
  width: number;
  height: number;
  lux: LuxLevel;
  lineFillMode: LineFillMode;
  mountingSystem: MountingSystem;
  netArea: number;
  plan: LightLinePlan;
  planImageWithoutHeatmap: string | null;
  planImageWithHeatmap: string | null;
}

import type { LightLinePlan, LineFillMode, LuxLevel, MountingSystem } from "@/types";

const { black, dark, gray, grayLight, yellow, white } = PDF_BRAND;
const MARGIN = 18;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;
const PLAN_IMAGE_MAX_H = 210;

async function loadImageDataUrl(path: string): Promise<string> {
  const response = await fetch(path);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function mountingLabel(system: MountingSystem) {
  return system === "staalkabel" ? "Staalkabel pendel" : "Montagebeugel";
}

function fixtureLabel(height: number) {
  return height <= 6 ? "120 graden" : "90 graden";
}

function formatPowerW(watts: number): string {
  return `${formatNumber(watts)}W`;
}

async function loadLogo(): Promise<string | null> {
  try {
    return await loadImageDataUrl("/branding/lightsale-logo.svg");
  } catch {
    return null;
  }
}

function drawBrandWordmark(doc: jsPDF) {
  doc.setTextColor(...yellow);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("LIGHTSALE", MARGIN, 22);
}

function addHeader(doc: jsPDF, logoDataUrl: string | null, title: string) {
  doc.setFillColor(...black);
  doc.rect(0, 0, PAGE_W, 42, "F");
  doc.setFillColor(...yellow);
  doc.rect(0, 42, PAGE_W, 1.5, "F");

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "SVG", MARGIN, 10, 72, 14);
    } catch {
      drawBrandWordmark(doc);
    }
  } else {
    drawBrandWordmark(doc);
  }

  doc.setTextColor(...white);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(title, MARGIN, 36);
  doc.setTextColor(...black);
}

function addSectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...black);
  doc.text(title, MARGIN, y);
  doc.setDrawColor(...yellow);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y + 2, MARGIN + 42, y + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  return y + 8;
}

function addKeyValue(doc: jsPDF, y: number, label: string, value: string): number {
  doc.setTextColor(...gray);
  doc.text(label, MARGIN, y);
  doc.setTextColor(...dark);
  doc.text(value, MARGIN + 62, y);
  return y + 6;
}

function addTableHeaderRow(doc: jsPDF, y: number): number {
  doc.setFillColor(...grayLight);
  doc.rect(MARGIN, y - 4.5, CONTENT_W, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...black);
  doc.text("Artikel", MARGIN, y);
  doc.text("Omschrijving", MARGIN + 22, y);
  doc.text("Aantal", MARGIN + 105, y);
  doc.text("Stuk excl.", MARGIN + 125, y);
  doc.text("Totaal excl.", MARGIN + 155, y);
  doc.setFont("helvetica", "normal");
  return y + 5;
}

function addPlanImage(
  doc: jsPDF,
  dataUrl: string,
  startY: number,
): { endY: number; imgH: number } {
  const imgProps = doc.getImageProperties(dataUrl);
  const ratio = imgProps.width / imgProps.height;
  let imgW = CONTENT_W;
  let imgH = imgW / ratio;
  if (imgH > PLAN_IMAGE_MAX_H) {
    imgH = PLAN_IMAGE_MAX_H;
    imgW = imgH * ratio;
  }
  doc.addImage(dataUrl, "PNG", MARGIN, startY, imgW, imgH);
  return { endY: startY + imgH, imgH };
}

export async function generateLightplanPdf(input: LightplanPdfInput): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logoDataUrl = await loadLogo();
  const dateStr = new Date().toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const { summary, heatmap, productList, lines } = input.plan;

  // --- Cover ---
  addHeader(doc, logoDataUrl, "Indicatief lichtplan bedrijfshal / magazijn");
  let y = 55;
  doc.setFontSize(10);
  y = addKeyValue(doc, y, "Datum", dateStr);
  if (input.projectName) {
    y = addKeyValue(doc, y, "Projectnaam", input.projectName);
  }
  y = addKeyValue(doc, y, "E-mailadres", input.email);
  y = addKeyValue(doc, y, "Vulling", getFillModeLabel(input.lineFillMode));

  // --- Projectgegevens ---
  doc.addPage();
  addHeader(doc, logoDataUrl, "Projectgegevens");
  y = 55;
  y = addSectionTitle(doc, y, "Magazijn");
  y = addKeyValue(doc, y, "Lengte", `${input.length} m`);
  y = addKeyValue(doc, y, "Breedte", `${input.width} m`);
  y = addKeyValue(doc, y, "Hoogte", `${input.height} m`);
  y = addKeyValue(doc, y, "Gewenst lux", `${input.lux} lux`);
  y = addKeyValue(doc, y, "Lichtlijnvulling", getFillModeLabel(input.lineFillMode));
  y = addKeyValue(doc, y, "Armatuurtype", fixtureLabel(input.height));
  y = addKeyValue(doc, y, "Ophangsysteem", mountingLabel(input.mountingSystem));
  y = addKeyValue(doc, y, "Lichtlijnen", `${lines.length} stuks`);

  y += 4;
  y = addSectionTitle(doc, y, "Vermogen");
  y = addKeyValue(doc, y, "LED-modules", `${summary.totalModules} stuks`);
  y = addKeyValue(doc, y, "Standaard vermogen/module", `${MODULE_WATTAGE_MAX}W`);
  y = addKeyValue(
    doc,
    y,
    "Advies ingesteld vermogen",
    `${summary.advisedWattsPerModule}W per module`,
  );
  y = addKeyValue(doc, y, "Geïnstalleerd vermogen", formatPowerW(summary.installedPowerW));
  y = addKeyValue(
    doc,
    y,
    "Totaal vermogen volgens advies",
    formatPowerW(summary.advisedTotalPowerW),
  );

  // --- Montageplan (zonder heatmap) ---
  if (input.planImageWithoutHeatmap) {
    doc.addPage();
    addHeader(doc, logoDataUrl, "Magazijngegevens / montageplan");
    y = 52;
    const mountPlan = addPlanImage(doc, input.planImageWithoutHeatmap, y);
    y = mountPlan.endY + 6;
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text("Montageplan lichtlijnen zonder heatmap.", MARGIN, y);
  }

  // --- Indicatieve lichtspreiding (met heatmap) ---
  if (input.planImageWithHeatmap) {
    doc.addPage();
    addHeader(doc, logoDataUrl, "Indicatieve lichtspreiding");
    y = 52;
    const heatmapPlan = addPlanImage(doc, input.planImageWithHeatmap, y);
    y = heatmapPlan.endY + 6;
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text("Indicatieve lichtspreiding op basis van ingevoerde gegevens.", MARGIN, y);
  }

  // --- Lichtberekening ---
  doc.addPage();
  addHeader(doc, logoDataUrl, "Lichtberekening indicatief");
  y = 55;
  y = addSectionTitle(doc, y, "Resultaten");
  y = addKeyValue(doc, y, "Netto oppervlak", `${formatNumber(input.netArea)} m²`);
  y = addKeyValue(
    doc,
    y,
    "Geïnstalleerde lumen",
    `${formatNumber(Math.round(summary.totalLumensAt60W * summary.heightFactor))} lm`,
  );
  y = addKeyValue(doc, y, "Hoogtefactor", summary.heightFactor.toFixed(2));
  y = addKeyValue(doc, y, "Verwacht gem. lux", `${Math.round(summary.expectedLuxAfterDimming)} lux`);
  y = addKeyValue(doc, y, "Min. lux (indicatief)", `${Math.round(heatmap.minLux)} lux`);
  y = addKeyValue(doc, y, "Max. lux (indicatief)", `${Math.round(heatmap.maxLux)} lux`);
  y = addKeyValue(doc, y, "Uniformiteit", heatmap.uniformity.toFixed(2));
  y = addKeyValue(doc, y, "Dimadvies", `${summary.advisedWattsPerModule} W/module`);
  y = addKeyValue(
    doc,
    y,
    "Totaal vermogen volgens advies",
    formatPowerW(summary.advisedTotalPowerW),
  );
  y += 4;
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(HEATMAP_DISCLAIMER, MARGIN, y, { maxWidth: CONTENT_W });

  // --- Projectlijst ---
  doc.addPage();
  addHeader(doc, logoDataUrl, "Projectlijst benodigdheden");
  y = 52;
  y = addTableHeaderRow(doc, y);

  for (const item of productList.items) {
    if (y > 270) {
      doc.addPage();
      addHeader(doc, logoDataUrl, "Projectlijst benodigdheden (vervolg)");
      y = 55;
      y = addTableHeaderRow(doc, y);
    }
    doc.setTextColor(...dark);
    doc.setFontSize(9);
    doc.text(item.sku, MARGIN, y);
    doc.text(item.name.substring(0, 42), MARGIN + 22, y);
    doc.text(String(item.quantity), MARGIN + 108, y);
    doc.text(formatEuroExVat(item.unitPrice), MARGIN + 125, y);
    doc.setTextColor(...black);
    doc.text(formatEuroExVat(item.totalPrice), MARGIN + 155, y);
    y += 6;
  }

  // --- Prijsopgaaf ---
  y += 6;
  if (y > 250) {
    doc.addPage();
    addHeader(doc, logoDataUrl, "Prijsopgaaf");
    y = 55;
  }
  y = addSectionTitle(doc, y, "Prijsopgaaf");
  doc.setFillColor(...yellow);
  doc.rect(MARGIN, y - 1, CONTENT_W, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...black);
  doc.text(`Totaal materialen excl. btw: ${formatEuroExVat(productList.subtotal)}`, MARGIN + 2, y + 5);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y = addKeyValue(doc, y, `Btw ${VAT_RATE_LABEL}`, formatEuroExVat(productList.vatAmount));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...black);
  doc.text(`Totaal incl. btw: ${formatEuroExVat(productList.totalInclVat)}`, MARGIN, y + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  y += 10;
  doc.text(
    "Prijsopgaaf conform adviesprijzen exclusief btw. Aan deze indicatieve berekening kunnen geen rechten worden ontleend.",
    MARGIN,
    y,
    { maxWidth: CONTENT_W },
  );

  // --- Disclaimer ---
  y += 14;
  if (y > 260) {
    doc.addPage();
    y = 55;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...black);
  doc.text("Disclaimer", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(
    "Dit rapport is een indicatief lichtvoorstel en geen officiële DIALux-, Relux- of EN 12464-1 lichtberekening. Voor definitieve projectadvisering kan Lightsale een aanvullende lichtberekening of projectadvies verzorgen.",
    MARGIN,
    y,
    { maxWidth: CONTENT_W },
  );

  return doc.output("blob");
}

export function buildPdfFilename(projectName?: string): string {
  const slug = projectName
    ? projectName.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()
    : "magazijn";
  const date = new Date().toISOString().slice(0, 10);
  return `lightsale-lichtplan-${slug}-${date}.pdf`;
}
