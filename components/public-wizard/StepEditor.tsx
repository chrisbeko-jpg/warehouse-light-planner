"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import { formatScaleLabel } from "@/lib/floor-plan-scale";
import { clampPointToBackground, getImagePointerPosition } from "@/lib/floor-plan-pointer";
import { attemptRoomRecognition } from "@/lib/public-wizard/ai-room-detect";
import {
  computeHeatmapGradients,
  HEATMAP_GRADIENT_STOPS,
  PUBLIC_HEATMAP_DISCLAIMER,
} from "@/lib/public-wizard/heatmap";
import { CEILING_GRID_M, snapPointToGridPx } from "@/lib/public-wizard/grid";
import { getPublicProduct } from "@/lib/public-wizard/products";
import { getAtmosphere } from "@/lib/public-wizard/atmospheres";
import { getRoomFunction } from "@/lib/public-wizard/room-functions";
import { flattenVertices } from "@/lib/polygon-area";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardProgress } from "@/components/public-wizard/WizardShell";
import {
  computeFitView,
  pointNear,
  zoomAtPoint,
} from "@/lib/public-wizard/viewport";
import { useKonvaImage } from "@/components/floor-plan/useKonvaImage";
import type { Point2D } from "@/types/floor-plan";
import type { EditorPhase, PublicEditorMode } from "@/lib/public-wizard/store";

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
  const roomAreaM2 = usePublicWizardStore((s) => s.roomAreaM2);
  const fixtures = usePublicWizardStore((s) => s.fixtures);
  const selectedFixtureId = usePublicWizardStore((s) => s.selectedFixtureId);
  const showHeatmap = usePublicWizardStore((s) => s.showHeatmap);
  const lightingPlanGenerated = usePublicWizardStore((s) => s.lightingPlanGenerated);
  const layoutWarning = usePublicWizardStore((s) => s.layoutWarning);
  const editorMessage = usePublicWizardStore((s) => s.editorMessage);
  const viewState = usePublicWizardStore((s) => s.viewState);
  const aiRecognitionFailed = usePublicWizardStore((s) => s.aiRecognitionFailed);
  const aiRecognitionAttempted = usePublicWizardStore((s) => s.aiRecognitionAttempted);
  const preferredProductId = usePublicWizardStore((s) => s.preferredProductId);

  const prevStep = usePublicWizardStore((s) => s.prevStep);
  const nextStep = usePublicWizardStore((s) => s.nextStep);
  const setEditorMode = usePublicWizardStore((s) => s.setEditorMode);
  const setEditorPhase = usePublicWizardStore((s) => s.setEditorPhase);
  const setSidePanelCollapsed = usePublicWizardStore((s) => s.setSidePanelCollapsed);
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
  const moveFixtureByIdWithHistory = usePublicWizardStore((s) => s.moveFixtureByIdWithHistory);
  const deleteSelectedFixture = usePublicWizardStore((s) => s.deleteSelectedFixture);
  const duplicateSelectedFixture = usePublicWizardStore((s) => s.duplicateSelectedFixture);
  const addPanel = usePublicWizardStore((s) => s.addPanel);
  const addDownlight = usePublicWizardStore((s) => s.addDownlight);
  const clearEditorMessage = usePublicWizardStore((s) => s.clearEditorMessage);
  const setShowHeatmap = usePublicWizardStore((s) => s.setShowHeatmap);
  const resetScaleDependentState = usePublicWizardStore((s) => s.resetScaleDependentState);
  const reopenRoomDrawing = usePublicWizardStore((s) => s.reopenRoomDrawing);
  const getIndicativeResult = usePublicWizardStore((s) => s.getIndicativeResult);
  const undo = usePublicWizardStore((s) => s.undo);
  const redo = usePublicWizardStore((s) => s.redo);
  const updateViewState = usePublicWizardStore((s) => s.updateViewState);
  const setViewState = usePublicWizardStore((s) => s.setViewState);

  const canvasRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const [recognizing, setRecognizing] = useState(false);
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [showScaleResetDialog, setShowScaleResetDialog] = useState(false);
  const [spacePanning, setSpacePanning] = useState(false);
  const [pointerImage, setPointerImage] = useState<Point2D | null>(null);
  const [snapPreview, setSnapPreview] = useState<Point2D | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(true);
  const image = useKonvaImage(backgroundDataUrl ?? undefined);

  const roomMeta = roomFunction ? getRoomFunction(roomFunction) : null;
  const atmosphereMeta = atmosphere ? getAtmosphere(atmosphere) : null;
  const scaleComplete = Boolean(pixelsPerMeter);
  const roomComplete = roomVertices.length >= 3 && editorPhase === "plan";
  const roomReady = roomVertices.length >= 3 && Boolean(pixelsPerMeter);
  const panelWidth = sidePanelCollapsed ? 0 : SIDE_PANEL_WIDTH;
  const indicativeResult = getIndicativeResult();

  useEffect(() => {
    if (!pixelsPerMeter) {
      setEditorMode("calibrate-scale");
      setEditorPhase("scale");
    }
  }, [pixelsPerMeter, setEditorMode, setEditorPhase]);

  useEffect(() => {
    if (calibrationDraft.length === 2 && editorMode === "calibrate-scale") {
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
        return;
      }

      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const { selectedFixtureId, step, editorMode } = usePublicWizardStore.getState();
      if (step !== "editor" || editorMode !== "select" || !selectedFixtureId) return;

      e.preventDefault();
      deleteSelectedFixture();
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
  }, [deleteSelectedFixture]);

  const runRecognition = useCallback(async () => {
    if (!backgroundDataUrl || !pixelsPerMeter) return;
    setRecognizing(true);
    setAiRecognitionState(false, false);
    const result = await attemptRoomRecognition(backgroundDataUrl, pixelsPerMeter);
    setAiRecognitionState(true, result.failed);
    if (result.vertices && result.vertices.length >= 3) {
      setRoomVertices(result.vertices);
      setEditorPhase("plan");
      setEditorMode("select");
    }
    setRecognizing(false);
  }, [backgroundDataUrl, pixelsPerMeter, setAiRecognitionState, setRoomVertices, setEditorPhase, setEditorMode]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem("skip-ai-room") === "1") return;
    if (pixelsPerMeter && backgroundDataUrl && !aiRecognitionAttempted) void runRecognition();
  }, [pixelsPerMeter, backgroundDataUrl, aiRecognitionAttempted, runRecognition]);

  const heatmapSpots = useMemo(() => {
    if (!showHeatmap || !pixelsPerMeter || fixtures.length === 0) return [];
    return computeHeatmapGradients(
      fixtures,
      roomVertices,
      pixelsPerMeter,
      ceilingHeightM,
      targetLux,
    );
  }, [showHeatmap, pixelsPerMeter, fixtures, roomVertices, ceilingHeightM, targetLux]);

  const isPanning = editorMode === "pan" || spacePanning;
  const gridStepPx = (pixelsPerMeter ?? 50) * CEILING_GRID_M;

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
      if (event.target !== event.target.getStage()) return;
      updateViewState({
        positionX: event.target.x(),
        positionY: event.target.y(),
      });
    },
    [updateViewState],
  );

  const handleStageMouseMove = useCallback((event: KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = getImagePointerPosition(stage, event);
    setPointerImage(pos);
  }, []);

  const handleStageClick = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (isPanning) return;
      const stage = stageRef.current;
      if (!stage || !backgroundDataUrl) return;
      const pos = getImagePointerPosition(stage, event);
      if (!pos) return;
      const clamped = clampPointToBackground(pos, backgroundWidth, backgroundHeight);

      if (editorMode === "calibrate-scale") {
        if (calibrationDraft.length >= 2) return;
        addCalibrationPoint(clamped);
        return;
      }

      if (editorMode === "draw-room") {
        if (polygonDraft.length >= 3 && pointNear(clamped, polygonDraft[0]!, HIT_RADIUS / viewState.scale)) {
          finishPolygonDraft();
          return;
        }
        addPolygonDraftPoint(clamped);
        return;
      }

      if (!pixelsPerMeter) return;

      if (editorMode !== "select") return;

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
      selectFixture,
    ],
  );

  const syncFixtureNode = useCallback((node: Konva.Rect, centerX: number, centerY: number) => {
    node.position({
      x: centerX - node.width() / 2,
      y: centerY - node.height() / 2,
    });
  }, []);

  const handleFixtureDragMove = useCallback(
    (event: KonvaEventObject<DragEvent>) => {
      if (!pixelsPerMeter) return;
      event.cancelBubble = true;
      const node = event.target as Konva.Rect;
      const centerX = node.x() + node.width() / 2;
      const centerY = node.y() + node.height() / 2;
      setSnapPreview(snapPointToGridPx({ x: centerX, y: centerY }, pixelsPerMeter));
    },
    [pixelsPerMeter],
  );

  const handleFixtureDragEnd = useCallback(
    (id: string, event: KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      if (!pixelsPerMeter) return;
      const node = event.target as Konva.Rect;
      const centerX = node.x() + node.width() / 2;
      const centerY = node.y() + node.height() / 2;
      moveFixtureByIdWithHistory(id, centerX, centerY);
      const updated = usePublicWizardStore.getState().fixtures.find((f) => f.id === id);
      if (updated) syncFixtureNode(node, updated.x, updated.y);
      setSnapPreview(null);
    },
    [moveFixtureByIdWithHistory, pixelsPerMeter, syncFixtureNode],
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
    editorMode === "calibrate-scale" && !scaleComplete
      ? calibrationDraft.length === 0
        ? "Klik twee punten op de plattegrond waarvan u de werkelijke afstand kent."
        : calibrationDraft.length === 1
          ? "Selecteer nu het tweede punt."
          : null
      : null;

  const subtitle = [
    roomMeta?.name,
    `${targetLux} lux`,
    `${ceilingHeightM.toFixed(2).replace(".", ",")} m`,
    atmosphereMeta?.cctLabel ? `${atmosphereMeta.cctLabel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const roomClipFunc = useCallback(
    (ctx: Konva.Context) => {
      if (roomVertices.length < 3) return;
      ctx.beginPath();
      roomVertices.forEach((v, i) => {
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
    },
    [roomVertices],
  );

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
          <button
            type="button"
            className="hidden rounded-lg border px-2 py-1 text-xs sm:inline"
            title="Pan (Space + slepen)"
            onClick={() => setEditorMode(editorMode === "pan" ? "select" : "pan")}
          >
            Pan
          </button>
          <button type="button" className="rounded-lg border px-2 py-1 text-sm" onClick={() => zoomBy(-1)} aria-label="Zoom uit">
            −
          </button>
          <span className="min-w-[3rem] text-center text-xs font-semibold">{zoomPercent}%</span>
          <button type="button" className="rounded-lg border px-2 py-1 text-sm" onClick={() => zoomBy(1)} aria-label="Zoom in">
            +
          </button>
          <button type="button" className="hidden rounded-lg border px-2 py-1 text-xs lg:inline" onClick={fitToScreen}>
            Passend
          </button>
          <button
            type="button"
            className="hidden rounded-lg border px-2 py-1 text-xs lg:inline"
            onClick={() => updateViewState({ scale: 1, positionX: 40, positionY: 40 })}
          >
            100%
          </button>
          <button type="button" className="rounded-lg border px-2 py-1 text-xs lg:hidden" onClick={() => setMobilePanelOpen((v) => !v)}>
            Stappen
          </button>
          <button
            type="button"
            className="hidden rounded-lg border px-2 py-1 text-xs xl:inline"
            onClick={() => setSidePanelCollapsed(!sidePanelCollapsed)}
          >
            {sidePanelCollapsed ? "Paneel" : "Inklappen"}
          </button>
        </div>
      </header>

      <div className="shrink-0 border-b border-[var(--lp-border)] bg-white px-3 py-2 sm:px-4">
        <WizardProgress />
      </div>

      <div className="relative flex min-h-0 flex-1">
        <aside
          className={`shrink-0 overflow-y-auto border-r border-[var(--lp-border)] bg-[var(--lp-bg-secondary)] transition-all ${
            sidePanelCollapsed
              ? "hidden xl:block xl:w-0 xl:overflow-hidden xl:border-0"
              : mobilePanelOpen
                ? "absolute inset-x-0 top-0 z-10 block max-h-[45vh] w-full max-w-[340px] shadow-lg xl:relative xl:max-h-none xl:shadow-none"
                : "hidden w-full max-w-[340px] xl:block"
          }`}
          style={{ width: sidePanelCollapsed ? 0 : SIDE_PANEL_WIDTH }}
        >
          <SidePanel
            editorPhase={editorPhase}
            editorMode={editorMode}
            scaleComplete={scaleComplete}
            roomComplete={roomComplete}
            roomAreaM2={roomAreaM2}
            pixelsPerMeter={pixelsPerMeter}
            recognizing={recognizing}
            aiRecognitionFailed={aiRecognitionFailed}
            showHeatmap={showHeatmap}
            lightingPlanGenerated={lightingPlanGenerated}
            fixturesCount={fixtures.length}
            indicativeResult={indicativeResult}
            hasSelection={Boolean(selectedFixtureId)}
            onReopenScale={() => setShowScaleResetDialog(true)}
            onResetCalibrationPoints={() => {
              resetCalibrationDraft();
              setShowScaleDialog(false);
            }}
            calibrationDraftCount={calibrationDraft.length}
            onReopenRoom={() => reopenRoomDrawing()}
            onGenerate={() => generateLightingPlan()}
            onUndo={undo}
            onRedo={redo}
            onDelete={deleteSelectedFixture}
            onDuplicate={duplicateSelectedFixture}
            onAddPanel={() => {
              clearEditorMessage();
              addPanel();
            }}
            onAddDownlight={() => {
              clearEditorMessage();
              addDownlight();
            }}
            layoutWarning={layoutWarning}
            editorMessage={editorMessage}
            onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
            onContinue={() => {
              if (fixtures.length > 0) nextStep();
            }}
          />
        </aside>

        <div ref={canvasRef} data-testid="editor-canvas-area" className="relative min-w-0 flex-1 bg-[var(--lp-editor-bg)]">
          {scaleInstruction && (
            <div
              className="pointer-events-none absolute left-1/2 top-3 z-10 flex max-w-[min(100%,28rem)] -translate-x-1/2 flex-col items-center gap-2 px-3 sm:flex-row"
              data-testid="scale-instruction"
            >
              <p className="rounded-lg bg-black/70 px-4 py-2 text-center text-sm text-white">{scaleInstruction}</p>
              {calibrationDraft.length >= 1 && (
                <button
                  type="button"
                  data-testid="calibration-restart-overlay-button"
                  className="lp-btn-secondary lp-touch-target pointer-events-auto shrink-0 text-sm"
                  onClick={() => {
                    resetCalibrationDraft();
                    setShowScaleDialog(false);
                  }}
                >
                  Opnieuw
                </button>
              )}
            </div>
          )}
          {scaleComplete && editorMode !== "calibrate-scale" && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-10 hidden -translate-x-1/2 rounded-lg bg-[var(--lp-green-dark)]/90 px-4 py-2 text-sm text-white sm:block">
              Schaal ingesteld ✓
            </div>
          )}
          {editorMode === "draw-room" && polygonDraft.length >= 3 && (
            <div className="pointer-events-none absolute left-1/2 top-12 z-10 -translate-x-1/2 rounded-lg bg-black/70 px-4 py-2 text-xs text-white">
              Klik opnieuw op het eerste punt om de ruimte af te sluiten.
            </div>
          )}
          {showHeatmap && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-slate-800/90 px-3 py-2 text-xs text-white">
              <p className="mb-1 font-semibold">Indicatieve lichtverdeling</p>
              <div className="flex flex-wrap gap-3">
                <span><span className="inline-block h-2 w-2 rounded-full bg-purple-400" /> Paars = hoog</span>
                <span><span className="inline-block h-2 w-2 rounded-full bg-orange-400" /> Oranje = gemiddeld</span>
                <span><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Rood = laag</span>
                <span>Geen kleur = weinig dekking</span>
              </div>
            </div>
          )}
          <p className="pointer-events-none absolute bottom-3 left-3 z-10 hidden rounded bg-black/50 px-2 py-1 text-xs text-white md:block">
            Scroll/trackpad zoom · Space + slepen om te verschuiven
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
              <Layer listening={false}>
                {image && (
                  <KonvaImage image={image} width={backgroundWidth} height={backgroundHeight} />
                )}
              </Layer>

              <Layer listening={false}>
                {showHeatmap && roomVertices.length >= 3 && (
                  <Group clipFunc={roomClipFunc}>
                    {heatmapSpots.map((spot) => {
                      const stops = HEATMAP_GRADIENT_STOPS[spot.level];
                      return (
                        <Circle
                          key={spot.fixtureId}
                          x={spot.x}
                          y={spot.y}
                          radius={spot.radiusPx}
                          fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                          fillRadialGradientStartRadius={0}
                          fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                          fillRadialGradientEndRadius={spot.radiusPx}
                          fillRadialGradientColorStops={[
                            0,
                            stops.inner,
                            0.45,
                            stops.mid,
                            1,
                            stops.outer,
                          ]}
                        />
                      );
                    })}
                  </Group>
                )}
                {roomVertices.length >= 3 && (
                  <Line
                    points={flattenVertices(roomVertices)}
                    closed
                    fill="rgba(24,166,106,0.12)"
                    stroke="#18A66A"
                    strokeWidth={2 / viewState.scale}
                  />
                )}
              </Layer>

              <Layer>
                {polygonDraft.length > 0 && (
                  <>
                    <Line
                      points={flattenVertices(polygonDraft)}
                      stroke="#18A66A"
                      strokeWidth={2 / viewState.scale}
                      dash={[8, 4]}
                      listening={false}
                    />
                    {pointerImage && (
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
                  <Circle
                    key={`cal-${i}`}
                    x={p.x}
                    y={p.y}
                    radius={HIT_RADIUS / viewState.scale}
                    fill="#18A66A"
                    stroke="#fff"
                    strokeWidth={2 / viewState.scale}
                    listening={false}
                  />
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
                {snapPreview && (
                  <>
                    <Circle
                      x={snapPreview.x}
                      y={snapPreview.y}
                      radius={6 / viewState.scale}
                      stroke="#18A66A"
                      strokeWidth={2 / viewState.scale}
                      dash={[4, 4]}
                      listening={false}
                    />
                    <Line
                      points={[snapPreview.x - gridStepPx / 4, snapPreview.y, snapPreview.x + gridStepPx / 4, snapPreview.y]}
                      stroke="rgba(24,166,106,0.5)"
                      strokeWidth={1 / viewState.scale}
                      listening={false}
                    />
                    <Line
                      points={[snapPreview.x, snapPreview.y - gridStepPx / 4, snapPreview.x, snapPreview.y + gridStepPx / 4]}
                      stroke="rgba(24,166,106,0.5)"
                      strokeWidth={1 / viewState.scale}
                      listening={false}
                    />
                  </>
                )}
                {fixtures.map((fixture) => {
                  const product = getPublicProduct(fixture.productId);
                  const ppm = pixelsPerMeter ?? 50;
                  const sizePx = product.widthM * ppm;
                  const isSelected = fixture.id === selectedFixtureId;
                  const canDrag = !isPanning && editorMode === "select";
                  return (
                    <Rect
                      key={fixture.id}
                      data-testid={`fixture-${fixture.id}`}
                      x={fixture.x - sizePx / 2}
                      y={fixture.y - sizePx / 2}
                      width={sizePx}
                      height={sizePx}
                      fill={product.category === "downlight" ? "#94a3b8" : "#18A66A"}
                      stroke={isSelected ? "#ffffff" : "#087A4C"}
                      strokeWidth={(isSelected ? 3 : 1) / viewState.scale}
                      cornerRadius={product.category === "downlight" ? sizePx / 2 : 4}
                      draggable={canDrag}
                      onDragStart={(e) => {
                        e.cancelBubble = true;
                      }}
                      onDragMove={handleFixtureDragMove}
                      onDragEnd={(e) => handleFixtureDragEnd(fixture.id, e)}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        if (!isPanning && editorMode === "select") selectFixture(fixture.id);
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
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
            role="dialog"
            aria-labelledby="scale-distance-title"
            data-testid="scale-distance-dialog"
          >
            <h2 id="scale-distance-title" className="mb-3 text-lg font-bold">
              Wat is de werkelijke afstand?
            </h2>
            <input
              type="text"
              placeholder="4,80 m"
              value={calibrationDistanceMm}
              onChange={(e) => setCalibrationDistanceMm(e.target.value)}
              className="lp-touch-target mb-3 w-full rounded-lg border border-[var(--lp-border)] px-3 py-2"
              autoFocus
            />
            <button
              type="button"
              data-testid="calibration-restart-dialog-button"
              className="lp-btn-secondary lp-touch-target mb-4 w-full text-sm"
              onClick={() => {
                resetCalibrationDraft();
                setShowScaleDialog(false);
              }}
            >
              Opnieuw
            </button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="lp-btn-secondary lp-touch-target flex-1"
                onClick={() => setShowScaleDialog(false)}
              >
                Annuleren
              </button>
              <button
                type="button"
                data-testid="apply-scale-button"
                className="lp-btn-primary lp-touch-target flex-1"
                onClick={() => {
                  if (applyCalibration()) {
                    setShowScaleDialog(false);
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

      {showScaleResetDialog && (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            role="dialog"
            aria-labelledby="scale-reset-title"
            data-testid="scale-reset-dialog"
          >
            <h2 id="scale-reset-title" className="mb-3 text-lg font-bold">
              Schaal opnieuw instellen?
            </h2>
            <p className="mb-5 text-sm leading-relaxed text-[var(--lp-text-secondary)]">
              Als u de schaal wijzigt, wordt het huidige lichtplan verwijderd en begint u opnieuw vanaf
              de schaalinstelling. Uw gekozen ruimtefunctie, sfeer en geüploade plattegrond blijven
              behouden.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                data-testid="scale-reset-cancel-button"
                className="lp-btn-secondary lp-touch-target flex-1"
                onClick={() => setShowScaleResetDialog(false)}
              >
                Annuleren
              </button>
              <button
                type="button"
                data-testid="scale-reset-confirm-button"
                className="lp-btn-destructive flex-1"
                onClick={() => {
                  resetScaleDependentState();
                  setShowScaleResetDialog(false);
                  setShowScaleDialog(false);
                }}
              >
                Schaal opnieuw instellen
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
  editorMode,
  scaleComplete,
  roomComplete,
  roomAreaM2,
  pixelsPerMeter,
  recognizing,
  aiRecognitionFailed,
  showHeatmap,
  lightingPlanGenerated,
  fixturesCount,
  indicativeResult,
  hasSelection,
  onReopenScale,
  onResetCalibrationPoints,
  calibrationDraftCount,
  onReopenRoom,
  onGenerate,
  onUndo,
  onRedo,
  onDelete,
  onDuplicate,
  onAddPanel,
  onAddDownlight,
  layoutWarning,
  editorMessage,
  onToggleHeatmap,
  onContinue,
}: {
  editorPhase: EditorPhase;
  editorMode: PublicEditorMode;
  scaleComplete: boolean;
  roomComplete: boolean;
  roomAreaM2: number | null;
  pixelsPerMeter: number | null;
  recognizing: boolean;
  aiRecognitionFailed: boolean;
  showHeatmap: boolean;
  lightingPlanGenerated: boolean;
  fixturesCount: number;
  indicativeResult: ReturnType<ReturnType<typeof usePublicWizardStore.getState>["getIndicativeResult"]>;
  hasSelection: boolean;
  onReopenScale: () => void;
  onResetCalibrationPoints: () => void;
  calibrationDraftCount: number;
  onReopenRoom: () => void;
  onGenerate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddPanel: () => void;
  onAddDownlight: () => void;
  layoutWarning: string | null;
  editorMessage: string | null;
  onToggleHeatmap: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-3 p-4 text-sm" data-testid="editor-steps-panel">
      <StepBlock
        number={1}
        title="Schaal"
        active={editorPhase === "scale" || editorMode === "calibrate-scale"}
        done={scaleComplete}
        statusLabel={scaleComplete ? "Schaal ingesteld ✓" : undefined}
      >
        {!scaleComplete && (
          <p className="text-xs text-[var(--lp-text-secondary)]">
            Klik twee punten op de plattegrond waarvan u de werkelijke afstand kent.
          </p>
        )}
        {!scaleComplete && editorMode === "calibrate-scale" && calibrationDraftCount >= 1 && (
          <button
            type="button"
            data-testid="calibration-restart-button"
            className="lp-btn-secondary lp-touch-target w-full text-sm"
            onClick={onResetCalibrationPoints}
          >
            Opnieuw
          </button>
        )}
        {scaleComplete && pixelsPerMeter && (
          <p className="text-xs font-medium text-[var(--lp-green-dark)]">{formatScaleLabel(pixelsPerMeter)}</p>
        )}
        {scaleComplete && (
          <button
            type="button"
            data-testid="reset-scale-button"
            className="lp-btn-secondary lp-touch-target w-full text-sm"
            onClick={onReopenScale}
          >
            Schaal opnieuw instellen
          </button>
        )}
      </StepBlock>

      <StepBlock
        number={2}
        title="Ruimte"
        active={editorPhase === "room" || editorMode === "draw-room"}
        done={roomComplete}
        disabled={!scaleComplete}
        statusLabel={roomComplete ? "Ruimte ingesteld ✓" : undefined}
      >
        {roomComplete && roomAreaM2 != null && (
          <p className="text-xs font-medium text-[var(--lp-green-dark)]">
            Oppervlakte: {roomAreaM2.toFixed(1).replace(".", ",")} m²
          </p>
        )}
        {roomComplete ? (
          <button type="button" className="lp-btn-secondary w-full text-sm" onClick={onReopenRoom}>
            Ruimte aanpassen
          </button>
        ) : (
          <>
            {recognizing && <p className="text-xs">Ruimteherkenning…</p>}
            {aiRecognitionFailed && (
              <p className="rounded-lg bg-[var(--lp-green-soft)] p-2 text-xs text-[var(--lp-green-dark)]">
                Teken de ruimte eenvoudig zelf op de plattegrond.
              </p>
            )}
            {editorMode === "draw-room" && (
              <p className="text-xs text-[var(--lp-text-secondary)]">Tekenmodus actief — klik punten op de plattegrond.</p>
            )}
          </>
        )}
      </StepBlock>

      <StepBlock
        number={3}
        title="Lichtplan"
        active={editorPhase === "plan" && roomComplete}
        done={fixturesCount > 0}
        disabled={!roomComplete}
      >
        {!lightingPlanGenerated && roomComplete && (
          <button
            type="button"
            data-testid="generate-light-plan-button"
            className="lp-btn-primary w-full py-3 font-bold"
            onClick={onGenerate}
          >
            Genereer lichtplan
          </button>
        )}
        {roomComplete && (
          <div className="space-y-2">
            {layoutWarning && (
              <p className="rounded-lg bg-orange-50 p-2 text-xs text-orange-800" data-testid="layout-warning">
                {layoutWarning}
              </p>
            )}
            {editorMessage && (
              <p className="rounded-lg bg-[var(--lp-green-soft)] p-2 text-xs text-[var(--lp-green-dark)]" data-testid="editor-message">
                {editorMessage}
              </p>
            )}
            {lightingPlanGenerated && (
              <>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="lp-btn-secondary text-xs" onClick={onUndo}>
                    Ongedaan maken
                  </button>
                  <button type="button" className="lp-btn-secondary text-xs" onClick={onRedo}>
                    Opnieuw
                  </button>
                  <button type="button" className="lp-btn-secondary text-xs" disabled={!hasSelection} onClick={onDelete} data-testid="delete-fixture-button">
                    Verwijderen
                  </button>
                  <button type="button" className="lp-btn-secondary text-xs" disabled={!hasSelection} onClick={onDuplicate}>
                    Dupliceren
                  </button>
                </div>
                <button
                  type="button"
                  data-testid="add-panel-button"
                  className="lp-btn-secondary w-full text-sm"
                  onClick={onAddPanel}
                >
                  LED-paneel toevoegen
                </button>
                <button
                  type="button"
                  data-testid="add-downlight-button"
                  className="lp-btn-secondary w-full text-sm"
                  onClick={onAddDownlight}
                >
                  Downlight toevoegen
                </button>
              </>
            )}
            {fixturesCount > 0 && (
              <button
                type="button"
                data-testid="toggle-heatmap-button"
                className={`w-full text-sm ${showHeatmap ? "lp-btn-primary" : "lp-btn-secondary"}`}
                onClick={onToggleHeatmap}
              >
                Lichtverdeling
              </button>
            )}
            {showHeatmap && (
              <p className="text-xs text-[var(--lp-text-secondary)]">{PUBLIC_HEATMAP_DISCLAIMER}</p>
            )}
            {indicativeResult && fixturesCount > 0 && (
              <div className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-bg)] p-2 text-xs" data-testid="fixtures-summary">
                <p>Doel-lux: {indicativeResult.targetLux}</p>
                <p data-testid="fixtures-count">Armaturen: {indicativeResult.fixtureCount}</p>
                <p>Indicatief gemiddelde lux: {indicativeResult.indicativeAverageLux}</p>
                <p>Totaal wattage: {indicativeResult.totalWattage} W</p>
                <p className={indicativeResult.meetsTarget ? "text-[var(--lp-green-dark)]" : "text-orange-600"}>
                  Voldoet: {indicativeResult.meetsTarget ? "ja" : "nee"}
                </p>
              </div>
            )}
            {fixturesCount > 0 && (
              <button
                type="button"
                data-testid="editor-continue-button"
                className="lp-btn-primary w-full py-3 font-bold"
                onClick={onContinue}
              >
                Naar resultaat
              </button>
            )}
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
  disabled,
  statusLabel,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
  active?: boolean;
  done?: boolean;
  disabled?: boolean;
  statusLabel?: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-3 ${active ? "border-[var(--lp-green)] ring-1 ring-[var(--lp-green)]" : "border-[var(--lp-border)]"} ${disabled ? "opacity-60" : ""}`}
      data-testid={`editor-step-${number}`}
      data-step-done={done ? "true" : "false"}
    >
      <p className="mb-2 font-semibold">
        {done ? "✓ " : ""}
        {number}. {title}
        {statusLabel ? ` — ${statusLabel}` : ""}
      </p>
      {children}
    </div>
  );
}

/** @deprecated use StepEditor */
export const StepGenerate = StepEditor;
