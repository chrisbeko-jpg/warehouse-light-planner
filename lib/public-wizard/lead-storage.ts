import { promises as fs } from "fs";
import path from "path";
import { getLeadsDir as getLeadsDirFromStorage } from "@/lib/storage/data-dir";
import type { LeadStatus, PublicLeadRecord } from "@/types/public-wizard";

function getLeadsDir(): string {
  return process.env.LEAD_STORAGE_DIR ?? getLeadsDirFromStorage();
}

export function generateReference(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `LP-${y}${m}${d}-${rand}`;
}

export async function saveLead(record: PublicLeadRecord): Promise<void> {
  const dir = getLeadsDir();
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${record.reference}.json`);
  await fs.writeFile(filePath, JSON.stringify(record, null, 2), "utf8");
  if (record.pdfBase64) {
    const pdfPath = path.join(dir, `${record.reference}.pdf`);
    await fs.writeFile(pdfPath, Buffer.from(record.pdfBase64, "base64"));
  }
}

export async function listLeads(): Promise<PublicLeadRecord[]> {
  const dir = getLeadsDir();
  try {
    const files = await fs.readdir(dir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    const records: PublicLeadRecord[] = [];
    for (const file of jsonFiles) {
      const raw = await fs.readFile(path.join(dir, file), "utf8");
      records.push(JSON.parse(raw) as PublicLeadRecord);
    }
    return records.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

export async function getLead(reference: string): Promise<PublicLeadRecord | null> {
  const filePath = path.join(getLeadsDir(), `${reference}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as PublicLeadRecord;
  } catch {
    return null;
  }
}

export async function updateLeadStatus(
  reference: string,
  status: LeadStatus,
): Promise<PublicLeadRecord | null> {
  const lead = await getLead(reference);
  if (!lead) return null;
  lead.status = status;
  await saveLead(lead);
  return lead;
}

export async function readLeadPdf(reference: string): Promise<Buffer | null> {
  const pdfPath = path.join(getLeadsDir(), `${reference}.pdf`);
  try {
    return await fs.readFile(pdfPath);
  } catch {
    const lead = await getLead(reference);
    if (lead?.pdfBase64) {
      return Buffer.from(lead.pdfBase64, "base64");
    }
    return null;
  }
}

export function verifyInternalToken(request: Request): boolean {
  const token = process.env.INTERNAL_ADMIN_TOKEN;
  if (!token) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${token}`;
}
