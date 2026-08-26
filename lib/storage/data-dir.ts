import path from "path";

/** Single persistent data root — never use /tmp for durable data. */
export function getDataDir(): string {
  return process.env.DATA_DIR ?? path.join(process.cwd(), "data");
}

export function getCmsDir(): string {
  return path.join(getDataDir(), "cms");
}

export function getUploadsDir(): string {
  return path.join(getDataDir(), "uploads");
}

export function getLeadsDir(): string {
  return path.join(getDataDir(), "leads");
}
