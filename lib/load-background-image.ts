import type { BackgroundImage } from "@/types/floor-plan";

const PDF_RENDER_SCALE = 2;

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  return pdfjs;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Bestand kon niet worden gelezen."));
    reader.readAsDataURL(file);
  });
}

function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Afbeelding kon niet worden geladen."));
    image.src = dataUrl;
  });
}

async function renderPdfFirstPage(file: File): Promise<BackgroundImage> {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas kon niet worden aangemaakt.");
  }

  await page.render({ canvasContext: context, viewport, canvas }).promise;

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: viewport.width,
    height: viewport.height,
    mimeType: "application/pdf",
    fileName: file.name,
  };
}

async function loadRasterImage(file: File): Promise<BackgroundImage> {
  const dataUrl = await readFileAsDataUrl(file);
  const { width, height } = await loadImageDimensions(dataUrl);
  return {
    dataUrl,
    width,
    height,
    mimeType: file.type,
    fileName: file.name,
  };
}

export async function loadBackgroundFile(file: File): Promise<BackgroundImage> {
  if (file.type === "application/pdf") {
    return renderPdfFirstPage(file);
  }

  if (file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/jpg") {
    return loadRasterImage(file);
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") {
    return renderPdfFirstPage(file);
  }
  if (extension === "png" || extension === "jpg" || extension === "jpeg") {
    return loadRasterImage(file);
  }

  throw new Error("Alleen PDF, PNG of JPG wordt ondersteund.");
}

export const BACKGROUND_ACCEPT =
  "application/pdf,image/png,image/jpeg,image/jpg,.pdf,.png,.jpg,.jpeg";
