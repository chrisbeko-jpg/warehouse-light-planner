"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CmsImageRecord } from "@/types/cms";
import { cmsFetch } from "@/lib/cms/admin-client";
import { imagePublicUrl } from "@/lib/cms/image-url";
import { validateMediaUpload } from "@/lib/cms/media-upload";
import { STORAGE_NOT_CONFIGURED_MESSAGE } from "@/lib/cms/storage-constants";

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

function formatBytes(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

export function MediaLibraryClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<CmsImageRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(true);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const data = await cmsFetch<{
      storageReady: boolean;
      storageMessage: string | null;
      media: MediaApiRecord[];
    }>("/api/internal/media");
    setStorageReady(data.storageReady);
    setStorageMessage(data.storageMessage);
    setImages(
      data.media
        .map((item) => ({
          ...toImageRecord(item),
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }, []);

  useEffect(() => {
    void load().catch((err) => {
      setError(err instanceof Error ? err.message : "Media laden mislukt.");
    });
  }, [load]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const selectedValidationError = useMemo(() => {
    if (!selectedFile) return null;
    return validateMediaUpload({
      filename: selectedFile.name,
      mimeType: selectedFile.type,
      size: selectedFile.size,
    });
  }, [selectedFile]);

  const resetSelection = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadAlt("");
    setUploadTitle("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChosen = (file: File | undefined) => {
    setMessage(null);
    setError(null);
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadTitle(file.name.replace(/\.[^.]+$/, ""));
    setUploadAlt("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadSelected = async () => {
    if (!selectedFile || selectedValidationError || !storageReady) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("title", uploadTitle || selectedFile.name);
      form.append("altText", uploadAlt || uploadTitle || selectedFile.name);
      const data = await cmsFetch<{ success: boolean; message: string }>("/api/internal/media", {
        method: "POST",
        body: form,
      });
      setMessage(data.message || "Afbeelding opgeslagen");
      resetSelection();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload mislukt.");
    } finally {
      setUploading(false);
    }
  };

  const updateMeta = async (id: string, patch: { alt?: string; title?: string }) => {
    await cmsFetch(`/api/internal/cms/images/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setMessage("Opgeslagen.");
    await load();
  };

  const replaceFile = async (id: string, file: File) => {
    const validationError = validateMediaUpload({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    const form = new FormData();
    form.append("file", file);
    await cmsFetch(`/api/internal/cms/images/${id}`, { method: "PUT", body: form });
    setMessage("Afbeelding vervangen.");
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Afbeelding verwijderen?")) return;
    await cmsFetch(`/api/internal/cms/images/${id}`, { method: "DELETE" });
    setMessage("Afbeelding verwijderd.");
    await load();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Afbeeldingen / Media</h2>

      {!storageReady && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {storageMessage ?? STORAGE_NOT_CONFIGURED_MESSAGE}
        </p>
      )}

      {message && <p className="rounded-lg bg-[var(--lp-green-soft)] p-3 text-sm">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="lp-card space-y-4 p-6">
        <h3 className="font-bold">Upload image</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className="hidden"
          data-testid="media-file-input"
          onChange={(e) => handleFileChosen(e.target.files?.[0])}
        />

        <label className="block text-sm font-medium">
          Titel
          <input
            type="text"
            placeholder="Titel"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            data-testid="media-upload-title"
          />
        </label>
        <label className="block text-sm font-medium">
          Alt-tekst
          <input
            type="text"
            placeholder="Alt-tekst"
            value={uploadAlt}
            onChange={(e) => setUploadAlt(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            data-testid="media-upload-alt"
          />
        </label>

        <button
          type="button"
          className="lp-btn-secondary"
          data-testid="media-choose-file"
          onClick={() => fileInputRef.current?.click()}
        >
          {selectedFile ? selectedFile.name : "Browse"}
        </button>

        {selectedFile && (
          <div className="space-y-4 border-t border-[var(--lp-border)] pt-4" data-testid="media-upload-panel">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={uploadAlt || selectedFile.name}
                className="max-h-56 rounded-lg border border-[var(--lp-border)] object-contain"
                data-testid="media-upload-preview"
              />
            )}
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p data-testid="media-upload-filename">
                <span className="font-semibold">Bestand:</span> {selectedFile.name}
              </p>
              <p data-testid="media-upload-size">
                <span className="font-semibold">Grootte:</span> {formatBytes(selectedFile.size)}
              </p>
              <p data-testid="media-upload-mime">
                <span className="font-semibold">Type:</span> {selectedFile.type || "—"}
              </p>
            </div>

            {selectedValidationError && (
              <p className="text-sm text-red-600" data-testid="media-upload-validation">
                {selectedValidationError}
              </p>
            )}

            <button
              type="button"
              className="lp-btn-primary w-full py-3 text-base font-bold"
              data-testid="media-upload-submit"
              disabled={!storageReady || uploading || Boolean(selectedValidationError)}
              aria-disabled={!storageReady || uploading || Boolean(selectedValidationError)}
              onClick={() => void uploadSelected()}
            >
              {uploading ? "Uploaden..." : "Uploaden naar mediabibliotheek"}
            </button>

            {!storageReady && (
              <p className="text-sm text-red-600">
                {storageMessage ?? STORAGE_NOT_CONFIGURED_MESSAGE}
              </p>
            )}

            <button type="button" className="lp-btn-secondary w-full" onClick={resetSelection}>
              Annuleren
            </button>
          </div>
        )}

        <p className="text-xs text-[var(--lp-text-secondary)]">
          JPG, PNG, WebP (max. 10 MB). SVG alleen indien veilig (geen scripts).
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold">Mediabibliotheek</h3>
        {images.length === 0 && (
          <p className="text-sm text-[var(--lp-text-secondary)]" data-testid="media-library-empty">
            Nog geen afbeeldingen. Upload een bestand om te beginnen.
          </p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="media-library-grid">
        {images.map((img) => (
          <article key={img.id} className="lp-card overflow-hidden" data-testid={`media-item-${img.id}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePublicUrl(img.id)} alt={img.alt} className="aspect-video w-full object-cover" />
            <div className="space-y-2 p-4 text-sm">
              <p className="font-semibold">{img.title ?? img.filename}</p>
              <p className="text-xs text-[var(--lp-text-secondary)]">
                {img.originalFilename ?? img.filename} · {formatBytes(img.fileSizeBytes)} ·{" "}
                {new Date(img.createdAt).toLocaleDateString("nl-NL")}
              </p>
              <label className="block">
                Alt-tekst
                <input
                  className="mt-1 w-full rounded border px-2 py-1"
                  defaultValue={img.alt}
                  onBlur={(e) => {
                    if (e.target.value !== img.alt) void updateMeta(img.id, { alt: e.target.value });
                  }}
                />
              </label>
              <label className="block">
                Titel
                <input
                  className="mt-1 w-full rounded border px-2 py-1"
                  defaultValue={img.title ?? ""}
                  onBlur={(e) => {
                    if (e.target.value !== (img.title ?? "")) void updateMeta(img.id, { title: e.target.value });
                  }}
                />
              </label>
              <p className="break-all text-xs text-[var(--lp-text-secondary)]">{imagePublicUrl(img.id)}</p>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer rounded border px-2 py-1 text-xs">
                  Vervangen
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void replaceFile(img.id, f);
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs text-red-600"
                  onClick={() => void remove(img.id)}
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
