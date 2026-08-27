import { randomUUID } from "crypto";
import type { CmsSiteStorage } from "@/types/cms";

export const CMS_STATE_POINTER_PATH = "cms/state-pointer.json";
export const CMS_VERSION_PREFIX = "cms/versions/";
export const CMS_LEGACY_SITE_PATH = "cms/site.json";
export const CMS_VERSION_RETENTION = 20;

export interface CmsStoragePointer {
  versionPath: string;
  writtenAt: string;
}

export function createCmsVersionPath(now = new Date()): string {
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  return `${CMS_VERSION_PREFIX}${timestamp}-${randomUUID().slice(0, 8)}.json`;
}

export function parseVersionPathSortKey(versionPath: string): string {
  const fileName = versionPath.split("/").pop() ?? versionPath;
  return fileName.replace(/\.json$/, "");
}

export function sortVersionPathsDesc(paths: string[]): string[] {
  return [...paths].sort((a, b) => parseVersionPathSortKey(b).localeCompare(parseVersionPathSortKey(a)));
}

export function pruneVersionPaths(paths: string[], keep = CMS_VERSION_RETENTION): string[] {
  const sorted = sortVersionPathsDesc(paths);
  return sorted.slice(keep);
}

export function serializeSiteStorage(storage: CmsSiteStorage): string {
  return JSON.stringify(storage, null, 2);
}

export function parseSiteStorageJson(raw: string): CmsSiteStorage {
  return JSON.parse(raw) as CmsSiteStorage;
}
