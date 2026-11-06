import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { SITE_LINKS } from "@/lib/ledpaneel/site-config";
import { loadCmsSite } from "@/lib/cms/content-store";
import { getCeilingType } from "@/lib/public-wizard/ceiling-types";
import { generatePublicLeadPdf } from "@/lib/public-wizard/generate-lead-pdf";
import { setActiveProductCatalog } from "@/lib/public-wizard/products";
import {
  generateReference,
  saveLead,
} from "@/lib/public-wizard/lead-storage";
import {
  resolveLeadContactDelivery,
} from "@/lib/public-wizard/lead-form";
import {
  calculateMaterialPrice,
  countProducts,
  formatMaterialPrice,
  MATERIAL_PRICE_DISCLAIMER,
} from "@/lib/public-wizard/pricing";
import { calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import { createRoomPolygon } from "@/lib/public-wizard/placement";
import { guardPublicJsonPost } from "@/lib/security/public-api-guard";
import { publicLeadPayloadSchema } from "@/lib/security/schemas/public-forms";
import { envInt } from "@/lib/security/env";
import type {
  LeadContactForm,
  PlacedPublicFixture,
  PublicLeadRecord,
  PublicObstacle,
  PublicProductId,
} from "@/types/public-wizard";

export const runtime = "nodejs";

const API_ERROR_MESSAGE = "Er ging iets mis bij het versturen van uw aanvraag.";
const API_SUCCESS_MESSAGE = "Aanvraag ontvangen";

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
  const guarded = await guardPublicJsonPost(request, {
    routeKey: "public_leads",
    maxBytes: envInt("MAX_BODY_PUBLIC_LEADS_BYTES", 32_000_000),
    rateLimit: {
      max: envInt("RATE_LIMIT_PUBLIC_LEADS_MAX", 5),
      windowSec: envInt("RATE_LIMIT_PUBLIC_LEADS_WINDOW_SEC", 3600),
    },
    schema: publicLeadPayloadSchema,
    honeypotFilled: (d) => (d._hp_company_site?.length ?? 0) > 0,
    getTurnstileToken: (d) => d.turnstileToken,
  });

  if (!guarded.ok) return guarded.response;

  const body = guarded.data;

  try {
    const normalizedContact: LeadContactForm = {
      ...body.contact,
      projectName: body.contact.projectName ?? "",
      remarks: body.contact.remarks ?? "",
      desiredDeliveryDate: body.contact.desiredDeliveryDate ?? "",
    };
    const contact = resolveLeadContactDelivery(normalizedContact);

    const site = await loadCmsSite();
    setActiveProductCatalog(site.wizard.products ?? null);

    const fixtures = body.fixtures as PlacedPublicFixture[];
    const preferredProductId = body.preferredProductId as PublicProductId;

    const areaM2 = createRoomPolygon(body.roomVertices, body.pixelsPerMeter).areaM2;
    const result = calculateIndicativeResult(
      areaM2,
      body.targetLux,
      body.ceilingHeightM,
      fixtures,
      body.requiredFixtureCount ?? undefined,
    );
    const price = calculateMaterialPrice(fixtures);
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
        ceilingType: body.ceilingType ?? null,
        preferredProductId,
        fixtures,
        obstacles: (body.obstacles ?? []) as PublicObstacle[],
        roomVertices: body.roomVertices,
        pixelsPerMeter: body.pixelsPerMeter,
        inputMethod: body.inputMethod,
        manualDimensions: body.manualDimensions ?? null,
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

    const productSummary = Object.entries(countProducts(fixtures))
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
        `Plafondtype: ${body.ceilingType ? getCeilingType(body.ceilingType).title : "—"}`,
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
