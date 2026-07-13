"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Image as KonvaImage, Layer, Line, Rect, Stage } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import { CanvasZoomControls } from "@/components/CanvasZoomControls";
import { RoomPolygon } from "@/components/floor-plan/RoomPolygon";
import { useKonvaImage } from "@/components/floor-plan/useKonvaImage";
import { FLOOR_PLAN_COLORS } from "@/lib/floor-plan-colors";
import {
  clampPointToBackground,
  getImagePointerPosition,
} from "@/lib/floor-plan-pointer";
import { flattenVertices } from "@/lib/polygon-area";
import { useFloorPlanStore } from "@/lib/floor-plan-store";
import { preventTouchDefaults } from "@/lib/stage-pointer";

const STAGE_HEIGHT = 560;
const MIN_SCALE = 0.1;
const MAX_SCALE = 8;

export function FloorPlanCanvas() {
  const background = useFloorPlanStore((state) => state.background);
  const rooms = useFloorPlanStore((state) => state.rooms);
  const selectedRoomId = useFloorPlanStore((state) => state.selectedRoomId);
  const editorMode = useFloorPlanStore((state) => state.editorMode);
  const viewState = useFloorPlanStore((state) => state.viewState);
  const polygonDraft = useFloorPlanStore((state) => state.polygonDraft);
  const calibrationDraft = useFloorPlanStore((state) => state.calibrationDraft);
  const addPolygonDraftPoint = useFloorPlanStore((state) => state.addPolygonDraftPoint);
  const addCalibrationPoint = useFloorPlanStore((state) => state.addCalibrationPoint);
  const selectRoom = useFloorPlanStore((state) => state.selectRoom);
  const updateRoomVertex = useFloorPlanStore((state) => state.updateRoomVertex);
  const updateViewState = useFloorPlanStore((state) => state.updateViewState);
  const setViewState = useFloorPlanStore((state) => state.setViewState);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const lastBackgroundRef = useRef<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(800);

  const image = useKonvaImage(background?.dataUrl);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => setViewportWidth(container.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!background) {
      lastBackgroundRef.current = null;
      return;
    }
    if (lastBackgroundRef.current === background.dataUrl) {
      return;
    }
    lastBackgroundRef.current = background.dataUrl;

    const fitScale = Math.min(
      (viewportWidth - 80) / background.width,
      (STAGE_HEIGHT - 80) / background.height,
      1,
    );
    if (fitScale > 0) {
      setViewState({
        scale: Number(Math.max(MIN_SCALE, fitScale).toFixed(3)),
        positionX: 40,
        positionY: 40,
      });
    }
  }, [background, viewportWidth, setViewState]);

  const contentWidth = background?.width ?? viewportWidth;
  const contentHeight = background?.height ?? STAGE_HEIGHT;

  const handleWheel = useCallback(
    (event: KonvaEventObject<WheelEvent>) => {
      event.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = event.evt.deltaY > 0 ? -1 : 1;
      const newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, direction > 0 ? oldScale * 1.08 : oldScale / 1.08),
      );

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      updateViewState({
        scale: Number(newScale.toFixed(3)),
        positionX: pointer.x - mousePointTo.x * newScale,
        positionY: pointer.y - mousePointTo.y * newScale,
      });
    },
    [updateViewState],
  );

  const handleStageDragEnd = useCallback(
    (event: KonvaEventObject<DragEvent>) => {
      updateViewState({
        positionX: event.target.x(),
        positionY: event.target.y(),
      });
    },
    [updateViewState],
  );

  const handleCanvasTap = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const target = event.target;
      const stage = target.getStage();
      if (!stage || !background) return;

      const isBackgroundTarget =
        target === stage || target.name() === "floor-plan-surface";
      if (!isBackgroundTarget) {
        return;
      }

      const rawPoint = getImagePointerPosition(stage, event);
      if (!rawPoint) return;

      const point = clampPointToBackground(
        rawPoint,
        background.width,
        background.height,
      );

      preventTouchDefaults(event);

      if (editorMode === "calibrate") {
        addCalibrationPoint(point);
        return;
      }

      if (editorMode === "drawRoom") {
        addPolygonDraftPoint(point);
        return;
      }

      if (editorMode === "select") {
        selectRoom(null);
      }
    },
    [
      background,
      editorMode,
      addCalibrationPoint,
      addPolygonDraftPoint,
      selectRoom,
    ],
  );

  const zoomPercent = Math.round(viewState.scale * 100);
  const isInteractiveMode = editorMode === "calibrate" || editorMode === "drawRoom";
  const stageDraggable = editorMode === "pan";

  const statusText =
    editorMode === "calibrate"
      ? `Kalibratie: kies punt ${calibrationDraft.length + 1} van 2`
      : editorMode === "drawRoom"
        ? `Tekenen: ${polygonDraft.length} punt(en) — sluit bij ≥3 punten`
        : editorMode === "pan"
          ? "Sleep om te pannen · scroll of knoppen om te zoomen"
          : "Selecteer een ruimte of kies een modus in de zijbalk";

  return (
    <section className="ls-card min-w-0 p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="ls-heading text-lg">Plattegrondeditor</h2>
        <p className="text-xs text-[var(--ls-gray)] sm:text-sm">{statusText}</p>
      </div>

      <CanvasZoomControls
        zoomPercent={zoomPercent}
        onZoomIn={() =>
          updateViewState({
            scale: Math.min(MAX_SCALE, Number((viewState.scale * 1.2).toFixed(3))),
          })
        }
        onZoomOut={() =>
          updateViewState({
            scale: Math.max(MIN_SCALE, Number((viewState.scale / 1.2).toFixed(3))),
          })
        }
        onFitToScreen={() =>
          setViewState({ scale: 1, positionX: 40, positionY: 40 })
        }
      />

      <div
        ref={containerRef}
        className={`max-w-full overflow-hidden rounded-lg border border-[var(--ls-gray-light)] bg-[var(--ls-bg)] ${
          isInteractiveMode || stageDraggable ? "ls-canvas-interactive" : "ls-canvas-scroll"
        }`}
        style={{ height: STAGE_HEIGHT }}
      >
        {!background ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="text-sm text-[var(--ls-gray)]">
              Upload een PDF, PNG of JPG om te beginnen met tekenen.
            </p>
          </div>
        ) : (
          <Stage
            ref={stageRef}
            width={viewportWidth}
            height={STAGE_HEIGHT}
            scaleX={viewState.scale}
            scaleY={viewState.scale}
            x={viewState.positionX}
            y={viewState.positionY}
            draggable={stageDraggable}
            onWheel={handleWheel}
            onDragEnd={handleStageDragEnd}
            onTap={handleCanvasTap}
            onMouseDown={(event) => {
              if (editorMode === "calibrate" || editorMode === "drawRoom") {
                preventTouchDefaults(event);
              }
            }}
            onTouchStart={(event) => {
              stageRef.current?.setPointersPositions(event.evt);
              if (editorMode === "calibrate" || editorMode === "drawRoom") {
                preventTouchDefaults(event);
              }
            }}
            onTouchMove={(event) => {
              if (editorMode === "calibrate" || editorMode === "drawRoom") {
                preventTouchDefaults(event);
              }
            }}
          >
            <Layer>
              <Rect
                name="floor-plan-surface"
                x={0}
                y={0}
                width={contentWidth}
                height={contentHeight}
                fill={FLOOR_PLAN_COLORS.stageBg}
              />
              {image && (
                <KonvaImage
                  name="floor-plan-surface"
                  image={image}
                  x={0}
                  y={0}
                  width={contentWidth}
                  height={contentHeight}
                />
              )}
              {rooms.map((room) => (
                <RoomPolygon
                  key={room.id}
                  room={room}
                  isSelected={selectedRoomId === room.id}
                  editable={editorMode === "select"}
                  onSelect={() => selectRoom(room.id)}
                  onVertexDrag={(vertexIndex, point) =>
                    updateRoomVertex(room.id, vertexIndex, point)
                  }
                />
              ))}
              {polygonDraft.length > 0 && (
                <>
                  <Line
                    points={flattenVertices(polygonDraft)}
                    stroke={FLOOR_PLAN_COLORS.draftStroke}
                    strokeWidth={2}
                    dash={[8, 6]}
                    closed={false}
                    listening={false}
                  />
                  {polygonDraft.map((point, index) => (
                    <Circle
                      key={`draft-${index}`}
                      x={point.x}
                      y={point.y}
                      radius={5}
                      fill={FLOOR_PLAN_COLORS.draftVertex}
                      listening={false}
                    />
                  ))}
                </>
              )}
              {calibrationDraft.length === 2 && (
                <Line
                  points={flattenVertices(calibrationDraft)}
                  stroke={FLOOR_PLAN_COLORS.calibrationLine}
                  strokeWidth={2}
                  dash={[6, 4]}
                  listening={false}
                />
              )}
              {calibrationDraft.map((point, index) => (
                <Circle
                  key={`calibration-${index}`}
                  x={point.x}
                  y={point.y}
                  radius={6}
                  fill={FLOOR_PLAN_COLORS.calibrationPoint}
                  stroke={FLOOR_PLAN_COLORS.calibrationLine}
                  strokeWidth={2}
                  listening={false}
                />
              ))}
            </Layer>
          </Stage>
        )}
      </div>
    </section>
  );
}
