import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import { getStagePointerPosition } from "@/lib/stage-pointer";
import type { Point2D } from "@/types/floor-plan";

/** Map stage pointer coordinates to background image coordinates. */
export function getImagePointerPosition(
  stage: Konva.Stage,
  event?: KonvaEventObject<MouseEvent | TouchEvent>,
): Point2D | null {
  const pointer = getStagePointerPosition(stage, event);
  if (!pointer) {
    return null;
  }

  const scale = stage.scaleX() || 1;
  return {
    x: (pointer.x - stage.x()) / scale,
    y: (pointer.y - stage.y()) / scale,
  };
}

export function clampPointToBackground(
  point: Point2D,
  width: number,
  height: number,
): Point2D {
  return {
    x: Math.max(0, Math.min(width, point.x)),
    y: Math.max(0, Math.min(height, point.y)),
  };
}
