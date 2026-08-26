import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_CMS_SITE } from "@/lib/cms/defaults";
import { getCmsDir, getUploadsDir } from "@/lib/storage/data-dir";
import type { CmsImageRecord, CmsPage, CmsSiteContent, CmsWizardContent } from "@/types/cms";

const SITE_FILE = "site.json";

function mergeWizardContent(stored?: Partial<CmsWizardContent>): CmsWizardContent {
  const defaults = DEFAULT_CMS_SITE.wizard;
  if (!stored) return defaults;

  const mergeChoices = <T extends { id: string }>(defaultItems: T[], storedItems?: T[]): T[] => {
    if (!storedItems?.length) return defaultItems;
    const byId = new Map(storedItems.map((item) => [item.id, item]));
    return defaultItems.map((item) => ({ ...item, ...byId.get(item.id) }));
  };

  return {
    roomChoices: mergeChoices(defaults.roomChoices, stored.roomChoices),
    atmosphereChoices: mergeChoices(defaults.atmosphereChoices, stored.atmosphereChoices),
  };
}

export async function loadCmsSite(): Promise<CmsSiteContent> {
  const filePath = path.join(getCmsDir(), SITE_FILE);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const stored = JSON.parse(raw) as Partial<CmsSiteContent>;
    return {
      ...DEFAULT_CMS_SITE,
      ...stored,
      homepage: stored.homepage ?? DEFAULT_CMS_SITE.homepage,
      pages: { ...DEFAULT_CMS_SITE.pages, ...stored.pages },
      images: { ...DEFAULT_CMS_SITE.images, ...stored.images },
      wizard: mergeWizardContent(stored.wizard),
    };
  } catch {
    return DEFAULT_CMS_SITE;
  }
}

export async function saveCmsSite(content: CmsSiteContent): Promise<void> {
  const dir = getCmsDir();
  await fs.mkdir(dir, { recursive: true });
  const payload: CmsSiteContent = {
    ...content,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(dir, SITE_FILE), JSON.stringify(payload, null, 2), "utf8");
}

export async function getCmsPage(slug: string): Promise<CmsPage | null> {
  const site = await loadCmsSite();
  if (slug === "/" || slug === "") return site.homepage;
  const key = slug.replace(/^\//, "");
  return site.pages[key] ?? null;
}

export async function saveCmsPage(slug: string, page: CmsPage): Promise<void> {
  const site = await loadCmsSite();
  if (slug === "/" || slug === "") {
    site.homepage = page;
  } else {
    site.pages[slug.replace(/^\//, "")] = page;
  }
  await saveCmsSite(site);
}

export async function saveUploadedImage(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  alt: string,
): Promise<CmsImageRecord> {
  const site = await loadCmsSite();
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
    createdAt: new Date().toISOString(),
  };
  site.images[id] = record;
  await saveCmsSite(site);
  return record;
}

export async function getImageRecord(id: string): Promise<CmsImageRecord | null> {
  const site = await loadCmsSite();
  return site.images[id] ?? null;
}

export async function deleteImage(id: string): Promise<boolean> {
  const site = await loadCmsSite();
  const record = site.images[id];
  if (!record) return false;
  try {
    await fs.unlink(path.join(getUploadsDir(), record.filename));
  } catch {
    /* file may already be gone */
  }
  delete site.images[id];
  await saveCmsSite(site);
  return true;
}

export async function readImageFile(filename: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(getUploadsDir(), filename));
  } catch {
    return null;
  }
}

export function imagePublicUrl(id: string): string {
  return `/api/cms/images/${id}`;
}
