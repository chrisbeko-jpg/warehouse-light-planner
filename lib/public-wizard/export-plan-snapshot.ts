import {
  computePublicHeatmap,
  HEATMAP_LEVEL_COLORS,
} from "@/lib/public-wizard/heatmap";
import { getPublicProduct } from "@/lib/public-wizard/products";
import { flattenVertices } from "@/lib/polygon-area";
import type { Point2D } from "@/types/floor-plan";
import type { PlacedPublicFixture } from "@/types/public-wizard";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawPlan(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  roomVertices: Point2D[],
  fixtures: PlacedPublicFixture[],
  pixelsPerMeter: number,
  heatmap: boolean,
  targetLux: number,
  ceilingHeightM: number,
) {
  ctx.drawImage(img, 0, 0, img.width, img.height);

  if (heatmap && fixtures.length > 0 && roomVertices.length >= 3) {
    const cells = computePublicHeatmap(
      fixtures,
      roomVertices,
      pixelsPerMeter,
      ceilingHeightM,
      targetLux,
    );
    for (const cell of cells) {
      ctx.fillStyle = HEATMAP_LEVEL_COLORS[cell.level];
      const size = Math.max(4, 0.35 * pixelsPerMeter);
      ctx.fillRect(cell.x, cell.y, size, size);
    }
  }

  if (roomVertices.length >= 3) {
    ctx.beginPath();
    ctx.moveTo(roomVertices[0]!.x, roomVertices[0]!.y);
    for (let i = 1; i < roomVertices.length; i++) {
      ctx.lineTo(roomVertices[i]!.x, roomVertices[i]!.y);
    }
    ctx.closePath();
    ctx.fillStyle = heatmap ? "rgba(24,166,106,0.08)" : "rgba(24,166,106,0.15)";
    ctx.fill();
    ctx.strokeStyle = "#18A66A";
    ctx.lineWidth = Math.max(2, pixelsPerMeter * 0.01);
    ctx.stroke();
  }

  for (const fixture of fixtures) {
    const product = getPublicProduct(fixture.productId);
    const sizePx = product.widthM * pixelsPerMeter;
    const x = fixture.x - sizePx / 2;
    const y = fixture.y - sizePx / 2;
    ctx.fillStyle = product.category === "downlight" ? "#94a3b8" : "#18A66A";
    ctx.strokeStyle = "#087A4C";
    ctx.lineWidth = Math.max(1, sizePx * 0.04);
    if (product.category === "downlight") {
      ctx.beginPath();
      ctx.arc(fixture.x, fixture.y, sizePx / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(x, y, sizePx, sizePx);
      ctx.strokeRect(x, y, sizePx, sizePx);
    }
  }
}

export async function exportPlanSnapshots(params: {
  backgroundDataUrl: string;
  backgroundWidth: number;
  backgroundHeight: number;
  roomVertices: Point2D[];
  fixtures: PlacedPublicFixture[];
  pixelsPerMeter: number;
  targetLux: number;
  ceilingHeightM: number;
}): Promise<{ lightPlanPng: string; heatmapPng: string }> {
  const img = await loadImage(params.backgroundDataUrl);
  const width = params.backgroundWidth || img.width;
  const height = params.backgroundHeight || img.height;

  const lightCanvas = document.createElement("canvas");
  lightCanvas.width = width;
  lightCanvas.height = height;
  const lightCtx = lightCanvas.getContext("2d");
  if (!lightCtx) throw new Error("Canvas niet beschikbaar");
  drawPlan(
    lightCtx,
    img,
    params.roomVertices,
    params.fixtures,
    params.pixelsPerMeter,
    false,
    params.targetLux,
    params.ceilingHeightM,
  );

  const heatCanvas = document.createElement("canvas");
  heatCanvas.width = width;
  heatCanvas.height = height;
  const heatCtx = heatCanvas.getContext("2d");
  if (!heatCtx) throw new Error("Canvas niet beschikbaar");
  drawPlan(
    heatCtx,
    img,
    params.roomVertices,
    params.fixtures,
    params.pixelsPerMeter,
    true,
    params.targetLux,
    params.ceilingHeightM,
  );

  const lightPlanPng = lightCanvas.toDataURL("image/png").split(",")[1] ?? "";
  const heatmapPng = heatCanvas.toDataURL("image/png").split(",")[1] ?? "";
  return { lightPlanPng, heatmapPng };
}

/** Expose polygon area helper for tests via flattened vertices. */
export { flattenVertices };
