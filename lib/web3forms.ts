import { formatNumber } from "@/lib/calculations";
import { formatEuroExVat } from "@/lib/format-currency";

export const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
export const WEB3FORMS_SUBJECT = "Nieuwe lichtplan-aanvraag magazijn";
const RESPONSE_PREVIEW_LENGTH = 300;

export interface Web3FormsContact {
  name: string;
  email: string;
  phone: string;
  company?: string;
}

export interface LightplanWeb3FormsProjectData {
  length: number;
  width: number;
  height: number;
  lux: number;
  lineFillModeLabel: string;
  mountingSystemLabel: string;
  netArea: number;
  lightLinesCount: number;
  totalModules: number;
  blankPlates: number;
  installedPowerW: number;
  advisedWattsPerModule: number;
  advisedTotalPowerW: number;
  expectedLuxAfterDimming: number;
  targetLux: number;
  totalExVat: number;
  materialLines: Array<{
    sku: string;
    description: string;
    quantity: number;
    totalPrice: number;
  }>;
}

interface Web3FormsResponse {
  success: boolean;
  message?: string;
}

function formatSubmitError(status: number, responseText: string): string {
  const preview = responseText.trim().slice(0, RESPONSE_PREVIEW_LENGTH);
  return `Formulier kon niet worden verstuurd: ${status} ${preview}`;
}

function parseWeb3FormsResponseText(
  responseText: string,
  status: number,
): Web3FormsResponse {
  try {
    return JSON.parse(responseText) as Web3FormsResponse;
  } catch {
    throw new Error(formatSubmitError(status, responseText));
  }
}

export function buildLightplanMessage(
  contact: Web3FormsContact,
  project: LightplanWeb3FormsProjectData,
): string {
  const materialLines = project.materialLines
    .map(
      (line) =>
        `- ${line.sku} · ${line.description} · ${line.quantity} st · ${formatEuroExVat(line.totalPrice)} excl.`,
    )
    .join("\n");

  return [
    "Nieuwe lichtplan-aanvraag via Lightsale Lichtontwerp planner",
    "",
    "Contactgegevens",
    `Naam: ${contact.name.trim()}`,
    `E-mail: ${contact.email.trim()}`,
    `Telefoon: ${contact.phone.trim()}`,
    `Bedrijfsnaam: ${contact.company?.trim() || "—"}`,
    "",
    "Magazijn",
    `Afmetingen: ${project.length} × ${project.width} × ${project.height} m`,
    `Netto oppervlak: ${formatNumber(project.netArea)} m²`,
    `Gewenst lux: ${project.lux}`,
    `Lichtlijnvulling: ${project.lineFillModeLabel}`,
    `Ophangsysteem: ${project.mountingSystemLabel}`,
    "",
    "Lichtlijnen & vermogen",
    `Aantal lichtlijnen: ${project.lightLinesCount}`,
    `LED-modules: ${project.totalModules}`,
    `Blindplaten: ${project.blankPlates}`,
    `Geïnstalleerd vermogen: ${formatNumber(project.installedPowerW)}W`,
    `Advies vermogen/module: ${project.advisedWattsPerModule}W`,
    `Totaal vermogen volgens advies: ${formatNumber(project.advisedTotalPowerW)}W`,
    `Verwacht lux na dimmen: ${Math.round(project.expectedLuxAfterDimming)} lux (doel: ${project.targetLux} lux)`,
    "",
    `Totaal materialen excl. btw: ${formatEuroExVat(project.totalExVat)}`,
    "",
    "Materiaallijst",
    materialLines || "—",
  ].join("\n");
}

export async function submitLightplanToWeb3Forms(
  contact: Web3FormsContact,
  project: LightplanWeb3FormsProjectData,
): Promise<Web3FormsResponse> {
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY?.trim();
  if (!accessKey) {
    throw new Error("Web3Forms access key ontbreekt.");
  }

  const response = await fetch(WEB3FORMS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      access_key: accessKey,
      name: contact.name.trim(),
      email: contact.email.trim(),
      phone: contact.phone.trim(),
      company: contact.company?.trim() || "",
      subject: WEB3FORMS_SUBJECT,
      message: buildLightplanMessage(contact, project),
    }),
  });

  const responseText = await response.text();

  if (process.env.NODE_ENV === "development") {
    console.log("[Web3Forms] status:", response.status);
    console.log("[Web3Forms] response:", responseText);
  }

  const parsed = parseWeb3FormsResponseText(responseText, response.status);

  if (response.ok !== true || parsed.success !== true) {
    const detail = parsed.message?.trim() || responseText.trim();
    throw new Error(formatSubmitError(response.status, detail));
  }

  return parsed;
}

export function mountingSystemLabel(system: "staalkabel" | "montagebeugel"): string {
  return system === "staalkabel" ? "Staalkabel pendel" : "Montagebeugel";
}
