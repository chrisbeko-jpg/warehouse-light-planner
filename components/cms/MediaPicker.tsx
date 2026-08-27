"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { CmsImageRecord } from "@/types/cms";
import { cmsFetch } from "@/lib/cms/admin-client";
import { readMediaId } from "@/lib/cms/media";
import { resolveCmsImageUrl } from "@/lib/cms/resolve-image-url";
import { imagePublicUrl } from "@/lib/cms/image-url";
import { validateMediaUpload } from "@/lib/cms/media-upload";

interface MediaApiRecord {
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
  createdAt: string;
  updatedAt: string;
}

function toImageRecord(media: MediaApiRecord): CmsImageRecord {
  return {
    id: media.id,
    storageKey: media.filename,
    url: media.url.startsWith("http") ? media.url : undefined,
    filename: media.filename,
    originalFilename: media.originalFilename,
    mimeType: media.mimeType,
    alt: media.altText,
    title: media.title,
    fileSizeBytes: media.size,
    width: media.width,
    height: media.height,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
  };
}

export function MediaPicker({
  images,
  value,
  onChange,
  onImagesChange,
  label = "Afbeelding",
}: {
  images: Record<string, CmsImageRecord>;
  value?: string | null;
  onChange: (mediaId: string | undefined) => void;
  onImagesChange?: (images: Record<string, CmsImageRecord>) => void;
  label?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaId = readMediaId({ mediaId: value, imageId: value });
  const selected = mediaId ? images[mediaId] : null;

  const uploadFile = async (file: File) => {
    const validationError = validateMediaUpload({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await cmsFetch<{
        success: boolean;
        message?: string;
        media: MediaApiRecord;
      }>("/api/internal/media", {
        method: "POST",
        body: (() => {
          const form = new FormData();
          form.append("file", file);
          form.append("alt", file.name.replace(/\.[^.]+$/, ""));
          form.append("title", file.name.replace(/\.[^.]+$/, ""));
          return form;
        })(),
      });

      if (!response.success) {
        throw new Error(response.message ?? "Upload mislukt.");
      }

      const record = toImageRecord(response.media);
      const nextImages = { ...images, [record.id]: record };
      onImagesChange?.(nextImages);
      onChange(record.id);
      setMessage("Afbeelding geüpload en geselecteerd.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload mislukt.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2" data-testid="media-picker" data-selected-media-id={mediaId ?? ""}>
      <label className="block text-sm">
        {label}
        <select
          className="mt-1 w-full rounded border border-[var(--lp-border)] px-3 py-2"
          value={mediaId ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          data-testid="media-picker-select"
        >
          <option value="">Geen afbeelding</option>
          {mediaId && !selected && <option value={mediaId}>{mediaId}</option>}
          {Object.values(images).map((img) => (
            <option key={img.id} value={img.id}>
              {img.title ?? img.filename} — {img.alt}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-[var(--lp-border)] px-3 py-1.5 text-xs"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "Uploaden..." : "Nieuwe upload"}
        </button>
        {mediaId && (
          <button
            type="button"
            className="rounded border border-[var(--lp-border)] px-3 py-1.5 text-xs"
            onClick={() => onChange(undefined)}
          >
            Verwijder selectie
          </button>
        )}
        <Link href="/internal/content/media" className="rounded border border-[var(--lp-border)] px-3 py-1.5 text-xs no-underline">
          Mediabibliotheek
        </Link>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadFile(file);
        }}
      />

      {selected ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveCmsImageUrl(images, selected.id) ?? imagePublicUrl(selected.id)}
          alt={selected.alt}
          className="h-24 w-auto rounded-lg border border-[var(--lp-border)] object-cover"
          data-testid="media-picker-preview"
        />
      ) : mediaId ? (
        <p className="text-xs text-[var(--lp-text-secondary)]" data-testid="media-picker-selected-id">
          Geselecteerd: {mediaId}
        </p>
      ) : null}

      {message && <p className="text-xs text-[var(--lp-green-dark)]">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** @deprecated use MediaPicker */
export const ImageSelect = MediaPicker;
