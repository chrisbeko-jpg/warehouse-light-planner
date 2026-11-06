import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { formatEuroExVat } from "@/lib/format-currency";
import { guardPublicJsonPost } from "@/lib/security/public-api-guard";
import { sendLightplanPayloadSchema } from "@/lib/security/schemas/send-lightplan";
import { envInt } from "@/lib/security/env";

export const runtime = "nodejs";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port: Number(port),
    user,
    pass,
    from,
  };
}

function buildMaterialText(
  lines: {
    sku: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[],
) {
  return lines
    .map(
      (line) =>
        `- ${line.sku} · ${line.description} · ${line.quantity} st · ${formatEuroExVat(line.totalPrice)} excl.`,
    )
    .join("\n");
}

export async function POST(request: Request) {
  const guarded = await guardPublicJsonPost(request, {
    routeKey: "send_lightplan",
    maxBytes: envInt("MAX_BODY_SEND_LIGHTPLAN_BYTES", 18_000_000),
    rateLimit: {
      max: envInt("RATE_LIMIT_SEND_LIGHTPLAN_MAX", 8),
      windowSec: envInt("RATE_LIMIT_SEND_LIGHTPLAN_WINDOW_SEC", 3600),
    },
    schema: sendLightplanPayloadSchema,
    honeypotFilled: (d) => (d._hp_company_site?.length ?? 0) > 0,
    getTurnstileToken: (d) => d.turnstileToken,
  });

  if (!guarded.ok) return guarded.response;

  const body = guarded.data;

  try {
    const smtp = getSmtpConfig();
    const dateStr = new Date().toLocaleDateString("nl-NL");

    const textBody = [
      "Nieuwe lichtplan-aanvraag via Warehouse Light Planner",
      "",
      `Projectnaam: ${body.projectName ?? "—"}`,
      `Klant e-mail: ${body.email}`,
      `Datum: ${dateStr}`,
      "",
      `Afmetingen: ${body.length} × ${body.width} × ${body.height} m`,
      `Gewenst lux: ${body.lux}`,
      `Lichtlijnvulling: ${body.lineFillMode}`,
      `Ophangsysteem: ${body.mountingSystem}`,
      `Totaalprijs excl. btw: ${formatEuroExVat(body.totalExVat)}`,
      "",
      "Materiaallijst:",
      buildMaterialText(body.materialLines ?? []),
    ].join("\n");

    if (!smtp) {
      return NextResponse.json({
        ok: true,
        emailSent: false,
        message:
          "PDF is gedownload, maar e-mail kon nog niet worden verstuurd omdat mailconfiguratie ontbreekt.",
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    const attachments =
      body.pdfBase64 && body.pdfFilename
        ? [
            {
              filename: body.pdfFilename,
              content: Buffer.from(body.pdfBase64, "base64"),
              contentType: "application/pdf",
            },
          ]
        : undefined;

    await transporter.sendMail({
      from: smtp.from,
      to: "info@lightsale.nl",
      cc: body.email,
      subject: "Nieuwe lichtplan-aanvraag magazijn via Warehouse Light Planner",
      text: textBody,
      attachments,
    });

    return NextResponse.json({ ok: true, emailSent: true });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Mail versturen mislukt",
      },
      { status: 500 },
    );
  }
}
