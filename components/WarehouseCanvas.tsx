"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Circle, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import { HeatmapStatsPanel } from "@/components/HeatmapStatsPanel";
import { CanvasZoomControls } from "@/components/CanvasZoomControls";
import { DrawPreviewLine, LightLineEditorLayer } from "@/components/LightLineEditor";
import { SelectedLightLinePanel } from "@/components/SelectedLightLinePanel";
import { SelectedObjectPanel } from "@/components/SelectedObjectPanel";
import { LightLegend } from "@/components/LightLegend";
import {
  PDF_EXPORT_PIXEL_RATIO,
  waitForCanvasPaint,
  type CanvasExporterFn,
} from "@/lib/canvas-export";
import { createDrawnLineFromPoints, LIGHT_LINE_GRID_STEP } from "@/lib/draw-light-line";
import { luxToHeatmapColor } from "@/lib/heatmap-engine";
import { END_CAP_LENGTH, POWER_FEED_LENGTH } from "@/lib/light-line-physics";
import {
  createDrawnLightLineId,
  useWarehouseStore,
} from "@/lib/warehouse-store";
import {
  CANVAS_MAX_SIZE,
  GRID_METER_STEP,
  MIN_RECT_DIMENSION,
  clampRectangle,
  computeFitZoomFactor,
  getCanvasScale,
  getRectangleLabel,
  metersToPixels,
  pixelsToMeters,
} from "@/lib/canvas-scale";
import { CANVAS_COLORS } from "@/lib/brand-colors";
import type { LightLine, LightLinePlan, PlacedRectangle } from "@/types";

const RECT_COLORS = {
  shelf: { fill: CANVAS_COLORS.shelfFill, stroke: CANVAS_COLORS.shelfStroke },
  obstruction: { fill: CANVAS_COLORS.obstructionFill, stroke: CANVAS_COLORS.obstructionStroke },
} as const;

const WAREHOUSE_FLOOR_NAME = "warehouse-floor";

function isDrawSurface(target: Konva.Node): boolean {
  return target.getStage() === target || target.name() === WAREHOUSE_FLOOR_NAME;
}

const SLOT_VISUAL_SIZE_M = 0.35;

interface DraggableRectangleProps {
  rectangle: PlacedRectangle;
  scale: number;
  warehouseLength: number;
  warehouseWidth: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<PlacedRectangle>) => void;
}

function DraggableRectangle({
  rectangle,
  scale,
  warehouseLength,
  warehouseWidth,
  isSelected,
  onSelect,
  onUpdate,
}: DraggableRectangleProps) {
  const shapeRef = useRef<Konva.Rect>(null);
  const colors = RECT_COLORS[rectangle.type];
  const xPx = metersToPixels(rectangle.x, scale);
  const yPx = metersToPixels(rectangle.y, scale);
  const widthPx = metersToPixels(rectangle.width, scale);
  const heightPx = metersToPixels(rectangle.height, scale);
  const label = getRectangleLabel(rectangle);
  const fontSize = Math.max(9, Math.min(12, heightPx * 0.35, widthPx / (label.length * 0.55)));

  const applyClampedState = (node: Konva.Rect) => {
    const xMeters = pixelsToMeters(node.x(), scale);
    const yMeters = pixelsToMeters(node.y(), scale);
    const widthMeters = pixelsToMeters(node.width() * node.scaleX(), scale);
    const heightMeters = pixelsToMeters(node.height() * node.scaleY(), scale);
    const clamped = clampRectangle(
      xMeters,
      yMeters,
      widthMeters,
      heightMeters,
      warehouseLength,
      warehouseWidth,
    );

    node.scaleX(1);
    node.scaleY(1);
    node.position({
      x: metersToPixels(clamped.x, scale),
      y: metersToPixels(clamped.y, scale),
    });
    node.width(metersToPixels(clamped.width, scale));
    node.height(metersToPixels(clamped.height, scale));

    onUpdate(rectangle.id, clamped);
  };

  const handleDragEnd = (event: KonvaEventObject<DragEvent>) => {
    applyClampedState(event.target as Konva.Rect);
  };

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;
    applyClampedState(node);
  };

  return (
    <>
      <Rect
        ref={shapeRef}
        id={rectangle.id}
        x={xPx}
        y={yPx}
        width={widthPx}
        height={heightPx}
        fill={colors.fill}
        stroke={isSelected ? CANVAS_COLORS.selectedStroke : colors.stroke}
        strokeWidth={isSelected ? 3 : 2}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
      <Text
        x={xPx}
        y={yPx}
        width={widthPx}
        height={heightPx}
        text={label}
        fontSize={fontSize}
        fontStyle="bold"
        fill={CANVAS_COLORS.rectLabel}
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </>
  );
}

function toCanvasPoint(
  direction: LightLine["direction"],
  crossPos: number,
  alongPos: number,
  scale: number,
): { x: number; y: number } {
  if (direction === "horizontal") {
    return {
      x: metersToPixels(alongPos, scale),
      y: metersToPixels(crossPos, scale),
    };
  }

  return {
    x: metersToPixels(crossPos, scale),
    y: metersToPixels(alongPos, scale),
  };
}

function LightLineVisual({
  lightLine,
  scale,
}: {
  lightLine: LightLine;
  scale: number;
}) {
  const slotSizePx = metersToPixels(SLOT_VISUAL_SIZE_M, scale);
  const powerStart = lightLine.physicalStart;
  const powerEnd = powerStart + POWER_FEED_LENGTH;
  const railStart = powerEnd;
  const railEnd = railStart + lightLine.railLength;
  const endCapStart = railEnd;
  const endCapEnd = endCapStart + END_CAP_LENGTH;

  const powerStartPt = toCanvasPoint(lightLine.direction, lightLine.crossPos, powerStart, scale);
  const powerEndPt = toCanvasPoint(lightLine.direction, lightLine.crossPos, powerEnd, scale);
  const railStartPt = toCanvasPoint(lightLine.direction, lightLine.crossPos, railStart, scale);
  const railEndPt = toCanvasPoint(lightLine.direction, lightLine.crossPos, railEnd, scale);
  const endCapStartPt = toCanvasPoint(lightLine.direction, lightLine.crossPos, endCapStart, scale);
  const endCapEndPt = toCanvasPoint(lightLine.direction, lightLine.crossPos, endCapEnd, scale);
  const labelPt = toCanvasPoint(lightLine.direction, lightLine.crossPos, powerStart + 0.15, scale);

  const railLinePoints =
    lightLine.direction === "horizontal"
      ? [railStartPt.x, railStartPt.y, railEndPt.x, railEndPt.y]
      : [railStartPt.x, railStartPt.y, railEndPt.x, railEndPt.y];

  const capSize = Math.max(3, slotSizePx * 0.25);

  return (
    <>
      <Line
        points={railLinePoints}
        stroke={CANVAS_COLORS.railStroke}
        strokeWidth={5}
        lineCap="butt"
        listening={false}
      />

      {lightLine.slots.map((slot) => {
        const centerX = (slot.xStart + slot.xEnd) / 2;
        const centerY = (slot.yStart + slot.yEnd) / 2;
        const isHorizontal = lightLine.direction === "horizontal";
        const xPx = metersToPixels(isHorizontal ? slot.xStart : centerX - SLOT_VISUAL_SIZE_M / 2, scale);
        const yPx = metersToPixels(isHorizontal ? centerY - SLOT_VISUAL_SIZE_M / 2 : slot.yStart, scale);
        const widthPx = metersToPixels(isHorizontal ? slot.xEnd - slot.xStart : SLOT_VISUAL_SIZE_M, scale);
        const heightPx = metersToPixels(isHorizontal ? SLOT_VISUAL_SIZE_M : slot.yEnd - slot.yStart, scale);
        const isModule = slot.type === "module";

        return (
          <Fragment key={slot.id}>
            <Rect
              x={xPx}
              y={yPx}
              width={widthPx}
              height={heightPx}
              fill={isModule ? CANVAS_COLORS.moduleFill : CANVAS_COLORS.blankFill}
              stroke={isModule ? CANVAS_COLORS.moduleStroke : CANVAS_COLORS.blankStroke}
              strokeWidth={1}
              listening={false}
            />
            <Text
              x={xPx + widthPx / 2 - (isModule ? 8 : 6)}
              y={yPx + heightPx / 2 - 4}
              text={isModule ? "LED" : "BP"}
              fontSize={7}
              fontStyle="bold"
              fill={isModule ? CANVAS_COLORS.moduleText : CANVAS_COLORS.blankText}
              listening={false}
            />
          </Fragment>
        );
      })}

      {lightLine.railSegments
        .filter((segment) => segment.length === 3)
        .map((segment) => {
          const midAlong = (segment.alongStart + segment.alongEnd) / 2;
          const pt = toCanvasPoint(lightLine.direction, lightLine.crossPos, midAlong, scale);
          const halfSlot = metersToPixels(SLOT_VISUAL_SIZE_M / 2, scale);
          const dividerPoints =
            lightLine.direction === "horizontal"
              ? [pt.x, pt.y - halfSlot, pt.x, pt.y + halfSlot]
              : [pt.x - halfSlot, pt.y, pt.x + halfSlot, pt.y];

          return (
            <Line
              key={`${lightLine.id}-rail-divider-${segment.alongStart}`}
              points={dividerPoints}
              stroke={CANVAS_COLORS.dividerStroke}
              strokeWidth={1}
              dash={[3, 2]}
              listening={false}
            />
          );
        })}

      <Rect
        x={
          lightLine.direction === "horizontal"
            ? powerStartPt.x
            : powerStartPt.x - capSize / 2
        }
        y={
          lightLine.direction === "horizontal"
            ? powerStartPt.y - capSize / 2
            : powerStartPt.y
        }
        width={
          lightLine.direction === "horizontal"
            ? Math.max(4, powerEndPt.x - powerStartPt.x)
            : capSize
        }
        height={
          lightLine.direction === "horizontal"
            ? capSize
            : Math.max(4, powerEndPt.y - powerStartPt.y)
        }
        fill={CANVAS_COLORS.powerFeedFill}
        stroke={CANVAS_COLORS.powerFeedStroke}
        strokeWidth={1}
        listening={false}
      />

      <Rect
        x={
          lightLine.direction === "horizontal"
            ? endCapStartPt.x
            : endCapStartPt.x - capSize / 2
        }
        y={
          lightLine.direction === "horizontal"
            ? endCapStartPt.y - capSize / 2
            : endCapStartPt.y
        }
        width={
          lightLine.direction === "horizontal"
            ? Math.max(4, endCapEndPt.x - endCapStartPt.x)
            : capSize
        }
        height={
          lightLine.direction === "horizontal"
            ? capSize
            : Math.max(4, endCapEndPt.y - endCapStartPt.y)
        }
        fill={CANVAS_COLORS.endCapFill}
        listening={false}
      />

      {lightLine.hangerPositions.map((alongPos, index) => {
        const pt = toCanvasPoint(lightLine.direction, lightLine.crossPos, alongPos, scale);
        return (
          <Circle
            key={`${lightLine.id}-hanger-${index}`}
            x={pt.x}
            y={pt.y}
            radius={4}
            fill={CANVAS_COLORS.hangerFill}
            stroke={CANVAS_COLORS.hangerStroke}
            strokeWidth={1}
            listening={false}
          />
        );
      })}

      <Text
        x={labelPt.x + (lightLine.direction === "vertical" ? 8 : 4)}
        y={labelPt.y - (lightLine.direction === "horizontal" ? slotSizePx + 14 : 0)}
        text={`⚡ LL${lightLine.index} 230V`}
        fontSize={9}
        fontStyle="bold"
        fill={CANVAS_COLORS.voltageLabel}
        listening={false}
      />
      <Text
        x={labelPt.x + (lightLine.direction === "vertical" ? 8 : 4)}
        y={labelPt.y - (lightLine.direction === "horizontal" ? slotSizePx + 2 : 14)}
        text={`LL${lightLine.index} - ${lightLine.physicalLength.toFixed(1)} m`}
        fontSize={8}
        fill={CANVAS_COLORS.labelText}
        listening={false}
      />
    </>
  );
}

function LightHeatmapLayer({
  heatmap,
  targetLux,
  scale,
}: {
  heatmap: LightLinePlan["heatmap"];
  targetLux: number;
  scale: number;
}) {
  const cellSizePx = metersToPixels(heatmap.gridStep, scale);

  return (
    <>
      {heatmap.cells.map((cell, index) => (
        <Rect
          key={`heatmap-${index}`}
          x={metersToPixels(cell.x - heatmap.gridStep / 2, scale)}
          y={metersToPixels(cell.y - heatmap.gridStep / 2, scale)}
          width={cellSizePx}
          height={cellSizePx}
          fill={luxToHeatmapColor(cell.lux, targetLux)}
          listening={false}
        />
      ))}
    </>
  );
}

export function WarehouseCanvas() {
  const length = useWarehouseStore((state) => state.length);
  const width = useWarehouseStore((state) => state.width);
  const rectangles = useWarehouseStore((state) => state.rectangles);
  const selectedRectangleId = useWarehouseStore((state) => state.selectedRectangleId);
  const lightLinePlan = useWarehouseStore((state) => state.lightLinePlan);
  const showHeatmap = useWarehouseStore((state) => state.showHeatmap);
  const lightLineDrawMode = useWarehouseStore((state) => state.lightLineDrawMode);
  const selectedLightLineId = useWarehouseStore((state) => state.selectedLightLineId);
  const addDrawnLightLine = useWarehouseStore((state) => state.addDrawnLightLine);
  const removeDrawnLightLine = useWarehouseStore((state) => state.removeDrawnLightLine);
  const cancelLightLineDrawMode = useWarehouseStore((state) => state.cancelLightLineDrawMode);
  const setSelectedLightLineId = useWarehouseStore((state) => state.setSelectedLightLineId);
  const updateRectangle = useWarehouseStore((state) => state.updateRectangle);
  const setSelectedRectangleId = useWarehouseStore((state) => state.setSelectedRectangleId);
  const removeRectangle = useWarehouseStore((state) => state.removeRectangle);
  const setCanvasExporter = useWarehouseStore((state) => state.setCanvasExporter);

  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawPreview, setDrawPreview] = useState<{ x: number; y: number } | null>(null);

  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const heatmapLayerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const showHeatmapRef = useRef(showHeatmap);
  showHeatmapRef.current = showHeatmap;

  const meterScale = useMemo(() => getCanvasScale(length, width), [length, width]);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;

  const scale = meterScale * zoom;
  const stageWidth = metersToPixels(length, scale);
  const stageHeight = metersToPixels(width, scale);
  const minSizePx = metersToPixels(MIN_RECT_DIMENSION, scale);
  const zoomPercent = Math.round(zoom * 100);

  const calculateFitZoom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 1;
    return computeFitZoomFactor(length, meterScale, container.clientWidth - 16);
  }, [length, meterScale]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const applyFitOnSmallScreens = () => {
      if (window.innerWidth < 1280) {
        setZoom(calculateFitZoom());
      }
    };

    applyFitOnSmallScreens();
    const observer = new ResizeObserver(applyFitOnSmallScreens);
    observer.observe(container);
    return () => observer.disconnect();
  }, [calculateFitZoom, length, width]);

  const activeLines = lightLinePlan?.lines ?? [];
  const activeHeatmap = lightLinePlan?.heatmap ?? null;

  const gridLines = useMemo(() => {
    const lines: Array<{ points: number[]; key: string; stroke?: string }> = [];
    const fineStep = lightLineDrawMode ? LIGHT_LINE_GRID_STEP : GRID_METER_STEP;

    for (let x = 0; x <= length; x += fineStep) {
      const px = metersToPixels(x, scale);
      lines.push({
        key: `v-${x}`,
        points: [px, 0, px, stageHeight],
        stroke: x % GRID_METER_STEP === 0 ? CANVAS_COLORS.gridMajor : CANVAS_COLORS.gridMinor,
      });
    }

    for (let y = 0; y <= width; y += fineStep) {
      const py = metersToPixels(y, scale);
      lines.push({
        key: `h-${y}`,
        points: [0, py, stageWidth, py],
        stroke: y % GRID_METER_STEP === 0 ? CANVAS_COLORS.gridMajor : CANVAS_COLORS.gridMinor,
      });
    }

    return lines;
  }, [length, width, scale, stageWidth, stageHeight, lightLineDrawMode]);

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;

    if (selectedRectangleId && !selectedLightLineId) {
      const selectedNode = stage.findOne(`#${selectedRectangleId}`);
      if (selectedNode) {
        transformer.nodes([selectedNode]);
        transformer.getLayer()?.batchDraw();
        return;
      }
    }

    transformer.nodes([]);
    transformer.getLayer()?.batchDraw();
  }, [selectedRectangleId, selectedLightLineId, rectangles, scale]);

  useEffect(() => {
    layerRef.current?.batchDraw();
  }, [lightLinePlan, rectangles, scale, length, width, showHeatmap]);

  useEffect(() => {
    const exporter: CanvasExporterFn = async ({ withHeatmap }) => {
      const stage = stageRef.current;
      const transformer = transformerRef.current;
      const heatmapLayer = heatmapLayerRef.current;
      if (!stage) return null;

      const previousZoom = zoomRef.current;
      flushSync(() => setZoom(1));

      transformer?.nodes([]);
      transformer?.getLayer()?.batchDraw();

      if (heatmapLayer) {
        heatmapLayer.visible(withHeatmap);
        heatmapLayer.batchDraw();
      }
      stage.batchDraw();

      await waitForCanvasPaint(3);

      const dataUrl = stage.toDataURL({ pixelRatio: PDF_EXPORT_PIXEL_RATIO });

      if (heatmapLayer) {
        heatmapLayer.visible(showHeatmapRef.current);
        heatmapLayer.batchDraw();
        stage.batchDraw();
      }

      flushSync(() => setZoom(previousZoom));

      return dataUrl;
    };
    setCanvasExporter(exporter);
    return () => setCanvasExporter(null);
  }, [setCanvasExporter, meterScale, length, width, lightLinePlan, rectangles]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "Escape" && lightLineDrawMode) {
        event.preventDefault();
        setDrawStart(null);
        setDrawPreview(null);
        cancelLightLineDrawMode();
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      if (!selectedRectangleId && !selectedLightLineId) {
        return;
      }

      event.preventDefault();
      if (selectedLightLineId) {
        removeDrawnLightLine(selectedLightLineId);
        return;
      }
      removeRectangle(selectedRectangleId!);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedRectangleId,
    selectedLightLineId,
    removeRectangle,
    removeDrawnLightLine,
    lightLineDrawMode,
    cancelLightLineDrawMode,
  ]);

  const previewLine =
    drawStart && drawPreview
      ? createDrawnLineFromPoints(
          "preview",
          drawStart.x,
          drawStart.y,
          drawPreview.x,
          drawPreview.y,
          length,
          width,
        )
      : null;

  const previewPoints =
    previewLine &&
    (previewLine.direction === "horizontal"
      ? [
          metersToPixels(previewLine.drawnStart, scale),
          metersToPixels(previewLine.crossPos, scale),
          metersToPixels(previewLine.drawnEnd, scale),
          metersToPixels(previewLine.crossPos, scale),
        ]
      : [
          metersToPixels(previewLine.crossPos, scale),
          metersToPixels(previewLine.drawnStart, scale),
          metersToPixels(previewLine.crossPos, scale),
          metersToPixels(previewLine.drawnEnd, scale),
        ]);

  const getPointerMeters = (stage: Konva.Stage) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return {
      x: pixelsToMeters(pointer.x, scale),
      y: pixelsToMeters(pointer.y, scale),
    };
  };

  const handleFloorClick = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!lightLineDrawMode) return;
    if (!isDrawSurface(event.target)) return;

    const stage = event.target.getStage();
    if (!stage) return;
    const point = getPointerMeters(stage);
    if (!point) return;

    event.cancelBubble = true;

    if (!drawStart) {
      setDrawStart(point);
      setDrawPreview(point);
      setSelectedRectangleId(null);
      setSelectedLightLineId(null);
      return;
    }

    const line = createDrawnLineFromPoints(
      createDrawnLightLineId(),
      drawStart.x,
      drawStart.y,
      point.x,
      point.y,
      length,
      width,
    );
    setDrawStart(null);
    setDrawPreview(null);
    if (line) addDrawnLightLine(line);
  };

  const handleStageMouseMove = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!lightLineDrawMode || !drawStart) return;
    const stage = event.target.getStage();
    if (!stage) return;
    const point = getPointerMeters(stage);
    if (point) setDrawPreview(point);
  };

  const handleCancelDraw = () => {
    setDrawStart(null);
    setDrawPreview(null);
    cancelLightLineDrawMode();
  };

  const drawStatusMessage = lightLineDrawMode
    ? drawStart
      ? "Kies eindpunt. Lijn wordt automatisch horizontaal of verticaal."
      : "Tekenmodus actief: klik beginpunt en eindpunt van de lichtlijn."
    : null;

  return (
    <section className="ls-card min-w-0 p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="ls-heading text-lg">Lichtontwerp · plattegrond</h2>
        <p className="text-xs text-[var(--ls-gray)] sm:text-sm">
          {length} × {width} m · 1 m = {meterScale.toFixed(0)} px · zoom {zoomPercent}%
        </p>
      </div>
      <CanvasZoomControls
        zoomPercent={zoomPercent}
        onZoomIn={() => setZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))))}
        onZoomOut={() => setZoom((value) => Math.max(0.25, Number((value - 0.25).toFixed(2))))}
        onFitToScreen={() => setZoom(calculateFitZoom())}
      />
      {drawStatusMessage && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--ls-gray-light)] bg-[var(--ls-yellow-soft)] px-3 py-2">
          <p className="text-sm font-medium text-[var(--ls-black)]">{drawStatusMessage}</p>
          <button
            type="button"
            onClick={handleCancelDraw}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            Annuleer tekenen
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        className={`max-w-full overflow-x-auto overflow-y-auto rounded-lg border border-[var(--ls-gray-light)] bg-[var(--ls-bg)] p-2 sm:p-4 ${
          lightLineDrawMode ? "cursor-crosshair" : ""
        }`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div style={{ width: stageWidth, height: stageHeight, minWidth: stageWidth }}>
          <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          onClick={handleFloorClick}
          onMouseMove={handleStageMouseMove}
          onTouchMove={handleStageMouseMove}
          onMouseDown={(event) => {
            if (lightLineDrawMode) return;
            if (isDrawSurface(event.target)) {
              setSelectedRectangleId(null);
              setSelectedLightLineId(null);
            }
          }}
        >
          <Layer ref={layerRef}>
            <Rect
              name={WAREHOUSE_FLOOR_NAME}
              x={0}
              y={0}
              width={stageWidth}
              height={stageHeight}
              fill={CANVAS_COLORS.floor}
              stroke={CANVAS_COLORS.floorStroke}
              strokeWidth={2}
            />
            {gridLines.map((line) => (
              <Line
                key={line.key}
                points={line.points}
                stroke={line.stroke ?? CANVAS_COLORS.gridMajor}
                strokeWidth={1}
                listening={false}
              />
            ))}
            {rectangles.map((rectangle) => (
              <DraggableRectangle
                key={rectangle.id}
                rectangle={rectangle}
                scale={scale}
                warehouseLength={length}
                warehouseWidth={width}
                isSelected={selectedRectangleId === rectangle.id}
                onSelect={() => {
                  setSelectedRectangleId(rectangle.id);
                  setSelectedLightLineId(null);
                }}
                onUpdate={updateRectangle}
              />
            ))}
            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              keepRatio={false}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < minSizePx || newBox.height < minSizePx) {
                  return oldBox;
                }

                const clampedBox = { ...newBox };

                if (clampedBox.x < 0) {
                  clampedBox.width += clampedBox.x;
                  clampedBox.x = 0;
                }
                if (clampedBox.y < 0) {
                  clampedBox.height += clampedBox.y;
                  clampedBox.y = 0;
                }
                if (clampedBox.x + clampedBox.width > stageWidth) {
                  clampedBox.width = stageWidth - clampedBox.x;
                }
                if (clampedBox.y + clampedBox.height > stageHeight) {
                  clampedBox.height = stageHeight - clampedBox.y;
                }

                if (
                  clampedBox.width < minSizePx ||
                  clampedBox.height < minSizePx
                ) {
                  return oldBox;
                }

                return clampedBox;
              }}
            />
            <Text
              x={8}
              y={8}
              text={`${length} m`}
              fontSize={12}
              fill={CANVAS_COLORS.labelText}
            />
            <Text
              x={8}
              y={stageHeight - 20}
              text={`${width} m`}
              fontSize={12}
              fill={CANVAS_COLORS.labelText}
            />
          </Layer>
          <Layer listening={false}>
            {activeLines.map((lightLine) => (
              <LightLineVisual
                key={lightLine.id}
                lightLine={lightLine}
                scale={scale}
              />
            ))}
          </Layer>
          {activeHeatmap && activeLines.length > 0 && (
            <Layer
              ref={heatmapLayerRef}
              listening={false}
              opacity={0.65}
              visible={showHeatmap}
            >
              <LightHeatmapLayer
                heatmap={activeHeatmap}
                targetLux={lightLinePlan!.summary.targetLux}
                scale={scale}
              />
            </Layer>
          )}
          <Layer>
            <LightLineEditorLayer
              scale={scale}
              warehouseLength={length}
              warehouseWidth={width}
              drawModeActive={lightLineDrawMode}
            />
            <DrawPreviewLine points={previewPoints || null} />
          </Layer>
        </Stage>
        </div>
      </div>
      <SelectedObjectPanel />
      <SelectedLightLinePanel />
      {activeLines.length > 0 && !showHeatmap && <LightLegend />}
      {showHeatmap && activeHeatmap && lightLinePlan && (
        <HeatmapStatsPanel
          heatmap={activeHeatmap}
          targetLux={lightLinePlan.summary.targetLux}
        />
      )}
      <p className="mt-2 text-xs text-[var(--ls-gray)]">
        Max. canvasgrootte: {CANVAS_MAX_SIZE}px · tekenraster: {LIGHT_LINE_GRID_STEP} m
        {lightLineDrawMode && " · Escape stopt tekenmodus"}
      </p>
    </section>
  );
}
