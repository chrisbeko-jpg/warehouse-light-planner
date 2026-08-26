import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { SITE_LINKS } from "@/lib/ledpaneel/site-config";
import { generatePublicLeadPdf } from "@/lib/public-wizard/generate-lead-pdf";
import {
  generateReference,
  saveLead,
} from "@/lib/public-wizard/lead-storage";
import { calculateIndicativePrice, countProducts, formatPriceRange } from "@/lib/public-wizard/pricing";
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
    const body = (await request.json()) as SubmitBody;
    const { contact } = body;

    if (!contact?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      return NextResponse.json({ ok: false, error: "Ongeldig e-mailadres" }, { status: 400 });
    }

    const areaM2 = createRoomPolygon(body.roomVertices, body.pixelsPerMeter).areaM2;
    const result = calculateIndicativeResult(
      areaM2,
      body.targetLux,
      body.ceilingHeightM,
      body.fixtures,
    );
    const price = calculateIndicativePrice(body.fixtures);
    const reference = generateReference();

    const record: PublicLeadRecord = {
      id: reference,
      reference,
      createdAt: new Date().toISOString(),
      status: "nieuw",
      contact: body.contact,
      wizard: {
        roomFunction: body.roomFunction,
        ceilingHeightM: body.ceilingHeightM,
        targetLux: body.targetLux,
        atmosphere: body.atmosphere,
        preferredProductId: body.preferredProductId,
        fixtures: body.fixtures,
        result,
        price,
      },
      floorPlanDataUrl: body.floorPlanDataUrl,
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
        `Nieuwe lichtplan aanvraag – ${contact.companyName} – ${reference}`,
        "",
        `Bedrijf: ${contact.companyName}`,
        `Contact: ${contact.contactPerson}`,
        `Telefoon: ${contact.telephone}`,
        `E-mail: ${contact.email}`,
        `Project: ${contact.projectName || "—"}`,
        "",
        `Doel lux: ${body.targetLux}`,
        `Indicatief lux: ${result.indicativeAverageLux}`,
        `Producten: ${productSummary || "—"}`,
        `Indicatieve prijs: ${formatPriceRange(price)}`,
      ].join("\n");

      const mailFrom = process.env.SMTP_FROM ?? SITE_LINKS.contactEmail;

      await transporter.sendMail({
        from: mailFrom,
        replyTo: contact.email,
        to: SITE_LINKS.salesEmail,
        subject: `Nieuwe lichtplan aanvraag – ${contact.companyName} – ${reference}`,
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
      ok: true,
      reference,
      emailSent,
    });
  } catch (error) {
    console.error("public-leads error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Aanvraag mislukt" },
      { status: 500 },
    );
  }
}
