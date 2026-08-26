"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, Image as KonvaImage, Layer, Line, Rect, Stage } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import { formatScaleLabel } from "@/lib/floor-plan-scale";
import { clampPointToBackground, getImagePointerPosition } from "@/lib/floor-plan-pointer";
import { attemptRoomRecognition } from "@/lib/public-wizard/ai-room-detect";
import {
  computePublicHeatmap,
  HEATMAP_LEVEL_COLORS,
  PUBLIC_HEATMAP_DISCLAIMER,
} from "@/lib/public-wizard/heatmap";
import { getPublicProduct } from "@/lib/public-wizard/products";
import { getAtmosphere } from "@/lib/public-wizard/atmospheres";
import { getRoomFunction } from "@/lib/public-wizard/room-functions";
import { flattenVertices } from "@/lib/polygon-area";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import {
  computeFitView,
  pointNear,
  zoomAtPoint,
} from "@/lib/public-wizard/viewport";
import { useKonvaImage } from "@/components/floor-plan/useKonvaImage";
import type { Point2D } from "@/types/floor-plan";

const SIDE_PANEL_WIDTH = 320;
const HIT_RADIUS = 14;

export function StepEditor() {
  const roomFunction = usePublicWizardStore((s) => s.roomFunction);
  const ceilingHeightM = usePublicWizardStore((s) => s.ceilingHeightM);
  const targetLux = usePublicWizardStore((s) => s.targetLux);
  const atmosphere = usePublicWizardStore((s) => s.atmosphere);
  const backgroundDataUrl = usePublicWizardStore((s) => s.backgroundDataUrl);
  const backgroundWidth = usePublicWizardStore((s) => s.backgroundWidth);
  const backgroundHeight = usePublicWizardStore((s) => s.backgroundHeight);
  const pixelsPerMeter = usePublicWizardStore((s) => s.pixelsPerMeter);
  const editorMode = usePublicWizardStore((s) => s.editorMode);
  const editorPhase = usePublicWizardStore((s) => s.editorPhase);
  const sidePanelCollapsed = usePublicWizardStore((s) => s.sidePanelCollapsed);
  const scaleStepCollapsed = usePublicWizardStore((s) => s.scaleStepCollapsed);
  const calibrationDraft = usePublicWizardStore((s) => s.calibrationDraft);
  const calibrationLine = usePublicWizardStore((s) => s.calibrationLine);
  const calibrationDistanceMm = usePublicWizardStore((s) => s.calibrationDistanceMm);
  const polygonDraft = usePublicWizardStore((s) => s.polygonDraft);
  const roomVertices = usePublicWizardStore((s) => s.roomVertices);
  const fixtures = usePublicWizardStore((s) => s.fixtures);
  const selectedFixtureId = usePublicWizardStore((s) => s.selectedFixtureId);
  const showHeatmap = usePublicWizardStore((s) => s.showHeatmap);
  const viewState = usePublicWizardStore((s) => s.viewState);
  const aiRecognitionFailed = usePublicWizardStore((s) => s.aiRecognitionFailed);
  const aiRecognitionAttempted = usePublicWizardStore((s) => s.aiRecognitionAttempted);
  const preferredProductId = usePublicWizardStore((s) => s.preferredProductId);

  const prevStep = usePublicWizardStore((s) => s.prevStep);
  const nextStep = usePublicWizardStore((s) => s.nextStep);
  const setEditorMode = usePublicWizardStore((s) => s.setEditorMode);
  const setEditorPhase = usePublicWizardStore((s) => s.setEditorPhase);
  const setSidePanelCollapsed = usePublicWizardStore((s) => s.setSidePanelCollapsed);
  const setScaleStepCollapsed = usePublicWizardStore((s) => s.setScaleStepCollapsed);
  const setCalibrationDistanceMm = usePublicWizardStore((s) => s.setCalibrationDistanceMm);
  const resetCalibrationDraft = usePublicWizardStore((s) => s.resetCalibrationDraft);
  const addCalibrationPoint = usePublicWizardStore((s) => s.addCalibrationPoint);
  const applyCalibration = usePublicWizardStore((s) => s.applyCalibration);
  const addPolygonDraftPoint = usePublicWizardStore((s) => s.addPolygonDraftPoint);
  const finishPolygonDraft = usePublicWizardStore((s) => s.finishPolygonDraft);
  const cancelPolygonDraft = usePublicWizardStore((s) => s.cancelPolygonDraft);
  const setRoomVertices = usePublicWizardStore((s) => s.setRoomVertices);
  const setAiRecognitionState = usePublicWizardStore((s) => s.setAiRecognitionState);
  const generateLightingPlan = usePublicWizardStore((s) => s.generateLightingPlan);
  const selectFixture = usePublicWizardStore((s) => s.selectFixture);
  const moveFixtureById = usePublicWizardStore((s) => s.moveFixtureById);
  const deleteSelectedFixture = usePublicWizardStore((s) => s.deleteSelectedFixture);
  const addDownlightAtPoint = usePublicWizardStore((s) => s.addDownlightAtPoint);
  const setShowHeatmap = usePublicWizardStore((s) => s.setShowHeatmap);
  const undo = usePublicWizardStore((s) => s.undo);
  const redo = usePublicWizardStore((s) => s.redo);
  const updateViewState = usePublicWizardStore((s) => s.updateViewState);
  const setViewState = usePublicWizardStore((s) => s.setViewState);

  const canvasRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const [generated, setGenerated] = useState(fixtures.length > 0);
  const [recognizing, setRecognizing] = useState(false);
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [spacePanning, setSpacePanning] = useState(false);
  const [pointerImage, setPointerImage] = useState<Point2D | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(true);
  const image = useKonvaImage(backgroundDataUrl ?? undefined);

  const roomMeta = roomFunction ? getRoomFunction(roomFunction) : null;
  const atmosphereMeta = atmosphere ? getAtmosphere(atmosphere) : null;
  const roomReady = roomVertices.length >= 3 && Boolean(pixelsPerMeter);
  const panelWidth = sidePanelCollapsed ? 0 : SIDE_PANEL_WIDTH;

  useEffect(() => {
    setEditorMode("calibrate");
    setEditorPhase("scale");
  }, [setEditorMode, setEditorPhase]);

  useEffect(() => {
    if (calibrationDraft.length === 2 && editorMode === "calibrate") {
      setShowScaleDialog(true);
    }
  }, [calibrationDraft.length, editorMode]);

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;
    const update = () => {
      setViewportSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [panelWidth]);

  useEffect(() => {
    if (backgroundWidth > 0 && backgroundHeight > 0 && viewportSize.width > 0) {
      setViewState(
        computeFitView(viewportSize.width, viewportSize.height, backgroundWidth, backgroundHeight),
      );
    }
  }, [backgroundWidth, backgroundHeight, viewportSize.width, viewportSize.height, setViewState]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setSpacePanning(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpacePanning(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const runRecognition = useCallback(async () => {
    if (!backgroundDataUrl || !pixelsPerMeter) return;
    setRecognizing(true);
    setAiRecognitionState(false, false);
    const result = await attemptRoomRecognition(backgroundDataUrl, pixelsPerMeter);
    setAiRecognitionState(true, result.failed);
    if (result.vertices && result.vertices.length >= 3) {
      setRoomVertices(result.vertices);
      setEditorPhase("review");
    }
    setRecognizing(false);
  }, [backgroundDataUrl, pixelsPerMeter, setAiRecognitionState, setRoomVertices, setEditorPhase]);

  useEffect(() => {
    if (pixelsPerMeter && backgroundDataUrl && !aiRecognitionAttempted) void runRecognition();
  }, [pixelsPerMeter, backgroundDataUrl, aiRecognitionAttempted, runRecognition]);

  const heatmapCells = useMemo(() => {
    if (!showHeatmap || !pixelsPerMeter || fixtures.length === 0) return [];
    return computePublicHeatmap(fixtures, roomVertices, pixelsPerMeter, ceilingHeightM, targetLux);
  }, [showHeatmap, pixelsPerMeter, fixtures, roomVertices, ceilingHeightM, targetLux]);

  const isPanning = editorMode === "pan" || spacePanning;

  const handleWheel = useCallback(
    (event: KonvaEventObject<WheelEvent>) => {
      event.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const direction = event.evt.deltaY > 0 ? -1 : 1;
      updateViewState(zoomAtPoint(viewState, pointer, direction));
    },
    [updateViewState, viewState],
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

  const handleStageMouseMove = useCallback(
    (event: KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const pos = getImagePointerPosition(stage, event);
      setPointerImage(pos);
    },
    [],
  );

  const handleStageClick = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (isPanning) return;
      const stage = stageRef.current;
      if (!stage || !backgroundDataUrl) return;
      const pos = getImagePointerPosition(stage, event);
      if (!pos) return;
      const clamped = clampPointToBackground(pos, backgroundWidth, backgroundHeight);

      if (editorMode === "calibrate") {
        if (calibrationDraft.length >= 2) return;
        addCalibrationPoint(clamped);
        return;
      }

      if (editorMode === "drawRoom") {
        if (polygonDraft.length >= 3 && pointNear(clamped, polygonDraft[0]!, HIT_RADIUS / viewState.scale)) {
          finishPolygonDraft();
          return;
        }
        addPolygonDraftPoint(clamped);
        return;
      }

      if (!pixelsPerMeter) return;
      if (editorMode === "placeDownlight") {
        addDownlightAtPoint(clamped.x, clamped.y);
        return;
      }

      const clicked = fixtures.find((f) => {
        const product = getPublicProduct(f.productId);
        const sizePx = product.widthM * pixelsPerMeter;
        return (
          clamped.x >= f.x - sizePx / 2 &&
          clamped.x <= f.x + sizePx / 2 &&
          clamped.y >= f.y - sizePx / 2 &&
          clamped.y <= f.y + sizePx / 2
        );
      });
      selectFixture(clicked?.id ?? null);
    },
    [
      isPanning,
      editorMode,
      backgroundDataUrl,
      backgroundWidth,
      backgroundHeight,
      calibrationDraft.length,
      polygonDraft,
      pixelsPerMeter,
      fixtures,
      viewState.scale,
      addCalibrationPoint,
      addPolygonDraftPoint,
      finishPolygonDraft,
      addDownlightAtPoint,
      selectFixture,
    ],
  );

  const handleDragEnd = useCallback(
    (id: string, productWidthM: number, event: KonvaEventObject<DragEvent>) => {
      if (!pixelsPerMeter) return;
      const node = event.target;
      moveFixtureById(
        id,
        node.x() + (productWidthM * pixelsPerMeter) / 2,
        node.y() + (productWidthM * pixelsPerMeter) / 2,
      );
    },
    [moveFixtureById, pixelsPerMeter],
  );

  const zoomBy = (direction: 1 | -1) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition() ?? {
      x: viewportSize.width / 2,
      y: viewportSize.height / 2,
    };
    updateViewState(zoomAtPoint(viewState, pointer, direction));
  };

  const fitToScreen = () => {
    setViewState(
      computeFitView(viewportSize.width, viewportSize.height, backgroundWidth, backgroundHeight),
    );
  };

  const zoomPercent = Math.round(viewState.scale * 100);

  const scaleInstruction =
    calibrationDraft.length === 0
      ? "Klik twee punten aan waarvan u de werkelijke afstand kent."
      : calibrationDraft.length === 1
        ? "Selecteer nu het tweede punt."
        : null;

  const subtitle = [
    roomMeta?.name,
    `${targetLux} lux`,
    `${ceilingHeightM.toFixed(2).replace(".", ",")} m`,
    atmosphereMeta?.cctLabel ? `${atmosphereMeta.cctLabel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--lp-bg)]"
      data-testid="floor-plan-editor"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--lp-border)] bg-white px-3 py-2 sm:px-4">
        <button type="button" className="lp-btn-secondary px-3 py-2 text-sm" onClick={prevStep}>
          ← Terug
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-bold sm:text-base">Plattegrond controleren</p>
          <p className="truncate text-xs text-[var(--lp-text-secondary)]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button type="button" className="hidden rounded-lg border px-2 py-1 text-xs sm:inline" title="Pan (Space + slepen)" onClick={() => setEditorMode(editorMode === "pan" ? "select" : "pan")}>
            Pan
          </button>
          <button type="button" className="rounded-lg border px-2 py-1 text-sm" onClick={() => zoomBy(-1)} aria-label="Zoom uit">−</button>
          <span className="min-w-[3rem] text-center text-xs font-semibold">{zoomPercent}%</span>
          <button type="button" className="rounded-lg border px-2 py-1 text-sm" onClick={() => zoomBy(1)} aria-label="Zoom in">+</button>
          <button type="button" className="hidden rounded-lg border px-2 py-1 text-xs lg:inline" onClick={fitToScreen}>Passend</button>
          <button type="button" className="hidden rounded-lg border px-2 py-1 text-xs lg:inline" onClick={() => updateViewState({ scale: 1, positionX: 40, positionY: 40 })}>100%</button>
          <button type="button" className="rounded-lg border px-2 py-1 text-xs lg:hidden" onClick={() => setMobilePanelOpen((v) => !v)}>
            Stappen
          </button>
          <button type="button" className="hidden rounded-lg border px-2 py-1 text-xs xl:inline" onClick={() => setSidePanelCollapsed(!sidePanelCollapsed)}>
            {sidePanelCollapsed ? "Paneel" : "Inklappen"}
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside
          className={`shrink-0 overflow-y-auto border-r border-[var(--lp-border)] bg-[var(--lp-bg-secondary)] transition-all ${
            sidePanelCollapsed ? "hidden xl:block xl:w-0 xl:overflow-hidden xl:border-0" : "hidden w-full max-w-[340px] xl:block"
          } ${mobilePanelOpen ? "absolute inset-x-0 top-0 z-10 max-h-[45vh] shadow-lg xl:relative xl:max-h-none xl:shadow-none" : "hidden xl:block"}`}
          style={{ width: sidePanelCollapsed ? 0 : SIDE_PANEL_WIDTH }}
        >
          <SidePanel
            editorPhase={editorPhase}
            scaleStepCollapsed={scaleStepCollapsed}
            pixelsPerMeter={pixelsPerMeter}
            calibrationDraft={calibrationDraft}
            roomReady={roomReady}
            generated={generated}
            recognizing={recognizing}
            aiRecognitionFailed={aiRecognitionFailed}
            showHeatmap={showHeatmap}
            fixturesCount={fixtures.length}
            onStartScale={() => { resetCalibrationDraft(); setEditorMode("calibrate"); setEditorPhase("scale"); setShowScaleDialog(false); }}
            onStartRoom={() => { setEditorMode("drawRoom"); setEditorPhase("room"); }}
            onFinishRoom={() => finishPolygonDraft()}
            onCancelRoom={() => cancelPolygonDraft()}
            onGenerate={() => { if (generateLightingPlan()) setGenerated(true); }}
            onUndo={undo}
            onRedo={redo}
            onDelete={deleteSelectedFixture}
            onAddDownlight={() => setEditorMode("placeDownlight")}
            onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
            onContinue={() => { if (fixtures.length > 0) nextStep(); }}
          />
        </aside>

        <div ref={canvasRef} className="relative min-w-0 flex-1 bg-[var(--lp-editor-bg)]">
          {scaleInstruction && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-lg bg-black/70 px-4 py-2 text-sm text-white">
              {scaleInstruction}
            </div>
          )}
          {editorMode === "drawRoom" && polygonDraft.length >= 3 && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-lg bg-black/70 px-4 py-2 text-xs text-white">
              Klik opnieuw op het eerste punt om de ruimte af te sluiten.
            </div>
          )}
          <p className="pointer-events-none absolute bottom-3 left-3 z-10 hidden rounded bg-black/50 px-2 py-1 text-xs text-white md:block">
            Scroll/trackpad zoom · Space + slepen om te verschuiven
          </p>
          <p className="pointer-events-none absolute bottom-3 right-3 z-10 rounded bg-black/50 px-2 py-1 text-xs text-white lg:hidden">
            Voor nauwkeurig intekenen werkt een groter scherm het prettigst.
          </p>

          {backgroundDataUrl && (
            <Stage
              ref={stageRef}
              width={viewportSize.width}
              height={viewportSize.height}
              scaleX={viewState.scale}
              scaleY={viewState.scale}
              x={viewState.positionX}
              y={viewState.positionY}
              draggable={isPanning}
              onWheel={handleWheel}
              onDragEnd={handleStageDragEnd}
              onMouseMove={handleStageMouseMove}
              onClick={handleStageClick}
              onTap={handleStageClick}
              className="ls-canvas-interactive"
            >
              <Layer>
                {image && (
                  <KonvaImage image={image} width={backgroundWidth} height={backgroundHeight} listening={false} />
                )}
                {showHeatmap &&
                  heatmapCells.map((cell, i) => (
                    <Rect
                      key={i}
                      x={cell.x}
                      y={cell.y}
                      width={Math.max(4, 0.35 * (pixelsPerMeter ?? 50))}
                      height={Math.max(4, 0.35 * (pixelsPerMeter ?? 50))}
                      fill={HEATMAP_LEVEL_COLORS[cell.level]}
                      listening={false}
                    />
                  ))}
                {roomVertices.length >= 3 && (
                  <Line
                    points={flattenVertices(roomVertices)}
                    closed
                    fill="rgba(24,166,106,0.12)"
                    stroke="#18A66A"
                    strokeWidth={2 / viewState.scale}
                    listening={false}
                  />
                )}
                {polygonDraft.length > 0 && (
                  <>
                    <Line
                      points={flattenVertices(polygonDraft)}
                      stroke="#18A66A"
                      strokeWidth={2 / viewState.scale}
                      dash={[8, 4]}
                      listening={false}
                    />
                    {pointerImage && polygonDraft.length > 0 && (
                      <Line
                        points={[
                          polygonDraft[polygonDraft.length - 1]!.x,
                          polygonDraft[polygonDraft.length - 1]!.y,
                          pointerImage.x,
                          pointerImage.y,
                        ]}
                        stroke="#18A66A"
                        strokeWidth={1 / viewState.scale}
                        dash={[4, 4]}
                        listening={false}
                      />
                    )}
                  </>
                )}
                {calibrationLine.length === 2 && (
                  <Line
                    points={flattenVertices(calibrationLine)}
                    stroke="#18A66A"
                    strokeWidth={3 / viewState.scale}
                    listening={false}
                  />
                )}
                {calibrationDraft.map((p, i) => (
                  <Circle key={`cal-${i}`} x={p.x} y={p.y} radius={HIT_RADIUS / viewState.scale} fill="#18A66A" stroke="#fff" strokeWidth={2 / viewState.scale} />
                ))}
                {polygonDraft.map((p, i) => (
                  <Circle
                    key={`poly-${i}`}
                    x={p.x}
                    y={p.y}
                    radius={(i === 0 ? HIT_RADIUS + 4 : HIT_RADIUS) / viewState.scale}
                    fill={i === 0 ? "#087A4C" : "#18A66A"}
                    stroke="#fff"
                    strokeWidth={2 / viewState.scale}
                    listening={false}
                  />
                ))}
                {fixtures.map((fixture) => {
                  const product = getPublicProduct(fixture.productId);
                  const sizePx = product.widthM * (pixelsPerMeter ?? 50);
                  const isSelected = fixture.id === selectedFixtureId;
                  return (
                    <Rect
                      key={fixture.id}
                      x={fixture.x - sizePx / 2}
                      y={fixture.y - sizePx / 2}
                      width={sizePx}
                      height={sizePx}
                      fill={product.category === "downlight" ? "#94a3b8" : "#18A66A"}
                      stroke={isSelected ? "#ffffff" : "#087A4C"}
                      strokeWidth={(isSelected ? 3 : 1) / viewState.scale}
                      cornerRadius={product.category === "downlight" ? sizePx / 2 : 4}
                      draggable={!isPanning && editorMode === "select"}
                      onDragEnd={(e) => handleDragEnd(fixture.id, product.widthM, e)}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        if (!isPanning) selectFixture(fixture.id);
                      }}
                    />
                  );
                })}
              </Layer>
            </Stage>
          )}
        </div>
      </div>

      {showScaleDialog && calibrationDraft.length === 2 && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="mb-3 text-lg font-bold">Wat is de werkelijke afstand?</h2>
            <input
              type="text"
              placeholder="4,80 m"
              value={calibrationDistanceMm}
              onChange={(e) => setCalibrationDistanceMm(e.target.value)}
              className="mb-4 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
              autoFocus
            />
            <div className="flex gap-2">
              <button type="button" className="lp-btn-secondary flex-1" onClick={() => setShowScaleDialog(false)}>
                Annuleren
              </button>
              <button
                type="button"
                data-testid="apply-scale-button"
                className="lp-btn-primary flex-1"
                onClick={() => {
                  if (applyCalibration()) {
                    setShowScaleDialog(false);
                    setEditorMode("drawRoom");
                  } else {
                    window.alert("Vul een geldige afstand in, bijvoorbeeld 4,80 m.");
                  }
                }}
              >
                Schaal instellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidePanel({
  editorPhase,
  scaleStepCollapsed,
  pixelsPerMeter,
  calibrationDraft,
  roomReady,
  generated,
  recognizing,
  aiRecognitionFailed,
  showHeatmap,
  fixturesCount,
  onStartScale,
  onStartRoom,
  onFinishRoom,
  onCancelRoom,
  onGenerate,
  onUndo,
  onRedo,
  onDelete,
  onAddDownlight,
  onToggleHeatmap,
  onContinue,
}: {
  editorPhase: string;
  scaleStepCollapsed: boolean;
  pixelsPerMeter: number | null;
  calibrationDraft: Point2D[];
  roomReady: boolean;
  generated: boolean;
  recognizing: boolean;
  aiRecognitionFailed: boolean;
  showHeatmap: boolean;
  fixturesCount: number;
  onStartScale: () => void;
  onStartRoom: () => void;
  onFinishRoom: () => void;
  onCancelRoom: () => void;
  onGenerate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onAddDownlight: () => void;
  onToggleHeatmap: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-3 p-4 text-sm">
      <StepBlock
        number={1}
        title="Schaal bepalen"
        collapsed={scaleStepCollapsed}
        active={editorPhase === "scale"}
        done={Boolean(pixelsPerMeter)}
      >
        <p className="text-xs text-[var(--lp-text-secondary)]">Klik twee bekende punten op de plattegrond.</p>
        <p className="text-xs">Punten: {calibrationDraft.length}/2</p>
        {pixelsPerMeter && <p className="text-xs font-medium text-[var(--lp-green-dark)]">{formatScaleLabel(pixelsPerMeter)}</p>}
        <button type="button" className="lp-btn-secondary w-full text-sm" onClick={onStartScale}>
          Schaal instellen
        </button>
      </StepBlock>

      <StepBlock number={2} title="Ruimte aangeven" active={editorPhase === "room"} done={roomReady} disabled={!pixelsPerMeter}>
        <button type="button" className="lp-btn-secondary w-full text-sm" disabled={!pixelsPerMeter} onClick={onStartRoom}>
          Ruimte tekenen
        </button>
        <button type="button" className="lp-btn-primary w-full text-sm" disabled={!pixelsPerMeter} onClick={onFinishRoom}>
          Ruimte afronden
        </button>
        <button type="button" className="lp-btn-secondary w-full text-sm" onClick={onCancelRoom}>
          Annuleren
        </button>
        {recognizing && <p className="text-xs">Ruimteherkenning…</p>}
        {aiRecognitionFailed && (
          <p className="rounded-lg bg-[var(--lp-green-soft)] p-2 text-xs text-[var(--lp-green-dark)]">
            Teken de ruimte eenvoudig zelf op de plattegrond.
          </p>
        )}
      </StepBlock>

      <StepBlock number={3} title="Controle" active={editorPhase === "review"} done={fixturesCount > 0} disabled={!roomReady}>
        {!generated && roomReady && (
          <button type="button" className="lp-btn-primary w-full py-3 font-bold" onClick={onGenerate}>
            Genereer mijn lichtplan
          </button>
        )}
        {generated && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="lp-btn-secondary text-xs" onClick={onUndo}>Ongedaan maken</button>
              <button type="button" className="lp-btn-secondary text-xs" onClick={onRedo}>Opnieuw</button>
              <button type="button" className="lp-btn-secondary text-xs" onClick={onDelete}>Verwijder selectie</button>
            </div>
            <button type="button" className="lp-btn-secondary w-full text-sm" onClick={onAddDownlight}>Downlight toevoegen</button>
            <button type="button" className={`w-full text-sm ${showHeatmap ? "lp-btn-primary" : "lp-btn-secondary"}`} onClick={onToggleHeatmap}>
              Bekijk lichtverdeling
            </button>
            <p className="text-xs text-[var(--lp-text-secondary)]">{PUBLIC_HEATMAP_DISCLAIMER}</p>
            <button type="button" data-testid="wizard-next-button" className="lp-btn-primary w-full py-3 font-bold" disabled={fixturesCount === 0} onClick={onContinue}>
              Naar resultaat
            </button>
          </div>
        )}
      </StepBlock>
    </div>
  );
}

function StepBlock({
  number,
  title,
  children,
  active,
  done,
  collapsed,
  disabled,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
  active?: boolean;
  done?: boolean;
  collapsed?: boolean;
  disabled?: boolean;
}) {
  if (collapsed && done) {
    return (
      <div className="rounded-lg border border-[var(--lp-border)] bg-white px-3 py-2 text-xs text-[var(--lp-text-secondary)]">
        ✓ {number}. {title}
      </div>
    );
  }
  return (
    <div className={`rounded-xl border bg-white p-3 ${active ? "border-[var(--lp-green)] ring-1 ring-[var(--lp-green)]" : "border-[var(--lp-border)]"} ${disabled ? "opacity-60" : ""}`}>
      <p className="mb-2 font-semibold">
        {done ? "✓ " : ""}{number}. {title}
      </p>
      {children}
    </div>
  );
}

/** @deprecated use StepEditor */
export const StepGenerate = StepEditor;
