import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_CMS_SITE } from "@/lib/cms/defaults";
import {
  mergeSitePayload,
  normalizeStorage,
  payloadToPublicContent,
} from "@/lib/cms/merge";
import { imagePublicUrl } from "@/lib/cms/image-url";
import { getCmsDir, getUploadsDir } from "@/lib/storage/data-dir";
import type {
  CmsImageRecord,
  CmsPage,
  CmsSiteContent,
  CmsSitePayload,
  CmsSiteStorage,
} from "@/types/cms";

const SITE_FILE = "site.json";

async function readStorage(): Promise<CmsSiteStorage> {
  const filePath = path.join(getCmsDir(), SITE_FILE);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return normalizeStorage(JSON.parse(raw));
  } catch {
    return normalizeStorage(undefined);
  }
}

async function writeStorage(storage: CmsSiteStorage): Promise<void> {
  const dir = getCmsDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, SITE_FILE), JSON.stringify(storage, null, 2), "utf8");
}

/** Public published CMS content. */
export async function loadCmsSite(): Promise<CmsSiteContent> {
  const storage = await readStorage();
  return payloadToPublicContent(storage.published, {
    publishedAt: storage.publishedAt,
    draftUpdatedAt: storage.draftUpdatedAt,
  });
}

/** Draft content for internal admin. */
export async function loadCmsDraft(): Promise<CmsSiteContent> {
  const storage = await readStorage();
  return payloadToPublicContent(storage.draft, {
    publishedAt: storage.publishedAt,
    draftUpdatedAt: storage.draftUpdatedAt,
  });
}

export async function getCmsStorageMeta(): Promise<{
  publishedAt: string | null;
  draftUpdatedAt: string | null;
}> {
  const storage = await readStorage();
  return {
    publishedAt: storage.publishedAt,
    draftUpdatedAt: storage.draftUpdatedAt,
  };
}

export async function saveCmsDraft(payload: Partial<CmsSitePayload>): Promise<CmsSiteContent> {
  const storage = await readStorage();
  storage.draft = mergeSitePayload({ ...storage.draft, ...payload });
  storage.draftUpdatedAt = new Date().toISOString();
  await writeStorage(storage);
  return loadCmsDraft();
}

export async function saveCmsDraftPage(slug: string, page: CmsPage): Promise<void> {
  const storage = await readStorage();
  const key = slug.replace(/^\//, "");
  if (key === "" || slug === "/" || key === "homepage") {
    storage.draft.homepage = { ...page, updatedAt: new Date().toISOString() };
  } else {
    storage.draft.pages[key] = { ...page, updatedAt: new Date().toISOString() };
  }
  storage.draftUpdatedAt = new Date().toISOString();
  await writeStorage(storage);
}

export async function publishCmsDraft(): Promise<CmsSiteContent> {
  const storage = await readStorage();
  const now = new Date().toISOString();
  storage.published = structuredClone(storage.draft);
  storage.publishedAt = now;
  storage.draftUpdatedAt = now;
  await writeStorage(storage);
  return loadCmsSite();
}

export async function revertCmsDraft(): Promise<CmsSiteContent> {
  const storage = await readStorage();
  storage.draft = structuredClone(storage.published);
  storage.draftUpdatedAt = new Date().toISOString();
  await writeStorage(storage);
  return loadCmsDraft();
}

/** @deprecated use saveCmsDraft */
export async function saveCmsSite(content: CmsSiteContent): Promise<void> {
  const storage = await readStorage();
  storage.draft = mergeSitePayload(content);
  storage.draftUpdatedAt = new Date().toISOString();
  storage.published = mergeSitePayload(content);
  storage.publishedAt = new Date().toISOString();
  await writeStorage(storage);
}

export async function getCmsPage(slug: string, options?: { draft?: boolean }): Promise<CmsPage | null> {
  const site = options?.draft ? await loadCmsDraft() : await loadCmsSite();
  const key = slug.replace(/^\//, "");
  if (key === "" || key === "homepage") return site.homepage;
  return site.pages[key] ?? null;
}

export async function saveCmsPage(slug: string, page: CmsPage): Promise<void> {
  await saveCmsDraftPage(slug, page);
}

export async function saveUploadedImage(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  alt: string,
  title?: string,
): Promise<CmsImageRecord> {
  const storage = await readStorage();
  const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ext = path.extname(filename) || ".jpg";
  const storedName = `${id}${ext}`;
  const uploadsDir = getUploadsDir();
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, storedName), buffer);

  const record: CmsImageRecord = {
    id,
    filename: storedName,
    mimeType,
    alt,
    title: title || alt || filename,
    fileSizeBytes: buffer.length,
    createdAt: new Date().toISOString(),
  };
  storage.draft.images[id] = record;
  storage.published.images[id] = record;
  storage.draftUpdatedAt = new Date().toISOString();
  await writeStorage(storage);
  return record;
}

export async function updateImageRecord(
  id: string,
  patch: Partial<Pick<CmsImageRecord, "alt" | "title">>,
): Promise<CmsImageRecord | null> {
  const storage = await readStorage();
  const record = storage.draft.images[id] ?? storage.published.images[id];
  if (!record) return null;
  const next = { ...record, ...patch };
  storage.draft.images[id] = next;
  storage.published.images[id] = next;
  storage.draftUpdatedAt = new Date().toISOString();
  await writeStorage(storage);
  return next;
}

export async function replaceImageFile(
  id: string,
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<CmsImageRecord | null> {
  const storage = await readStorage();
  const record = storage.draft.images[id];
  if (!record) return null;
  try {
    await fs.unlink(path.join(getUploadsDir(), record.filename));
  } catch {
    /* ignore */
  }
  const ext = path.extname(filename) || path.extname(record.filename) || ".jpg";
  const storedName = `${id}${ext}`;
  await fs.writeFile(path.join(getUploadsDir(), storedName), buffer);
  const next: CmsImageRecord = {
    ...record,
    filename: storedName,
    mimeType,
    fileSizeBytes: buffer.length,
  };
  storage.draft.images[id] = next;
  storage.published.images[id] = next;
  storage.draftUpdatedAt = new Date().toISOString();
  await writeStorage(storage);
  return next;
}

export async function getImageRecord(id: string): Promise<CmsImageRecord | null> {
  const site = await loadCmsSite();
  return site.images[id] ?? null;
}

export async function deleteImage(id: string): Promise<boolean> {
  const storage = await readStorage();
  const record = storage.draft.images[id];
  if (!record) return false;
  try {
    await fs.unlink(path.join(getUploadsDir(), record.filename));
  } catch {
    /* file may already be gone */
  }
  delete storage.draft.images[id];
  delete storage.published.images[id];
  storage.draftUpdatedAt = new Date().toISOString();
  await writeStorage(storage);
  return true;
}

export async function readImageFile(filename: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(getUploadsDir(), filename));
  } catch {
    return null;
  }
}

export { imagePublicUrl, DEFAULT_CMS_SITE };
