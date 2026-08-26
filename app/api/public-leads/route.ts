import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { SITE_LINKS } from "@/lib/ledpaneel/site-config";
import { generatePublicLeadPdf } from "@/lib/public-wizard/generate-lead-pdf";
import {
  generateReference,
  saveLead,
} from "@/lib/public-wizard/lead-storage";
import {
  resolveLeadContactDelivery,
  validateLeadForm,
} from "@/lib/public-wizard/lead-form";
import {
  calculateMaterialPrice,
  countProducts,
  formatMaterialPrice,
  MATERIAL_PRICE_DISCLAIMER,
} from "@/lib/public-wizard/pricing";
import { calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import { createRoomPolygon } from "@/lib/public-wizard/placement";
import type {
  LeadContactForm,
  PublicLeadRecord,
  PublicProductId,
  PlacedPublicFixture,
  RoomFunctionId,
  AtmosphereId,
} from "@/types/public-wizard";

export const runtime = "nodejs";

const API_ERROR_MESSAGE = "Er ging iets mis bij het versturen van uw aanvraag.";
const API_SUCCESS_MESSAGE = "Aanvraag ontvangen";

interface SubmitBody {
  contact: LeadContactForm;
  roomFunction: RoomFunctionId;
  ceilingHeightM: number;
  targetLux: number;
  atmosphere: AtmosphereId;
  preferredProductId: PublicProductId;
  fixtures: PlacedPublicFixture[];
  roomVertices: { x: number; y: number }[];
  pixelsPerMeter: number;
  floorPlanDataUrl: string | null;
  lightPlanImageBase64?: string | null;
  heatmapImageBase64?: string | null;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  if (!host || !port || !user || !pass || !from) return null;
  return { host, port: Number(port), user, pass, from };
}

export async function POST(request: Request) {
  try {
    let body: SubmitBody;
    try {
      body = (await request.json()) as SubmitBody;
    } catch {
      return jsonError("Ongeldige aanvraag.", 400);
    }

    const contact = resolveLeadContactDelivery(body.contact);
    const validationError = validateLeadForm(contact);
    if (validationError) {
      return jsonError(validationError, 400);
    }

    if (!body.roomFunction || !body.atmosphere || !body.fixtures || !body.roomVertices?.length) {
      return jsonError("Wizardgegevens ontbreken.", 400);
    }

    const areaM2 = createRoomPolygon(body.roomVertices, body.pixelsPerMeter).areaM2;
    const result = calculateIndicativeResult(
      areaM2,
      body.targetLux,
      body.ceilingHeightM,
      body.fixtures,
    );
    const price = calculateMaterialPrice(body.fixtures);
    const reference = generateReference();

    const record: PublicLeadRecord = {
      id: reference,
      reference,
      createdAt: new Date().toISOString(),
      status: "nieuw",
      contact,
      wizard: {
        roomFunction: body.roomFunction,
        ceilingHeightM: body.ceilingHeightM,
        targetLux: body.targetLux,
        atmosphere: body.atmosphere,
        preferredProductId: body.preferredProductId,
        fixtures: body.fixtures,
        roomVertices: body.roomVertices,
        pixelsPerMeter: body.pixelsPerMeter,
        result,
        price,
      },
      floorPlanDataUrl: body.floorPlanDataUrl,
      lightPlanImageBase64: body.lightPlanImageBase64 ?? null,
      heatmapImageBase64: body.heatmapImageBase64 ?? null,
      pdfBase64: null,
    };

    record.pdfBase64 = generatePublicLeadPdf(record);

    try {
      await saveLead(record);
    } catch (storageError) {
      console.error("Lead storage failed:", storageError);
    }

    const productSummary = Object.entries(countProducts(body.fixtures))
      .map(([name, qty]) => `${name}: ${qty}`)
      .join(", ");

    const smtp = getSmtpConfig();
    let emailSent = false;
    if (smtp) {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass },
      });

      const textBody = [
        `Nieuwe AI Lichtadvies aanvraag – ${contact.companyName} – ${reference}`,
        "",
        `Bedrijf: ${contact.companyName}`,
        `Contact: ${contact.contactPerson}`,
        `Telefoon: ${contact.telephone}`,
        `E-mail: ${contact.email}`,
        `Factuuradres: ${contact.address}, ${contact.postalCode} ${contact.city}`,
        `Afleveradres: ${contact.deliveryAddress}, ${contact.deliveryPostalCode} ${contact.deliveryCity}`,
        contact.deliverySameAsCompany ? "(gelijk aan bedrijfsadres)" : "(afwijkend afleveradres)",
        `Project: ${contact.projectName || "—"}`,
        contact.desiredDeliveryDate ? `Gewenste leverdatum: ${contact.desiredDeliveryDate}` : "",
        "",
        `Ruimtefunctie: ${body.roomFunction}`,
        `Sfeer: ${body.atmosphere}`,
        `Plafondhoogte: ${body.ceilingHeightM} m`,
        `Doel lux: ${body.targetLux}`,
        `Indicatief lux: ${result.indicativeAverageLux}`,
        `Voldoet: ${result.meetsTarget ? "Ja" : "Nee"}`,
        `Producten: ${productSummary || "—"}`,
        `Materiaalindicatie: ${formatMaterialPrice(price)}`,
        MATERIAL_PRICE_DISCLAIMER,
        "",
        `Opmerkingen: ${contact.remarks || "—"}`,
        "",
        "Het lichtplan is bijgevoegd als PDF.",
      ]
        .filter(Boolean)
        .join("\n");

      const mailFrom = process.env.SMTP_FROM ?? SITE_LINKS.contactEmail;

      await transporter.sendMail({
        from: mailFrom,
        replyTo: contact.email,
        to: SITE_LINKS.salesEmail,
        subject: `Nieuwe AI Lichtadvies aanvraag – ${contact.companyName} – ${reference}`,
        text: textBody,
        attachments: record.pdfBase64
          ? [
              {
                filename: `${reference}-lichtplan.pdf`,
                content: Buffer.from(record.pdfBase64, "base64"),
                contentType: "application/pdf",
              },
            ]
          : undefined,
      });

      if (contact.email) {
        await transporter.sendMail({
          from: mailFrom,
          to: contact.email,
          subject: `Bevestiging AI Lichtadvies – ${reference} | ledpaneel.nl`,
          text: [
            "Bedankt voor uw aanvraag via ledpaneel.nl.",
            "",
            "Lightsale controleert het lichtplan en de productspecificatie.",
            "U ontvangt vervolgens het uitgewerkte lichtplan samen met een projectofferte.",
            "",
            `Referentie: ${reference}`,
          ].join("\n"),
        });
      }
      emailSent = true;
    }

    return NextResponse.json({
      success: true,
      message: API_SUCCESS_MESSAGE,
      reference,
      emailSent,
    });
  } catch (error) {
    console.error("public-leads error:", error);
    return jsonError(API_ERROR_MESSAGE, 500);
  }
}
