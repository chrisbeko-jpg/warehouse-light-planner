export interface CanvasExportOptions {
  withHeatmap: boolean;
}

export type CanvasExporterFn = (options: CanvasExportOptions) => Promise<string | null>;

export const PDF_EXPORT_PIXEL_RATIO = 3;

/** Wait for Konva to repaint after visibility changes. */
export function waitForCanvasPaint(frames = 2): Promise<void> {
  return new Promise((resolve) => {
    let remaining = frames;
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
