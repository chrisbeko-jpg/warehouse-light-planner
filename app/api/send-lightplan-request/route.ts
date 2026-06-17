import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { formatEuroExVat } from "@/lib/format-currency";

export const runtime = "nodejs";

interface RequestBody {
  email: string;
  projectName?: string;
  length: number;
  width: number;
  height: number;
  lux: number;
  lineFillMode: string;
  mountingSystem: string;
  totalExVat: number;
  materialLines: Array<{
    sku: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  pdfBase64?: string;
  pdfFilename?: string;
}

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

function buildMaterialText(lines: RequestBody["materialLines"]) {
  return lines
    .map(
      (line) =>
        `- ${line.sku} · ${line.description} · ${line.quantity} st · ${formatEuroExVat(line.totalPrice)} excl.`,
    )
    .join("\n");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ ok: false, error: "Ongeldig e-mailadres" }, { status: 400 });
    }

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
  } catch (error) {
    console.error("send-lightplan-request error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Mail versturen mislukt",
      },
      { status: 500 },
    );
  }
}
