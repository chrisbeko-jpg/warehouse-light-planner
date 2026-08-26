import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { validateAiCalculatorForm, type AiCalculatorFormData } from "@/lib/ai-calculator/form";
import { SITE_LINKS } from "@/lib/ledpaneel/site-config";

export const runtime = "nodejs";

const API_ERROR_MESSAGE = "Er ging iets mis bij het versturen van uw aanvraag.";
const API_SUCCESS_MESSAGE = "Bedankt voor uw aanvraag. We nemen zo snel mogelijk contact met u op.";

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
    let body: AiCalculatorFormData;
    try {
      body = (await request.json()) as AiCalculatorFormData;
    } catch {
      return jsonError("Ongeldige aanvraag.", 400);
    }

    const validationError = validateAiCalculatorForm(body);
    if (validationError) {
      return jsonError(validationError, 400);
    }

    const smtp = getSmtpConfig();
    if (!smtp) {
      console.error("ai-calculator: SMTP not configured");
      return jsonError(API_ERROR_MESSAGE, 500);
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    const mailFrom = process.env.SMTP_FROM ?? SITE_LINKS.contactEmail;
    const subject = `Nieuwe aanvraag eigen AI lichtcalculator – ${body.companyName.trim()}`;

    const textBody = [
      subject,
      "",
      `Bedrijf: ${body.companyName.trim()}`,
      `Contact: ${body.contactPerson.trim()}`,
      `E-mail: ${body.email.trim()}`,
      body.telephone.trim() ? `Telefoon: ${body.telephone.trim()}` : "",
      body.website.trim() ? `Website: ${body.website.trim()}` : "",
      "",
      `Omschrijving wens:`,
      body.description.trim(),
      body.desiredTimeline.trim() ? `\nGewenste planning: ${body.desiredTimeline.trim()}` : "",
      body.remarks.trim() ? `\nOpmerkingen: ${body.remarks.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await transporter.sendMail({
      from: mailFrom,
      replyTo: body.email.trim(),
      to: SITE_LINKS.salesEmail,
      subject,
      text: textBody,
    });

    return NextResponse.json({ success: true, message: API_SUCCESS_MESSAGE });
  } catch (error) {
    console.error("ai-calculator error:", error);
    return jsonError(API_ERROR_MESSAGE, 500);
  }
}
