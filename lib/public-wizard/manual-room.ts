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

function formatMetersLabel(value: number): string {
  return value.toFixed(2).replace(".", ",");
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
): string {
  const gridStepPx = CEILING_GRID_M * pixelsPerMeter;
  const gridLines: string[] = [];
  for (let x = originX; x <= originX + roomWidthPx + 0.5; x += gridStepPx) {
    gridLines.push(
      `<line x1="${x}" y1="${originY}" x2="${x}" y2="${originY + roomHeightPx}" stroke="#cbd5e1" stroke-width="1" opacity="0.55" />`,
    );
  }
  for (let y = originY; y <= originY + roomHeightPx + 0.5; y += gridStepPx) {
    gridLines.push(
      `<line x1="${originX}" y1="${y}" x2="${originX + roomWidthPx}" y2="${y}" stroke="#cbd5e1" stroke-width="1" opacity="0.55" />`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  ${gridLines.join("\n")}
  <rect x="${originX}" y="${originY}" width="${roomWidthPx}" height="${roomHeightPx}" fill="#ffffff" stroke="#64748b" stroke-width="3"/>
  <text x="${originX + roomWidthPx / 2}" y="${originY - 16}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#475569">${formatMetersLabel(lengthM)} m</text>
  <text x="${originX - 18}" y="${originY + roomHeightPx / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#475569" transform="rotate(-90 ${originX - 18} ${originY + roomHeightPx / 2})">${formatMetersLabel(widthM)} m</text>
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
  );
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return {
    dataUrl,
    width,
    height,
    pixelsPerMeter,
    vertices,
    areaM2: lengthM * widthM,
    lengthM,
    widthM,
  };
}
