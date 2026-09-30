import { CEILING_GRID_M } from "@/lib/public-wizard/grid";
import type { Point2D } from "@/types/floor-plan";

export const MANUAL_FLOOR_PLAN_PPM = 120;
const CANVAS_PADDING_M = 1.2;

export interface ManualRoomDimensions {
  lengthM: number;
  widthM: number;
}

export interface ManualRoomScene {
  dataUrl: string;
  width: number;
  height: number;
  pixelsPerMeter: number;
  vertices: Point2D[];
  areaM2: number;
  lengthM: number;
  widthM: number;
}

function formatMetersLabel(value: number, digits = 2): string {
  return value.toFixed(digits).replace(".", ",");
}

function centeredGridOrigin(
  roomOrigin: number,
  roomSpanPx: number,
  gridStepPx: number,
): { origin: number; cells: number } {
  const cells = Math.max(1, Math.floor(roomSpanPx / gridStepPx));
  const usedSpan = cells * gridStepPx;
  const origin = roomOrigin + (roomSpanPx - usedSpan) / 2;
  return { origin, cells };
}

function buildManualRoomSvg(
  canvasWidth: number,
  canvasHeight: number,
  originX: number,
  originY: number,
  roomWidthPx: number,
  roomHeightPx: number,
  lengthM: number,
  widthM: number,
  pixelsPerMeter: number,
  areaM2: number,
): string {
  const gridStepPx = CEILING_GRID_M * pixelsPerMeter;
  const gridX = centeredGridOrigin(originX, roomWidthPx, gridStepPx);
  const gridY = centeredGridOrigin(originY, roomHeightPx, gridStepPx);
  const gridLines: string[] = [];

  for (let i = 0; i <= gridX.cells; i++) {
    const x = gridX.origin + i * gridStepPx;
    gridLines.push(
      `<line x1="${x}" y1="${originY}" x2="${x}" y2="${originY + roomHeightPx}" stroke="#cbd5e1" stroke-width="1" opacity="0.55" />`,
    );
  }
  for (let i = 0; i <= gridY.cells; i++) {
    const y = gridY.origin + i * gridStepPx;
    gridLines.push(
      `<line x1="${originX}" y1="${y}" x2="${originX + roomWidthPx}" y2="${y}" stroke="#cbd5e1" stroke-width="1" opacity="0.55" />`,
    );
  }

  const centerX = originX + roomWidthPx / 2;
  const centerY = originY + roomHeightPx / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  ${gridLines.join("\n")}
  <rect x="${originX}" y="${originY}" width="${roomWidthPx}" height="${roomHeightPx}" fill="#ffffff" stroke="#64748b" stroke-width="3"/>
  <text x="${centerX}" y="${originY - 16}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#475569">${formatMetersLabel(lengthM)} m</text>
  <text x="${originX - 18}" y="${centerY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#475569" transform="rotate(-90 ${originX - 18} ${centerY})">${formatMetersLabel(widthM)} m</text>
  <text x="${centerX}" y="${centerY + 6}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#94a3b8">${formatMetersLabel(areaM2, 1)} m²</text>
</svg>`;
}

export function buildManualRoomScene(dimensions: ManualRoomDimensions): ManualRoomScene {
  const { lengthM, widthM } = dimensions;
  const pixelsPerMeter = MANUAL_FLOOR_PLAN_PPM;
  const paddingPx = CANVAS_PADDING_M * pixelsPerMeter;
  const roomWidthPx = lengthM * pixelsPerMeter;
  const roomHeightPx = widthM * pixelsPerMeter;
  const width = Math.ceil(roomWidthPx + paddingPx * 2);
  const height = Math.ceil(roomHeightPx + paddingPx * 2);
  const originX = paddingPx;
  const originY = paddingPx;
  const areaM2 = lengthM * widthM;
  const vertices: Point2D[] = [
    { x: originX, y: originY },
    { x: originX + roomWidthPx, y: originY },
    { x: originX + roomWidthPx, y: originY + roomHeightPx },
    { x: originX, y: originY + roomHeightPx },
  ];
  const svg = buildManualRoomSvg(
    width,
    height,
    originX,
    originY,
    roomWidthPx,
    roomHeightPx,
    lengthM,
    widthM,
    pixelsPerMeter,
    areaM2,
  );
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return {
    dataUrl,
    width,
    height,
    pixelsPerMeter,
    vertices,
    areaM2,
    lengthM,
    widthM,
  };
}
