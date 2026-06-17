"use client";

import { Circle, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { resizeDrawnLineEnd, snapToGrid } from "@/lib/draw-light-line";
import { BRAND, CANVAS_COLORS } from "@/lib/brand-colors";
import { useWarehouseStore } from "@/lib/warehouse-store";
import { metersToPixels, pixelsToMeters } from "@/lib/canvas-scale";
import type { DrawnLightLine } from "@/types";

interface LightLineEditorLayerProps {
  scale: number;
  warehouseLength: number;
  warehouseWidth: number;
  drawModeActive?: boolean;
}

function EditableDrawnLine({
  line,
  scale,
  isSelected,
  warehouseLength,
  warehouseWidth,
  onSelect,
  onUpdate,
}: {
  line: DrawnLightLine;
  scale: number;
  isSelected: boolean;
  warehouseLength: number;
  warehouseWidth: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<DrawnLightLine>) => void;
}) {
  const points =
    line.direction === "horizontal"
      ? [
          metersToPixels(line.drawnStart, scale),
          metersToPixels(line.crossPos, scale),
          metersToPixels(line.drawnEnd, scale),
          metersToPixels(line.crossPos, scale),
        ]
      : [
          metersToPixels(line.crossPos, scale),
          metersToPixels(line.drawnStart, scale),
          metersToPixels(line.crossPos, scale),
          metersToPixels(line.drawnEnd, scale),
        ];

  const startHandle =
    line.direction === "horizontal"
      ? {
          x: metersToPixels(line.drawnStart, scale),
          y: metersToPixels(line.crossPos, scale),
        }
      : {
          x: metersToPixels(line.crossPos, scale),
          y: metersToPixels(line.drawnStart, scale),
        };

  const endHandle =
    line.direction === "horizontal"
      ? {
          x: metersToPixels(line.drawnEnd, scale),
          y: metersToPixels(line.crossPos, scale),
        }
      : {
          x: metersToPixels(line.crossPos, scale),
          y: metersToPixels(line.drawnEnd, scale),
        };

  const handleBodyDragEnd = (event: KonvaEventObject<DragEvent>) => {
    const node = event.target;
    const delta =
      line.direction === "horizontal"
        ? pixelsToMeters(node.y(), scale)
        : pixelsToMeters(node.x(), scale);
    const maxCross = line.direction === "horizontal" ? warehouseWidth : warehouseLength;
    const nextCross = snapToGrid(line.crossPos + delta);
    onUpdate({ crossPos: Math.max(0, Math.min(nextCross, maxCross)) });
    node.position({ x: 0, y: 0 });
  };

  const handleEndpointDrag =
    (endpoint: "start" | "end") => (event: KonvaEventObject<DragEvent>) => {
      const node = event.target;
      const along =
        line.direction === "horizontal"
          ? pixelsToMeters(node.x(), scale)
          : pixelsToMeters(node.y(), scale);
      const resized = resizeDrawnLineEnd(
        line,
        endpoint,
        along,
        warehouseLength,
        warehouseWidth,
      );
      onUpdate(resized);
      node.position(endpoint === "start" ? startHandle : endHandle);
    };

  return (
    <>
      <Line
        points={points}
        stroke={isSelected ? CANVAS_COLORS.drawnLineSelected : CANVAS_COLORS.drawnLine}
        strokeWidth={isSelected ? 4 : 8}
        lineCap="round"
        hitStrokeWidth={20}
        onClick={onSelect}
        onTap={onSelect}
        draggable={isSelected}
        onDragEnd={handleBodyDragEnd}
      />
      {isSelected && (
        <>
          <Circle
            x={startHandle.x}
            y={startHandle.y}
            radius={6}
            fill={BRAND.white}
            stroke={isSelected ? BRAND.yellow : BRAND.dark}
            strokeWidth={2}
            draggable
            onDragMove={handleEndpointDrag("start")}
            onDragEnd={handleEndpointDrag("start")}
          />
          <Circle
            x={endHandle.x}
            y={endHandle.y}
            radius={6}
            fill={BRAND.white}
            stroke={isSelected ? BRAND.yellow : BRAND.dark}
            strokeWidth={2}
            draggable
            onDragMove={handleEndpointDrag("end")}
            onDragEnd={handleEndpointDrag("end")}
          />
        </>
      )}
    </>
  );
}

export function LightLineEditorLayer({
  scale,
  warehouseLength,
  warehouseWidth,
  drawModeActive = false,
}: LightLineEditorLayerProps) {
  const drawnLightLines = useWarehouseStore((state) => state.drawnLightLines);
  const selectedLightLineId = useWarehouseStore((state) => state.selectedLightLineId);
  const updateDrawnLightLine = useWarehouseStore((state) => state.updateDrawnLightLine);
  const setSelectedLightLineId = useWarehouseStore((state) => state.setSelectedLightLineId);

  if (drawModeActive) {
    return null;
  }

  return (
    <>
      {drawnLightLines.map((line) => (
        <EditableDrawnLine
          key={line.id}
          line={line}
          scale={scale}
          isSelected={selectedLightLineId === line.id}
          warehouseLength={warehouseLength}
          warehouseWidth={warehouseWidth}
          onSelect={() => setSelectedLightLineId(line.id)}
          onUpdate={(updates) => updateDrawnLightLine(line.id, updates)}
        />
      ))}
    </>
  );
}

export function DrawPreviewLine({ points }: { points: number[] | null }) {
  if (!points) return null;
  return (
    <Line
      points={points}
      stroke={CANVAS_COLORS.previewLine}
      strokeWidth={3}
      dash={[8, 6]}
      lineCap="round"
      listening={false}
    />
  );
}
