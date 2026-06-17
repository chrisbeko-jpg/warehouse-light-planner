import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import { pixelsToMeters } from "@/lib/canvas-scale";

export function getStagePointerPosition(
  stage: Konva.Stage,
  event?: KonvaEventObject<MouseEvent | TouchEvent>,
): { x: number; y: number } | null {
  if (event) {
    stage.setPointersPositions(event.evt);
  }

  const pointer = stage.getPointerPosition();
  if (pointer) {
    return pointer;
  }

  if (!event) {
    return null;
  }

  const container = stage.container().getBoundingClientRect();
  const evt = event.evt;

  if ("touches" in evt && evt.touches.length > 0) {
    const touch = evt.touches[0];
    return {
      x: touch.clientX - container.left,
      y: touch.clientY - container.top,
    };
  }

  if ("changedTouches" in evt && evt.changedTouches.length > 0) {
    const touch = evt.changedTouches[0];
    return {
      x: touch.clientX - container.left,
      y: touch.clientY - container.top,
    };
  }

  if ("clientX" in evt) {
    return {
      x: evt.clientX - container.left,
      y: evt.clientY - container.top,
    };
  }

  return null;
}

export function getStagePointerMeters(
  stage: Konva.Stage,
  event: KonvaEventObject<MouseEvent | TouchEvent> | undefined,
  scale: number,
): { x: number; y: number } | null {
  const pointer = getStagePointerPosition(stage, event);
  if (!pointer) {
    return null;
  }

  return {
    x: pixelsToMeters(pointer.x, scale),
    y: pixelsToMeters(pointer.y, scale),
  };
}

export function preventTouchDefaults(event: KonvaEventObject<MouseEvent | TouchEvent>) {
  if ("preventDefault" in event.evt) {
    event.evt.preventDefault();
  }
}
