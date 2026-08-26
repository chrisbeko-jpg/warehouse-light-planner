"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Image as KonvaImage, Layer, Line, Stage } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import { BACKGROUND_ACCEPT, loadBackgroundFile } from "@/lib/load-background-image";
import { formatScaleLabel } from "@/lib/floor-plan-scale";
import { attemptRoomRecognition } from "@/lib/public-wizard/ai-room-detect";
import { flattenVertices } from "@/lib/polygon-area";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import { WizardCard, WizardNav } from "@/components/public-wizard/WizardShell";
import { useKonvaImage } from "@/components/floor-plan/useKonvaImage";

const STAGE_MAX_WIDTH = 900;

function stageWidth(bgWidth: number) {
  return Math.min(bgWidth, STAGE_MAX_WIDTH);
}

function stageHeight(bgWidth: number, bgHeight: number) {
  const width = stageWidth(bgWidth);
  return Math.round((bgHeight / bgWidth) * width);
}

export function StepFloorPlan() {
  const backgroundDataUrl = usePublicWizardStore((s) => s.backgroundDataUrl);
  const backgroundFileName = usePublicWizardStore((s) => s.backgroundFileName);
  const backgroundWidth = usePublicWizardStore((s) => s.backgroundWidth);
  const backgroundHeight = usePublicWizardStore((s) => s.backgroundHeight);
  const pixelsPerMeter = usePublicWizardStore((s) => s.pixelsPerMeter);
  const editorMode = usePublicWizardStore((s) => s.editorMode);
  const calibrationDraft = usePublicWizardStore((s) => s.calibrationDraft);
  const calibrationDistanceMm = usePublicWizardStore((s) => s.calibrationDistanceMm);
  const polygonDraft = usePublicWizardStore((s) => s.polygonDraft);
  const roomVertices = usePublicWizardStore((s) => s.roomVertices);
  const aiRecognitionFailed = usePublicWizardStore((s) => s.aiRecognitionFailed);
  const aiRecognitionAttempted = usePublicWizardStore((s) => s.aiRecognitionAttempted);

  const setBackground = usePublicWizardStore((s) => s.setBackground);
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
  const nextStep = usePublicWizardStore((s) => s.nextStep);

  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const image = useKonvaImage(backgroundDataUrl ?? undefined);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploadError(null);
      const loaded = await loadBackgroundFile(file);
      setBackground(loaded.dataUrl, loaded.fileName, loaded.width, loaded.height);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload mislukt");
    }
  };

  const runRecognition = useCallback(async () => {
    if (!backgroundDataUrl || !pixelsPerMeter) return;
    setRecognizing(true);
    setAiRecognitionState(false, false);
    const result = await attemptRoomRecognition(backgroundDataUrl, pixelsPerMeter);
    setAiRecognitionState(true, result.failed);
    if (result.vertices && result.vertices.length >= 3) {
      setRoomVertices(result.vertices);
    }
    setRecognizing(false);
  }, [backgroundDataUrl, pixelsPerMeter, setAiRecognitionState, setRoomVertices]);

  useEffect(() => {
    if (pixelsPerMeter && backgroundDataUrl && !aiRecognitionAttempted) {
      void runRecognition();
    }
  }, [pixelsPerMeter, backgroundDataUrl, aiRecognitionAttempted, runRecognition]);

  const handleStageClick = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!backgroundDataUrl) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const point = { x: pos.x, y: pos.y };
    if (editorMode === "calibrate-scale") addCalibrationPoint(point);
    if (editorMode === "draw-room") addPolygonDraftPoint(point);
  };

  const canContinue = Boolean(backgroundDataUrl && pixelsPerMeter && roomVertices.length >= 3);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Upload uw plattegrond</h1>
      <p className="mb-4 text-[var(--ls-gray)]">
        Upload PDF, PNG of JPG. Stel de schaal in en teken of controleer de ruimte.
      </p>

      <WizardCard className="mb-4 space-y-3">
        <input ref={inputRef} type="file" accept={BACKGROUND_ACCEPT} className="hidden" onChange={handleUpload} />
        <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()}>
          {backgroundDataUrl ? "Vervang plattegrond" : "Upload plattegrond"}
        </button>
        {backgroundFileName && (
          <p className="text-xs text-[var(--ls-gray)]">
            {backgroundFileName} · {backgroundWidth}×{backgroundHeight}px
          </p>
        )}
        {uploadError && <p className="text-xs text-[var(--ls-danger)]">{uploadError}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={!backgroundDataUrl}
            onClick={() => {
              resetCalibrationDraft();
              setEditorMode("calibrate-scale");
            }}
          >
            Schaal instellen
          </button>
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={!pixelsPerMeter}
            onClick={() => setEditorMode("draw-room")}
          >
            Ruimte tekenen
          </button>
        </div>

        <p className="text-xs font-medium">{formatScaleLabel(pixelsPerMeter)}</p>

        {editorMode === "calibrate-scale" && (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-xs">Punten: {calibrationDraft.length}/2</p>
            <input
              type="number"
              placeholder="Afstand in mm"
              value={calibrationDistanceMm}
              onChange={(e) => setCalibrationDistanceMm(e.target.value)}
              className="w-full rounded border px-2 py-1 text-sm"
            />
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={() => {
                if (!applyCalibration()) {
                  window.alert("Vul twee punten en een geldige afstand in.");
                }
              }}
            >
              Schaal toepassen
            </button>
          </div>
        )}

        {editorMode === "draw-room" && (
          <div className="flex gap-2">
            <button type="button" className="btn-primary text-sm" onClick={() => finishPolygonDraft()}>
              Ruimte afronden
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={cancelPolygonDraft}>
              Annuleren
            </button>
          </div>
        )}

        {recognizing && <p className="text-xs text-[var(--ls-gray)]">Ruimteherkenning wordt geprobeerd…</p>}
        {aiRecognitionFailed && (
          <p className="rounded-lg bg-[var(--ls-warn-soft)] p-3 text-sm text-[var(--ls-warn)]">
            We konden de ruimte niet betrouwbaar automatisch herkennen. Teken de ruimte eenvoudig
            zelf op de plattegrond.
          </p>
        )}
      </WizardCard>

      {backgroundDataUrl && (
        <div className="overflow-hidden rounded-xl border bg-[var(--ls-dark)]">
          <Stage
            ref={stageRef}
            width={stageWidth(backgroundWidth)}
            height={stageHeight(backgroundWidth, backgroundHeight)}
            onClick={handleStageClick}
            onTap={handleStageClick}
            className="ls-canvas-interactive mx-auto"
          >
            <Layer>
              {image && (
                <KonvaImage image={image} width={backgroundWidth} height={backgroundHeight} />
              )}
              {roomVertices.length >= 3 && (
                <Line
                  points={flattenVertices(roomVertices)}
                  closed
                  fill="rgba(245,196,0,0.15)"
                  stroke="#f5c400"
                  strokeWidth={2}
                />
              )}
              {polygonDraft.length > 0 && (
                <Line
                  points={flattenVertices(polygonDraft)}
                  stroke="#f5c400"
                  strokeWidth={2}
                  dash={[8, 4]}
                />
              )}
              {calibrationDraft.map((p, i) => (
                <Circle key={i} x={p.x} y={p.y} radius={6} fill="#f5c400" />
              ))}
            </Layer>
          </Stage>
        </div>
      )}

      <WizardNav
        nextDisabled={!canContinue}
        onNext={() => {
          if (canContinue) nextStep();
        }}
      />
    </div>
  );
}
