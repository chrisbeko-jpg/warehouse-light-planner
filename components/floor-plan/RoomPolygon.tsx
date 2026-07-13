"use client";

import { Circle, Line, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { FLOOR_PLAN_COLORS } from "@/lib/floor-plan-colors";
import { flattenVertices, formatAreaM2 } from "@/lib/polygon-area";
import type { Room } from "@/types/floor-plan";

interface RoomPolygonProps {
  room: Room;
  isSelected: boolean;
  editable: boolean;
  onSelect: () => void;
  onVertexDrag: (vertexIndex: number, point: { x: number; y: number }) => void;
}

function polygonCentroid(vertices: Room["vertices"]): { x: number; y: number } {
  if (vertices.length === 0) {
    return { x: 0, y: 0 };
  }
  const sum = vertices.reduce(
    (acc, vertex) => ({ x: acc.x + vertex.x, y: acc.y + vertex.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / vertices.length, y: sum.y / vertices.length };
}

export function RoomPolygon({
  room,
  isSelected,
  editable,
  onSelect,
  onVertexDrag,
}: RoomPolygonProps) {
  const points = flattenVertices(room.vertices);
  const centroid = polygonCentroid(room.vertices);

  const handleVertexDrag =
    (vertexIndex: number) => (event: KonvaEventObject<DragEvent>) => {
      const node = event.target;
      onVertexDrag(vertexIndex, { x: node.x(), y: node.y() });
    };

  return (
    <>
      <Line
        points={points}
        closed
        fill={
          isSelected
            ? FLOOR_PLAN_COLORS.roomFillSelected
            : FLOOR_PLAN_COLORS.roomFill
        }
        stroke={
          isSelected
            ? FLOOR_PLAN_COLORS.roomStrokeSelected
            : FLOOR_PLAN_COLORS.roomStroke
        }
        strokeWidth={isSelected ? 2.5 : 1.5}
        onClick={onSelect}
        onTap={onSelect}
      />
      <Text
        x={centroid.x - 40}
        y={centroid.y - 8}
        width={80}
        align="center"
        text={`${room.name}\n${formatAreaM2(room.areaM2)}`}
        fontSize={11}
        fontStyle="bold"
        fill={FLOOR_PLAN_COLORS.labelText}
        listening={false}
      />
      {isSelected &&
        editable &&
        room.vertices.map((vertex, index) => (
          <Circle
            key={`${room.id}-vertex-${index}`}
            x={vertex.x}
            y={vertex.y}
            radius={7}
            fill={FLOOR_PLAN_COLORS.vertexHandle}
            stroke={FLOOR_PLAN_COLORS.vertexHandleStroke}
            strokeWidth={2}
            draggable
            onTouchStart={(event) => {
              event.target.getStage()?.setPointersPositions(event.evt);
            }}
            onDragMove={handleVertexDrag(index)}
            onDragEnd={handleVertexDrag(index)}
          />
        ))}
    </>
  );
}
