"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, Image as KonvaImage, Layer, Line, Rect, Stage } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import { formatScaleLabel } from "@/lib/floor-plan-scale";
import { attemptRoomRecognition } from "@/lib/public-wizard/ai-room-detect";
import {
  computePublicHeatmap,
  HEATMAP_LEVEL_COLORS,
  PUBLIC_HEATMAP_DISCLAIMER,
} from "@/lib/public-wizard/heatmap";
import { getPublicProduct, PUBLIC_PRODUCTS } from "@/lib/public-wizard/products";
import { flattenVertices } from "@/lib/polygon-area";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardCard, WizardNav } from "@/components/public-wizard/WizardShell";
import { useKonvaImage } from "@/components/floor-plan/useKonvaImage";

const STAGE_MAX_WIDTH = 900;
function stageWidth(bgWidth: number) { return Math.min(bgWidth, STAGE_MAX_WIDTH); }
function stageHeight(bgWidth: number, bgHeight: number) {
  return Math.round((bgHeight / bgWidth) * stageWidth(bgWidth));
}

export function StepEditor() {
  const backgroundDataUrl = usePublicWizardStore((s) => s.backgroundDataUrl);
  const backgroundWidth = usePublicWizardStore((s) => s.backgroundWidth);
  const backgroundHeight = usePublicWizardStore((s) => s.backgroundHeight);
  const pixelsPerMeter = usePublicWizardStore((s) => s.pixelsPerMeter);
  const editorMode = usePublicWizardStore((s) => s.editorMode);
  const calibrationDraft = usePublicWizardStore((s) => s.calibrationDraft);
  const calibrationDistanceMm = usePublicWizardStore((s) => s.calibrationDistanceMm);
  const polygonDraft = usePublicWizardStore((s) => s.polygonDraft);
  const roomVertices = usePublicWizardStore((s) => s.roomVertices);
  const fixtures = usePublicWizardStore((s) => s.fixtures);
  const selectedFixtureId = usePublicWizardStore((s) => s.selectedFixtureId);
  const showHeatmap = usePublicWizardStore((s) => s.showHeatmap);
  const targetLux = usePublicWizardStore((s) => s.targetLux);
  const ceilingHeightM = usePublicWizardStore((s) => s.ceilingHeightM);
  const downlightProductId = usePublicWizardStore((s) => s.downlightProductId);
  const preferredProductId = usePublicWizardStore((s) => s.preferredProductId);
  const aiRecognitionFailed = usePublicWizardStore((s) => s.aiRecognitionFailed);
  const aiRecognitionAttempted = usePublicWizardStore((s) => s.aiRecognitionAttempted);

  const setEditorMode = usePublicWizardStore((s) => s.setEditorMode);
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
  const setDownlightProductId = usePublicWizardStore((s) => s.setDownlightProductId);
  const undo = usePublicWizardStore((s) => s.undo);
  const redo = usePublicWizardStore((s) => s.redo);
  const nextStep = usePublicWizardStore((s) => s.nextStep);

  const stageRef = useRef<Konva.Stage>(null);
  const [generated, setGenerated] = useState(fixtures.length > 0);
  const [recognizing, setRecognizing] = useState(false);
  const image = useKonvaImage(backgroundDataUrl ?? undefined);
  const panelProduct = getPublicProduct(preferredProductId);
  const roomReady = roomVertices.length >= 3 && Boolean(pixelsPerMeter);

  const runRecognition = useCallback(async () => {
    if (!backgroundDataUrl || !pixelsPerMeter) return;
    setRecognizing(true);
    setAiRecognitionState(false, false);
    const result = await attemptRoomRecognition(backgroundDataUrl, pixelsPerMeter);
    setAiRecognitionState(true, result.failed);
    if (result.vertices && result.vertices.length >= 3) setRoomVertices(result.vertices);
    setRecognizing(false);
  }, [backgroundDataUrl, pixelsPerMeter, setAiRecognitionState, setRoomVertices]);

  useEffect(() => {
    if (pixelsPerMeter && backgroundDataUrl && !aiRecognitionAttempted) void runRecognition();
  }, [pixelsPerMeter, backgroundDataUrl, aiRecognitionAttempted, runRecognition]);

  const heatmapCells = useMemo(() => {
    if (!showHeatmap || !pixelsPerMeter || fixtures.length === 0) return [];
    return computePublicHeatmap(fixtures, roomVertices, pixelsPerMeter, ceilingHeightM, targetLux);
  }, [showHeatmap, pixelsPerMeter, fixtures, roomVertices, ceilingHeightM, targetLux]);

  const handleStageClick = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (!stage || !backgroundDataUrl) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      if (editorMode === "calibrate") { addCalibrationPoint(pos); return; }
      if (editorMode === "drawRoom") { addPolygonDraftPoint(pos); return; }
      if (!pixelsPerMeter) return;
      if (editorMode === "placeDownlight") { addDownlightAtPoint(pos.x, pos.y); return; }
      const clicked = fixtures.find((f) => {
        const product = getPublicProduct(f.productId);
        const sizePx = product.widthM * pixelsPerMeter;
        return pos.x >= f.x - sizePx / 2 && pos.x <= f.x + sizePx / 2 && pos.y >= f.y - sizePx / 2 && pos.y <= f.y + sizePx / 2;
      });
      selectFixture(clicked?.id ?? null);
    },
    [editorMode, fixtures, pixelsPerMeter, backgroundDataUrl, addCalibrationPoint, addPolygonDraftPoint, addDownlightAtPoint, selectFixture],
  );

  const handleDragEnd = useCallback(
    (id: string, productWidthM: number, event: KonvaEventObject<DragEvent>) => {
      if (!pixelsPerMeter) return;
      moveFixtureById(id, event.target.x() + (productWidthM * pixelsPerMeter) / 2, event.target.y() + (productWidthM * pixelsPerMeter) / 2);
    },
    [moveFixtureById, pixelsPerMeter],
  );

  return (
    <div>
      <h1 className="lp-heading-2 mb-2">Stel uw lichtplan samen</h1>
      <p className="lp-body mb-4">
        Kalibreer de schaal, teken de ruimte en genereer indicatief {panelProduct.name}. Pas daarna armaturen aan.
      </p>

      <WizardCard className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="lp-btn-secondary text-sm" onClick={() => { resetCalibrationDraft(); setEditorMode("calibrate"); }}>Schaal instellen</button>
          <button type="button" className="lp-btn-secondary text-sm" disabled={!pixelsPerMeter} onClick={() => setEditorMode("drawRoom")}>Ruimte tekenen</button>
        </div>
        <p className="text-sm font-medium text-[var(--lp-text-secondary)]">{formatScaleLabel(pixelsPerMeter)}</p>
        {editorMode === "calibrate" && (
          <div className="space-y-2 rounded-lg border border-[var(--lp-border)] p-3">
            <p className="text-xs">Punten: {calibrationDraft.length}/2</p>
            <input type="number" placeholder="Afstand in mm" value={calibrationDistanceMm} onChange={(e) => setCalibrationDistanceMm(e.target.value)} className="w-full rounded border border-[var(--lp-border)] px-2 py-1 text-sm" />
            <button type="button" className="lp-btn-primary text-sm" onClick={() => { if (!applyCalibration()) window.alert("Vul twee punten en een geldige afstand in."); }}>Schaal toepassen</button>
          </div>
        )}
        {editorMode === "drawRoom" && (
          <div className="flex gap-2">
            <button type="button" className="lp-btn-primary text-sm" onClick={() => finishPolygonDraft()}>Ruimte afronden</button>
            <button type="button" className="lp-btn-secondary text-sm" onClick={cancelPolygonDraft}>Annuleren</button>
          </div>
        )}
        {recognizing && <p className="text-xs text-[var(--lp-text-secondary)]">Ruimteherkenning wordt geprobeerd…</p>}
        {aiRecognitionFailed && (
          <p className="rounded-lg bg-[var(--lp-green-soft)] p-3 text-sm text-[var(--lp-green-dark)]">
            We konden de ruimte niet betrouwbaar automatisch herkennen. Teken de ruimte eenvoudig zelf op de plattegrond.
          </p>
        )}
        {roomReady && !generated && (
          <button type="button" className="lp-btn-primary w-full py-3 text-lg font-bold" onClick={() => { if (generateLightingPlan()) setGenerated(true); }}>
            Genereer mijn lichtplan
          </button>
        )}
        {generated && (
          <>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="lp-btn-secondary text-sm" onClick={undo}>Ongedaan maken</button>
              <button type="button" className="lp-btn-secondary text-sm" onClick={redo}>Opnieuw</button>
              <button type="button" className="lp-btn-secondary text-sm" onClick={deleteSelectedFixture}>Verwijder selectie</button>
              <button type="button" className="lp-btn-secondary text-sm" onClick={() => setEditorMode("placeDownlight")}>Downlight toevoegen</button>
              <button type="button" className={`text-sm ${showHeatmap ? "lp-btn-primary" : "lp-btn-secondary"}`} onClick={() => setShowHeatmap(!showHeatmap)}>Bekijk lichtverdeling</button>
            </div>
            {showHeatmap && <p className="text-xs text-[var(--lp-text-secondary)]">{PUBLIC_HEATMAP_DISCLAIMER}</p>}
          </>
        )}
      </WizardCard>

      {backgroundDataUrl && (
        <div className="overflow-hidden rounded-xl border border-[var(--lp-border)] bg-[#1a2420]">
          <Stage ref={stageRef} width={stageWidth(backgroundWidth)} height={stageHeight(backgroundWidth, backgroundHeight)} onClick={handleStageClick} onTap={handleStageClick} className="ls-canvas-interactive mx-auto">
            <Layer>
              {image && <KonvaImage image={image} width={backgroundWidth} height={backgroundHeight} />}
              {showHeatmap && heatmapCells.map((cell, i) => (
                <Rect key={i} x={cell.x} y={cell.y} width={Math.max(4, 0.35 * (pixelsPerMeter ?? 50))} height={Math.max(4, 0.35 * (pixelsPerMeter ?? 50))} fill={HEATMAP_LEVEL_COLORS[cell.level]} listening={false} />
              ))}
              {roomVertices.length >= 3 && (
                <Line points={flattenVertices(roomVertices)} closed fill="rgba(24,166,106,0.12)" stroke="#18A66A" strokeWidth={2} listening={false} />
              )}
              {polygonDraft.length > 0 && <Line points={flattenVertices(polygonDraft)} stroke="#18A66A" strokeWidth={2} dash={[8, 4]} />}
              {calibrationDraft.map((p, i) => <Circle key={i} x={p.x} y={p.y} radius={6} fill="#18A66A" />)}
              {fixtures.map((fixture) => {
                const product = getPublicProduct(fixture.productId);
                const sizePx = product.widthM * (pixelsPerMeter ?? 50);
                const isSelected = fixture.id === selectedFixtureId;
                return (
                  <Rect key={fixture.id} x={fixture.x - sizePx / 2} y={fixture.y - sizePx / 2} width={sizePx} height={sizePx}
                    fill={product.category === "downlight" ? "#94a3b8" : "#18A66A"} stroke={isSelected ? "#ffffff" : "#087A4C"} strokeWidth={isSelected ? 3 : 1}
                    cornerRadius={product.category === "downlight" ? sizePx / 2 : 4} draggable
                    onDragEnd={(e) => handleDragEnd(fixture.id, product.widthM, e)}
                    onClick={(e) => { e.cancelBubble = true; selectFixture(fixture.id); }} />
                );
              })}
            </Layer>
          </Stage>
        </div>
      )}

      <WizardNav nextDisabled={fixtures.length === 0} onNext={() => { if (fixtures.length > 0) nextStep(); }} />
    </div>
  );
}

/** @deprecated use StepEditor */
export const StepGenerate = StepEditor;
