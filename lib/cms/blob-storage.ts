import { del, get, put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import {
  getBlobCommandOptions,
  isBlobStorageConfigured,
} from "@/lib/cms/blob-config";
import { getCmsDir, getUploadsDir } from "@/lib/storage/data-dir";
import type { CmsSiteStorage } from "@/types/cms";
import { normalizeStorage } from "@/lib/cms/merge";

import { STORAGE_NOT_CONFIGURED_MESSAGE } from "@/lib/cms/storage-constants";

const SITE_BLOB_PATH = "cms/site.json";

export { STORAGE_NOT_CONFIGURED_MESSAGE };
export { isBlobStorageConfigured } from "@/lib/cms/blob-config";

export function requiresBlobStorage(): boolean {
  return Boolean(process.env.VERCEL);
}

export function getStorageConfigurationError(): string | null {
  if (requiresBlobStorage() && !isBlobStorageConfigured()) {
    return STORAGE_NOT_CONFIGURED_MESSAGE;
  }
  return null;
}

function localSitePath(): string {
  return path.join(getCmsDir(), "site.json");
}

async function readLocalSiteStorage(): Promise<CmsSiteStorage | null> {
  try {
    const raw = await fs.readFile(localSitePath(), "utf8");
    return normalizeStorage(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeLocalSiteStorage(storage: CmsSiteStorage): Promise<void> {
  const dir = getCmsDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(localSitePath(), JSON.stringify(storage, null, 2), "utf8");
}

async function readBlobSiteStorage(): Promise<CmsSiteStorage | null> {
  try {
    const result = await get(SITE_BLOB_PATH, {
      access: "public",
      ...getBlobCommandOptions(),
    });
    if (!result || result.statusCode === 304 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    return normalizeStorage(JSON.parse(text));
  } catch {
    return null;
  }
}

async function writeBlobSiteStorage(storage: CmsSiteStorage): Promise<void> {
  await put(SITE_BLOB_PATH, JSON.stringify(storage, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    ...getBlobCommandOptions(),
  });
}

export async function readSiteStorage(): Promise<CmsSiteStorage> {
  const configError = getStorageConfigurationError();
  if (configError) {
    throw new Error(configError);
  }

  if (isBlobStorageConfigured()) {
    const blobStorage = await readBlobSiteStorage();
    if (blobStorage) return blobStorage;
  }

  const localStorage = await readLocalSiteStorage();
  if (localStorage) return localStorage;

  return normalizeStorage(undefined);
}

export async function writeSiteStorage(storage: CmsSiteStorage): Promise<void> {
  const configError = getStorageConfigurationError();
  if (configError) {
    throw new Error(configError);
  }

  if (isBlobStorageConfigured()) {
    await writeBlobSiteStorage(storage);
    return;
  }

  await writeLocalSiteStorage(storage);
}

export async function uploadMediaBinary(
  storageKey: string,
  buffer: Buffer,
  mimeType: string,
): Promise<{ url: string; storageKey: string }> {
  const configError = getStorageConfigurationError();
  if (configError) {
    throw new Error(configError);
  }

  if (isBlobStorageConfigured()) {
    const blob = await put(storageKey, buffer, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: true,
      ...getBlobCommandOptions(),
    });
    return { url: blob.url, storageKey: blob.pathname };
  }

  const uploadsDir = getUploadsDir();
  await fs.mkdir(uploadsDir, { recursive: true });
  const filename = path.basename(storageKey);
  await fs.writeFile(path.join(uploadsDir, filename), buffer);
  return { url: "", storageKey: filename };
}

export async function deleteMediaBinary(record: {
  storageKey: string;
  url?: string;
  filename: string;
}): Promise<void> {
  if (isBlobStorageConfigured() && record.url) {
    await del(record.url, getBlobCommandOptions());
    return;
  }

  try {
    await fs.unlink(path.join(getUploadsDir(), record.filename));
  } catch {
    /* ignore missing local file */
  }
}

export async function readMediaBinary(record: {
  storageKey?: string;
  url?: string;
  filename: string;
}): Promise<Buffer | null> {
  if (record.url?.startsWith("http")) {
    try {
      const response = await fetch(record.url);
      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
    } catch {
      return null;
    }
  }

  try {
    return await fs.readFile(path.join(getUploadsDir(), record.filename));
  } catch {
    return null;
  }
}
