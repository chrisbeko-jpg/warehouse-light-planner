export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
] as const;

export type AllowedMediaMimeType = (typeof ALLOWED_MEDIA_MIME_TYPES)[number];

const EXTENSION_TO_MIME: Record<string, AllowedMediaMimeType> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export function inferMimeType(filename: string, declaredType: string): AllowedMediaMimeType | null {
  if (ALLOWED_MEDIA_MIME_TYPES.includes(declaredType as AllowedMediaMimeType)) {
    return declaredType as AllowedMediaMimeType;
  }
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  return ext ? EXTENSION_TO_MIME[ext] ?? null : null;
}

export function validateMediaUpload(input: {
  filename: string;
  mimeType: string;
  size: number;
}): string | null {
  const mimeType = inferMimeType(input.filename, input.mimeType);
  if (!mimeType) return "Dit bestandstype wordt niet ondersteund.";
  if (input.size <= 0) return "Dit bestandstype wordt niet ondersteund.";
  if (input.size > MAX_MEDIA_BYTES) return "De afbeelding is te groot.";
  return null;
}

export function isSafeSvg(buffer: Buffer): boolean {
  const text = buffer.toString("utf8").toLowerCase();
  return !text.includes("<script") && !text.includes("onload=") && !text.includes("onclick=");
}

export function readImageDimensions(
  buffer: Buffer,
  mimeType: string,
): { width?: number; height?: number } {
  if (mimeType === "image/png" && buffer.length >= 24) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (width > 0 && height > 0) return { width, height };
  }

  if ((mimeType === "image/jpeg" || mimeType === "image/jpg") && buffer.length > 4) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        if (width > 0 && height > 0) return { width, height };
      }
      offset += 2 + length;
    }
  }

  if (mimeType === "image/webp" && buffer.length >= 30) {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8X" && buffer.length >= 30) {
      const width = 1 + buffer.readUIntLE(24, 3);
      const height = 1 + buffer.readUIntLE(27, 3);
      return { width, height };
    }
    if (chunk === "VP8 " && buffer.length >= 30) {
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { width, height };
    }
  }

  return {};
}
