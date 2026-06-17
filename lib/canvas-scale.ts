export const CANVAS_MAX_SIZE = 640;
export const GRID_METER_STEP = 1;
export const MIN_RECT_DIMENSION = 0.1;

export function getCanvasScale(length: number, width: number): number {
  const maxDimension = Math.max(length, width, 1);
  return CANVAS_MAX_SIZE / maxDimension;
}

/** Zoom factor to fit warehouse floor plan within a pixel width (meters scale preserved). */
export function computeFitZoomFactor(
  length: number,
  meterScale: number,
  availableWidthPx: number,
): number {
  const naturalWidthPx = length * meterScale;
  if (naturalWidthPx <= 0 || availableWidthPx <= 0) return 1;
  return Math.min(1, availableWidthPx / naturalWidthPx);
}

export function metersToPixels(meters: number, scale: number): number {
  return meters * scale;
}

export function pixelsToMeters(pixels: number, scale: number): number {
  return pixels / scale;
}

export function clampRectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  warehouseLength: number,
  warehouseWidth: number,
) {
  const clampedWidth = Math.max(
    MIN_RECT_DIMENSION,
    Math.min(width, warehouseLength),
  );
  const clampedHeight = Math.max(
    MIN_RECT_DIMENSION,
    Math.min(height, warehouseWidth),
  );
  const clampedX = Math.max(0, Math.min(x, warehouseLength - clampedWidth));
  const clampedY = Math.max(0, Math.min(y, warehouseWidth - clampedHeight));

  return {
    x: clampedX,
    y: clampedY,
    width: clampedWidth,
    height: clampedHeight,
  };
}

export function getRectangleLabel(rectangle: {
  type: "shelf" | "obstruction";
  width: number;
  height: number;
}): string {
  const prefix = rectangle.type === "shelf" ? "Stelling" : "Obstructie";
  return `${prefix} ${rectangle.width.toFixed(1)} x ${rectangle.height.toFixed(1)} m`;
}
