import path from "path";
import type { CmsImageRecord } from "@/types/cms";
import {
  deleteMediaBinary,
  getStorageConfigurationError,
  readMediaBinary,
  readSiteStorage,
  readSiteStorageAtVersion,
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
  mergeWizardContent,
  payloadToPublicContent,
} from "@/lib/cms/merge";
import { normalizePage, normalizeWizard } from "@/lib/cms/normalize-media";
import {
  assertMediaReferencesPreserved,
  logMediaReferenceStage,
  MediaPersistenceError,
  snapshotPageMediaReferences,
  snapshotSiteMediaReferences,
  snapshotAllPageBlockMedia,
  type MediaReferenceSnapshot,
} from "@/lib/cms/media-reference-audit";
import { syncReferencedImages } from "@/lib/cms/sync-referenced-images";
import { revalidateCmsPublicRoutes } from "@/lib/cms/revalidate-cms";
import { imagePublicUrl } from "@/lib/cms/image-url";
import type {
  CmsPage,
  CmsSiteContent,
  CmsSitePayload,
  CmsSiteStorage,
} from "@/types/cms";

export interface CmsSaveResult {
  site: CmsSiteContent;
  debugMediaReferences?: MediaReferenceSnapshot;
  versionPath?: string;
}

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

const AUDIT_ENABLED = process.env.CMS_MEDIA_AUDIT === "1";

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

let storageMutationQueue: Promise<unknown> = Promise.resolve();

async function withStorageMutation<T>(mutate: () => Promise<T>): Promise<T> {
  const run = storageMutationQueue.then(mutate, mutate);
  storageMutationQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function draftContentFromStorage(storage: CmsSiteStorage): CmsSiteContent {
  return payloadToPublicContent(storage.draft, {
    publishedAt: storage.publishedAt,
    draftUpdatedAt: storage.draftUpdatedAt,
  });
}

function publishedContentFromStorage(storage: CmsSiteStorage): CmsSiteContent {
  return payloadToPublicContent(storage.published, {
    publishedAt: storage.publishedAt,
    draftUpdatedAt: storage.draftUpdatedAt,
  });
}

function buildSaveResult(storage: CmsSiteStorage, versionPath?: string): CmsSaveResult {
  const site = draftContentFromStorage(storage);
  const result: CmsSaveResult = { site, versionPath };
  if (process.env.NODE_ENV !== "production" || AUDIT_ENABLED) {
    result.debugMediaReferences = snapshotSiteMediaReferences(storage.draft);
  }
  return result;
}

function auditStage(stage: string, payload: CmsSitePayload): void {
  if (!AUDIT_ENABLED) return;
  logMediaReferenceStage(stage, snapshotSiteMediaReferences(payload));
}

async function verifyPersistedDraftMatchesMemory(
  storage: CmsSiteStorage,
  expected: MediaReferenceSnapshot,
  context: string,
  savedPageKey?: string,
): Promise<string> {
  auditStage("BEFORE WRITE mediaIds", storage.draft);
  const versionPath = await writeSiteStorage(storage);
  auditStage("AFTER WRITE mediaIds (memory)", storage.draft);

  const persistedAtVersion = await readSiteStorageAtVersion(versionPath);
  if (!persistedAtVersion) {
    throw new MediaPersistenceError(
      "Afbeelding kon niet worden opgeslagen. De wijziging is niet toegepast (persisted read failed).",
      ["persisted version unreadable"],
    );
  }
  auditStage("AFTER READ mediaIds (written version)", persistedAtVersion.draft);

  const normalizedRead = await readStorage();
  auditStage("AFTER NORMALIZE mediaIds (readSiteStorage)", normalizedRead.draft);

  const snapshotOptions = savedPageKey ? { pageKey: savedPageKey } : undefined;

  assertMediaReferencesPreserved(
    expected,
    snapshotSiteMediaReferences(persistedAtVersion.draft, snapshotOptions),
    `${context}/written-version`,
  );
  assertMediaReferencesPreserved(
    expected,
    snapshotSiteMediaReferences(normalizedRead.draft, snapshotOptions),
    `${context}/normalized-read`,
  );

  return versionPath;
}

/** Public published CMS content. Never throws; falls back to defaults. */
export async function loadCmsSite(): Promise<CmsSiteContent> {
  try {
    const storage = await readStorage();
    return publishedContentFromStorage(storage);
  } catch (error) {
    console.error("Failed to load published CMS content, using defaults:", error);
    return payloadToPublicContent(mergeSitePayload(), {
      publishedAt: null,
      draftUpdatedAt: null,
    });
  }
}

/** Draft content for internal admin. Falls back to published/default content. */
export async function loadCmsDraft(): Promise<CmsSiteContent> {
  try {
    const storage = await readStorage();
    return draftContentFromStorage(storage);
  } catch (error) {
    console.error("Failed to load draft CMS content, using published/default fallback:", error);
    return loadCmsSite();
  }
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

export async function saveCmsDraft(payload: Partial<CmsSitePayload>): Promise<CmsSaveResult> {
  return withStorageMutation(async () => {
    const storage = await readStorage();
    const preservedImages = { ...storage.published.images, ...storage.draft.images };
    const mergedDraft = mergeSitePayload({ ...storage.draft, ...payload });
    if (payload.wizard) {
      mergedDraft.wizard = normalizeWizard(mergeWizardContent(payload.wizard));
    }
    if (payload.homepage) {
      mergedDraft.homepage = normalizePage(payload.homepage);
    }
    if (payload.pages) {
      mergedDraft.pages = {
        ...mergedDraft.pages,
        ...Object.fromEntries(
          Object.entries(payload.pages).map(([slug, page]) => [slug, normalizePage(page)]),
        ),
      };
    }
    syncReferencedImages(mergedDraft, preservedImages);
    mergedDraft.images = { ...preservedImages, ...mergedDraft.images, ...payload.images };

    const expected = snapshotSiteMediaReferences(mergedDraft);
    storage.draft = mergedDraft;
    storage.draftUpdatedAt = new Date().toISOString();

    assertMediaReferencesPreserved(expected, snapshotSiteMediaReferences(storage.draft), "saveCmsDraft/memory");
    const versionPath = await verifyPersistedDraftMatchesMemory(storage, expected, "saveCmsDraft");
    return buildSaveResult(storage, versionPath);
  });
}

export async function saveCmsDraftPage(slug: string, page: CmsPage): Promise<CmsSaveResult> {
  return withStorageMutation(async () => {
    const storage = await readStorage();
    const preservedImages = { ...storage.published.images, ...storage.draft.images };
    const key = slug.replace(/^\//, "");
    const normalizedPage = normalizePage({ ...page, updatedAt: new Date().toISOString() });
    const storageBase = mergeSitePayload(storage.draft);
    const pageRefs = snapshotPageMediaReferences(normalizedPage);
    const pageBlockMedia = snapshotAllPageBlockMedia(normalizedPage);
    const savedPageKey = key === "" || slug === "/" || key === "homepage" ? "homepage" : key;
    const mergedDraft =
      key === "" || slug === "/" || key === "homepage"
        ? mergeSitePayload({
            ...storage.draft,
            homepage: normalizedPage,
          })
        : mergeSitePayload({
            ...storage.draft,
            pages: { ...storage.draft.pages, [key]: normalizedPage },
          });
    syncReferencedImages(mergedDraft, preservedImages);
    mergedDraft.images = { ...preservedImages, ...mergedDraft.images };

    const expected: MediaReferenceSnapshot = {
      homepageHero: pageRefs.homepageHero ?? null,
      exampleSlots: pageRefs.exampleSlots ?? [],
      productItems: pageRefs.productItems ?? [],
      ogMediaId: pageRefs.ogMediaId ?? null,
      pageBlockMedia,
      wizardRooms: snapshotSiteMediaReferences(storageBase).wizardRooms,
      wizardAtmospheres: snapshotSiteMediaReferences(storageBase).wizardAtmospheres,
    };

    storage.draft = mergedDraft;
    storage.draftUpdatedAt = new Date().toISOString();

    assertMediaReferencesPreserved(
      expected,
      snapshotSiteMediaReferences(storage.draft, { pageKey: savedPageKey }),
      "saveCmsDraftPage/memory",
    );
    const versionPath = await verifyPersistedDraftMatchesMemory(
      storage,
      expected,
      "saveCmsDraftPage",
      savedPageKey,
    );
    return buildSaveResult(storage, versionPath);
  });
}

export async function publishCmsDraft(): Promise<CmsSaveResult> {
  return withStorageMutation(async () => {
    const storage = await readStorage();
    const now = new Date().toISOString();
    const expected = snapshotSiteMediaReferences(storage.draft);
    const mergedImages = { ...storage.published.images, ...storage.draft.images };
    storage.draft.images = mergedImages;
    storage.published = structuredClone(storage.draft);
    syncReferencedImages(storage.published, mergedImages);
    storage.published.images = { ...mergedImages, ...storage.published.images };
    storage.publishedAt = now;
    storage.draftUpdatedAt = now;

    assertMediaReferencesPreserved(expected, snapshotSiteMediaReferences(storage.published), "publish/memory");
    const versionPath = await verifyPersistedDraftMatchesMemory(storage, expected, "publish");

    revalidateCmsPublicRoutes();
    return {
      ...buildSaveResult(storage, versionPath),
      site: publishedContentFromStorage(storage),
    };
  });
}

export async function revertCmsDraft(): Promise<CmsSaveResult> {
  return withStorageMutation(async () => {
    const storage = await readStorage();
    storage.draft = structuredClone(storage.published);
    storage.draftUpdatedAt = new Date().toISOString();
    await writeSiteStorage(storage);
    return buildSaveResult(storage);
  });
}

/** @deprecated use saveCmsDraft */
export async function saveCmsSite(content: CmsSiteContent): Promise<void> {
  const storage = await readStorage();
  storage.draft = mergeSitePayload(content);
  storage.draftUpdatedAt = new Date().toISOString();
  storage.published = mergeSitePayload(content);
  storage.publishedAt = new Date().toISOString();
  await writeSiteStorage(storage);
}

export async function getCmsPage(slug: string, options?: { draft?: boolean }): Promise<CmsPage | null> {
  const site = options?.draft ? await loadCmsDraft() : await loadCmsSite();
  const key = slug.replace(/^\//, "");
  if (key === "" || key === "homepage") return site.homepage;
  return site.pages[key] ?? null;
}

export async function saveCmsPage(slug: string, page: CmsPage): Promise<CmsSaveResult> {
  return saveCmsDraftPage(slug, page);
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

  await withStorageMutation(async () => {
    const storage = await readStorage();
    storage.draft.images = { ...storage.draft.images, [id]: record };
    storage.published.images = { ...storage.published.images, [id]: record };
    storage.draftUpdatedAt = now;
    await writeSiteStorage(storage);
  });

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
  await writeSiteStorage(storage);
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
  await writeSiteStorage(storage);
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
  await writeSiteStorage(storage);
  return true;
}

export async function readImageFile(record: CmsImageRecord): Promise<Buffer | null> {
  return readMediaBinary(normalizeImageRecord(record));
}

export {
  imagePublicUrl,
  DEFAULT_CMS_SITE,
  getStorageConfigurationError,
  MediaPersistenceError,
};
