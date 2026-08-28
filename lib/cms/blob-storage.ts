import { del, get, list, put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import {
  getBlobCommandOptions,
  isBlobStorageConfigured,
} from "@/lib/cms/blob-config";
import { getCmsDir, getUploadsDir } from "@/lib/storage/data-dir";
import type { CmsSiteStorage } from "@/types/cms";
import { normalizeStorage } from "@/lib/cms/merge";
import {
  CMS_LEGACY_SITE_PATH,
  CMS_STATE_POINTER_PATH,
  CMS_VERSION_PREFIX,
  CMS_VERSION_RETENTION,
  createCmsVersionPath,
  parseSiteStorageJson,
  pruneVersionPaths,
  serializeSiteStorage,
  sortVersionPathsDesc,
  type CmsStoragePointer,
} from "@/lib/cms/site-storage-versioning";

import { STORAGE_NOT_CONFIGURED_MESSAGE } from "@/lib/cms/storage-constants";

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

function localCmsRoot(): string {
  return getCmsDir();
}

function localPointerPath(): string {
  return path.join(localCmsRoot(), "state-pointer.json");
}

function localVersionFullPath(versionPath: string): string {
  const relative = versionPath.startsWith(CMS_VERSION_PREFIX)
    ? versionPath.slice(CMS_VERSION_PREFIX.length)
    : versionPath;
  return path.join(localCmsRoot(), "versions", relative);
}

async function readLocalPointer(): Promise<CmsStoragePointer | null> {
  try {
    const raw = await fs.readFile(localPointerPath(), "utf8");
    return JSON.parse(raw) as CmsStoragePointer;
  } catch {
    return null;
  }
}

async function listLocalVersionPaths(): Promise<string[]> {
  const versionsDir = path.join(localCmsRoot(), "versions");
  try {
    const entries = await fs.readdir(versionsDir);
    return entries.filter((name) => name.endsWith(".json")).map((name) => `${CMS_VERSION_PREFIX}${name}`);
  } catch {
    return [];
  }
}

async function pruneLocalVersions(): Promise<void> {
  const paths = await listLocalVersionPaths();
  const remove = pruneVersionPaths(paths, CMS_VERSION_RETENTION);
  await Promise.all(
    remove.map(async (versionPath) => {
      try {
        await fs.unlink(localVersionFullPath(versionPath));
      } catch {
        /* ignore */
      }
    }),
  );
}

async function readLocalSiteStorageAtPath(versionPath: string): Promise<CmsSiteStorage | null> {
  try {
    const raw = await fs.readFile(localVersionFullPath(versionPath), "utf8");
    return normalizeStorage(parseSiteStorageJson(raw));
  } catch {
    return null;
  }
}

async function readLocalSiteStorage(): Promise<CmsSiteStorage | null> {
  const pointer = await readLocalPointer();
  if (pointer?.versionPath) {
    const fromPointer = await readLocalSiteStorageAtPath(pointer.versionPath);
    if (fromPointer) return fromPointer;
  }

  const versions = sortVersionPathsDesc(await listLocalVersionPaths());
  for (const versionPath of versions) {
    const storage = await readLocalSiteStorageAtPath(versionPath);
    if (storage) return storage;
  }

  try {
    const legacyRaw = await fs.readFile(path.join(localCmsRoot(), "site.json"), "utf8");
    return normalizeStorage(parseSiteStorageJson(legacyRaw));
  } catch {
    return null;
  }
}

async function writeLocalSiteStorage(storage: CmsSiteStorage): Promise<string> {
  const versionPath = createCmsVersionPath();
  const fullPath = localVersionFullPath(versionPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, serializeSiteStorage(storage), "utf8");

  const pointer: CmsStoragePointer = {
    versionPath,
    writtenAt: new Date().toISOString(),
  };
  await fs.writeFile(localPointerPath(), JSON.stringify(pointer, null, 2), "utf8");
  await pruneLocalVersions();
  return versionPath;
}

async function readBlobJson(pathname: string): Promise<string | null> {
  try {
    const listed = await list({
      prefix: pathname,
      limit: 10,
      ...getBlobCommandOptions(),
    });
    const blob = listed.blobs.find((entry) => entry.pathname === pathname);
    if (blob?.url) {
      const response = await fetch(blob.url, { cache: "no-store" });
      if (response.ok) return await response.text();
    }

    const result = await get(pathname, {
      access: "public",
      ...getBlobCommandOptions(),
    });
    if (!result || result.statusCode === 304 || !result.stream) return null;
    return await new Response(result.stream).text();
  } catch {
    return null;
  }
}

async function readBlobPointer(): Promise<CmsStoragePointer | null> {
  const raw = await readBlobJson(CMS_STATE_POINTER_PATH);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CmsStoragePointer;
  } catch {
    return null;
  }
}

async function listBlobVersionPaths(): Promise<string[]> {
  try {
    const result = await list({
      prefix: CMS_VERSION_PREFIX,
      ...getBlobCommandOptions(),
    });
    return result.blobs.map((blob) => blob.pathname).filter((pathname) => pathname.endsWith(".json"));
  } catch {
    return [];
  }
}

async function pruneBlobVersions(): Promise<void> {
  const paths = sortVersionPathsDesc(await listBlobVersionPaths());
  const remove = paths.slice(CMS_VERSION_RETENTION);
  for (const versionPath of remove) {
    try {
      const listed = await list({ prefix: versionPath, ...getBlobCommandOptions() });
      const blob = listed.blobs.find((entry) => entry.pathname === versionPath);
      if (blob?.url) await del(blob.url, getBlobCommandOptions());
    } catch {
      /* ignore cleanup failures */
    }
  }
}

async function readBlobSiteStorageAtPath(versionPath: string): Promise<CmsSiteStorage | null> {
  const raw = await readBlobJson(versionPath);
  if (!raw) return null;
  return normalizeStorage(parseSiteStorageJson(raw));
}

async function readBlobSiteStorage(): Promise<CmsSiteStorage | null> {
  const pointer = await readBlobPointer();
  if (pointer?.versionPath) {
    const fromPointer = await readBlobSiteStorageAtPath(pointer.versionPath);
    if (fromPointer) return fromPointer;
  }

  const versions = sortVersionPathsDesc(await listBlobVersionPaths());
  for (const versionPath of versions) {
    const storage = await readBlobSiteStorageAtPath(versionPath);
    if (storage) return storage;
  }

  return readBlobSiteStorageAtPath(CMS_LEGACY_SITE_PATH);
}

async function writeBlobSiteStorage(storage: CmsSiteStorage): Promise<string> {
  const versionPath = createCmsVersionPath();
  const body = serializeSiteStorage(storage);

  await put(versionPath, body, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
    ...getBlobCommandOptions(),
  });

  const pointer: CmsStoragePointer = {
    versionPath,
    writtenAt: new Date().toISOString(),
  };

  await put(CMS_STATE_POINTER_PATH, JSON.stringify(pointer), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    ...getBlobCommandOptions(),
  });

  await pruneBlobVersions();
  return versionPath;
}

export async function readSiteStorage(): Promise<CmsSiteStorage> {
  try {
    if (isBlobStorageConfigured()) {
      const blobStorage = await readBlobSiteStorage();
      if (blobStorage) return blobStorage;
    }

    const localStorage = await readLocalSiteStorage();
    if (localStorage) return localStorage;
  } catch (error) {
    console.error("Failed to read CMS storage, using defaults:", error);
  }

  return normalizeStorage(undefined);
}

/** Read persisted JSON without merge defaults — for diagnostics only. */
export async function readPersistedSiteStorageRaw(): Promise<{
  storage: CmsSiteStorage;
  source: "blob-version" | "local-version" | "legacy" | "default";
  versionPath?: string;
}> {
  if (isBlobStorageConfigured()) {
    const pointer = await readBlobPointer();
    if (pointer?.versionPath) {
      const raw = await readBlobJson(pointer.versionPath);
      if (raw) {
        return {
          storage: parseSiteStorageJson(raw),
          source: "blob-version",
          versionPath: pointer.versionPath,
        };
      }
    }
    const legacyRaw = await readBlobJson(CMS_LEGACY_SITE_PATH);
    if (legacyRaw) {
      return { storage: parseSiteStorageJson(legacyRaw), source: "legacy", versionPath: CMS_LEGACY_SITE_PATH };
    }
  }

  const pointer = await readLocalPointer();
  if (pointer?.versionPath) {
    try {
      const raw = await fs.readFile(localVersionFullPath(pointer.versionPath), "utf8");
      return {
        storage: parseSiteStorageJson(raw),
        source: "local-version",
        versionPath: pointer.versionPath,
      };
    } catch {
      /* fall through */
    }
  }

  try {
    const raw = await fs.readFile(path.join(localCmsRoot(), "site.json"), "utf8");
    return { storage: parseSiteStorageJson(raw), source: "legacy", versionPath: "site.json" };
  } catch {
    return { storage: normalizeStorage(undefined) as CmsSiteStorage, source: "default" };
  }
}

export async function readSiteStorageAtVersion(versionPath: string): Promise<CmsSiteStorage | null> {
  if (isBlobStorageConfigured()) {
    return readBlobSiteStorageAtPath(versionPath);
  }
  return readLocalSiteStorageAtPath(versionPath);
}

export async function writeSiteStorage(storage: CmsSiteStorage): Promise<string> {
  const configError = getStorageConfigurationError();
  if (configError) {
    throw new Error(configError);
  }

  if (isBlobStorageConfigured()) {
    return writeBlobSiteStorage(storage);
  }

  return writeLocalSiteStorage(storage);
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
      const response = await fetch(record.url, { cache: "no-store" });
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
