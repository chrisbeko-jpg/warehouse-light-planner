import path from "path";
import type { CmsImageRecord } from "@/types/cms";
import {
  deleteMediaBinary,
  getStorageConfigurationError,
  readMediaBinary,
  readSiteStorage,
  uploadMediaBinary,
  writeSiteStorage,
} from "@/lib/cms/blob-storage";
import {
  inferMimeType,
  isSafeSvg,
  readImageDimensions,
  validateMediaUpload,
} from "@/lib/cms/media-upload";
import { DEFAULT_CMS_SITE } from "@/lib/cms/defaults";
import {
  mergeSitePayload,
  payloadToPublicContent,
} from "@/lib/cms/merge";
import { imagePublicUrl } from "@/lib/cms/image-url";
import type {
  CmsPage,
  CmsSiteContent,
  CmsSitePayload,
  CmsSiteStorage,
} from "@/types/cms";

export interface CmsMediaApiRecord {
  id: string;
  url: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  title: string;
  altText: string;
  storageKey: string;
  createdAt: string;
  updatedAt: string;
}

function normalizeImageRecord(record: CmsImageRecord): CmsImageRecord {
  return {
    ...record,
    storageKey: record.storageKey ?? record.filename,
    originalFilename: record.originalFilename ?? record.filename,
    updatedAt: record.updatedAt ?? record.createdAt,
  };
}

export function toMediaApiRecord(record: CmsImageRecord): CmsMediaApiRecord {
  const normalized = normalizeImageRecord(record);
  return {
    id: normalized.id,
    url: normalized.url ?? imagePublicUrl(normalized.id),
    filename: normalized.filename,
    originalFilename: normalized.originalFilename ?? normalized.filename,
    mimeType: normalized.mimeType,
    size: normalized.fileSizeBytes ?? 0,
    width: normalized.width,
    height: normalized.height,
    title: normalized.title ?? normalized.alt,
    altText: normalized.alt,
    storageKey: normalized.storageKey,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt ?? normalized.createdAt,
  };
}

async function readStorage(): Promise<CmsSiteStorage> {
  return readSiteStorage();
}

async function writeStorage(storage: CmsSiteStorage): Promise<void> {
  await writeSiteStorage(storage);
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
  const storageError = getStorageConfigurationError();
  if (storageError) throw new Error(storageError);

  const validationError = validateMediaUpload({
    filename,
    mimeType,
    size: buffer.length,
  });
  if (validationError) throw new Error(validationError);

  const resolvedMime = inferMimeType(filename, mimeType);
  if (!resolvedMime) throw new Error("Dit bestandstype wordt niet ondersteund.");
  if (resolvedMime === "image/svg+xml" && !isSafeSvg(buffer)) {
    throw new Error("SVG niet toegestaan (onveilige inhoud)");
  }

  const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ext = path.extname(filename) || ".jpg";
  const storedName = `${id}${ext}`;
  const storageKey = `cms/media/${storedName}`;
  const uploaded = await uploadMediaBinary(storageKey, buffer, resolvedMime);
  const dimensions = readImageDimensions(buffer, resolvedMime);
  const now = new Date().toISOString();

  const record: CmsImageRecord = {
    id,
    storageKey: uploaded.storageKey,
    url: uploaded.url.startsWith("http") ? uploaded.url : undefined,
    filename: storedName,
    originalFilename: filename,
    mimeType: resolvedMime,
    alt,
    title: title || alt || filename,
    fileSizeBytes: buffer.length,
    width: dimensions.width,
    height: dimensions.height,
    createdAt: now,
    updatedAt: now,
  };

  const storage = await readStorage();
  storage.draft.images[id] = record;
  storage.published.images[id] = record;
  storage.draftUpdatedAt = now;
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
  const next = normalizeImageRecord({
    ...record,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
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

  const validationError = validateMediaUpload({
    filename,
    mimeType,
    size: buffer.length,
  });
  if (validationError) throw new Error(validationError);

  const resolvedMime = inferMimeType(filename, mimeType);
  if (!resolvedMime) throw new Error("Dit bestandstype wordt niet ondersteund.");
  if (resolvedMime === "image/svg+xml" && !isSafeSvg(buffer)) {
    throw new Error("SVG niet toegestaan (onveilige inhoud)");
  }

  await deleteMediaBinary(record);
  const ext = path.extname(filename) || path.extname(record.filename) || ".jpg";
  const storedName = `${id}${ext}`;
  const storageKey = `cms/media/${storedName}`;
  const uploaded = await uploadMediaBinary(storageKey, buffer, resolvedMime);
  const dimensions = readImageDimensions(buffer, resolvedMime);
  const next = normalizeImageRecord({
    ...record,
    storageKey: uploaded.storageKey,
    url: uploaded.url.startsWith("http") ? uploaded.url : undefined,
    filename: path.basename(uploaded.storageKey),
    originalFilename: filename,
    mimeType: resolvedMime,
    fileSizeBytes: buffer.length,
    width: dimensions.width,
    height: dimensions.height,
    updatedAt: new Date().toISOString(),
  });
  storage.draft.images[id] = next;
  storage.published.images[id] = next;
  storage.draftUpdatedAt = new Date().toISOString();
  await writeStorage(storage);
  return next;
}

export async function getImageRecord(id: string): Promise<CmsImageRecord | null> {
  const site = await loadCmsSite();
  const record = site.images[id];
  return record ? normalizeImageRecord(record) : null;
}

export async function deleteImage(id: string): Promise<boolean> {
  const storage = await readStorage();
  const record = storage.draft.images[id];
  if (!record) return false;
  await deleteMediaBinary(record);
  delete storage.draft.images[id];
  delete storage.published.images[id];
  storage.draftUpdatedAt = new Date().toISOString();
  await writeStorage(storage);
  return true;
}

export async function readImageFile(record: CmsImageRecord): Promise<Buffer | null> {
  return readMediaBinary(normalizeImageRecord(record));
}

export { imagePublicUrl, DEFAULT_CMS_SITE, getStorageConfigurationError };
