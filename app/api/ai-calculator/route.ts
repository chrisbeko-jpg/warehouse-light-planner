import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import type { AiCalculatorFormData } from "@/lib/ai-calculator/form";
import { SITE_LINKS } from "@/lib/ledpaneel/site-config";
import { guardPublicJsonPost } from "@/lib/security/public-api-guard";
import { aiCalculatorPayloadSchema } from "@/lib/security/schemas/public-forms";
import { envInt } from "@/lib/security/env";

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
  const guarded = await guardPublicJsonPost(request, {
    routeKey: "ai_calculator",
    maxBytes: envInt("MAX_BODY_AI_CALCULATOR_BYTES", 64_000),
    rateLimit: {
      max: envInt("RATE_LIMIT_AI_CALCULATOR_MAX", 8),
      windowSec: envInt("RATE_LIMIT_AI_CALCULATOR_WINDOW_SEC", 3600),
    },
    schema: aiCalculatorPayloadSchema,
    honeypotFilled: (d) => (d._hp_company_site?.length ?? 0) > 0,
    getTurnstileToken: (d) => d.turnstileToken,
  });

  if (!guarded.ok) return guarded.response;

  const body = guarded.data;
  const form: AiCalculatorFormData = {
    companyName: body.companyName,
    contactPerson: body.contactPerson,
    email: body.email,
    telephone: body.telephone ?? "",
    website: body.website ?? "",
    description: body.description,
    desiredTimeline: body.desiredTimeline ?? "",
    remarks: body.remarks ?? "",
  };

  try {
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
    const subject = `Nieuwe aanvraag eigen AI lichtcalculator – ${form.companyName.trim()}`;

    const textBody = [
      subject,
      "",
      `Bedrijf: ${form.companyName.trim()}`,
      `Contact: ${form.contactPerson.trim()}`,
      `E-mail: ${form.email.trim()}`,
      form.telephone.trim() ? `Telefoon: ${form.telephone.trim()}` : "",
      form.website.trim() ? `Website: ${form.website.trim()}` : "",
      "",
      `Omschrijving wens:`,
      form.description.trim(),
      form.desiredTimeline.trim() ? `\nGewenste planning: ${form.desiredTimeline.trim()}` : "",
      form.remarks.trim() ? `\nOpmerkingen: ${form.remarks.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await transporter.sendMail({
      from: mailFrom,
      replyTo: form.email.trim(),
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
