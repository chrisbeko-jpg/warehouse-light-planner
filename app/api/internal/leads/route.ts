import { NextResponse } from "next/server";
import {
  listLeads,
  readLeadPdf,
  updateLeadStatus,
  verifyInternalToken,
  getLead,
} from "@/lib/public-wizard/lead-storage";
import type { LeadStatus } from "@/types/public-wizard";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const leads = await listLeads();
  return NextResponse.json({ leads });
}

export async function PATCH(request: Request) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as { reference: string; status: LeadStatus };
  const updated = await updateLeadStatus(body.reference, body.status);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ lead: updated });
}

export async function POST(request: Request) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as { reference: string; action: "download-pdf" };
  const lead = await getLead(body.reference);
  if (!lead) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const pdf = await readLeadPdf(body.reference);
  if (!pdf) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${body.reference}.pdf"`,
    },
  });
}
