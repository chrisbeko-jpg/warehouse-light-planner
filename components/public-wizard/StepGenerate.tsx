"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Line, Rect, Stage } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
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

function stageWidth(bgWidth: number) {
  return Math.min(bgWidth, STAGE_MAX_WIDTH);
}

function stageHeight(bgWidth: number, bgHeight: number) {
  const width = stageWidth(bgWidth);
  return Math.round((bgHeight / bgWidth) * width);
}

export function StepGenerate() {
  const backgroundDataUrl = usePublicWizardStore((s) => s.backgroundDataUrl);
  const backgroundWidth = usePublicWizardStore((s) => s.backgroundWidth);
  const backgroundHeight = usePublicWizardStore((s) => s.backgroundHeight);
  const pixelsPerMeter = usePublicWizardStore((s) => s.pixelsPerMeter);
  const roomVertices = usePublicWizardStore((s) => s.roomVertices);
  const fixtures = usePublicWizardStore((s) => s.fixtures);
  const selectedFixtureId = usePublicWizardStore((s) => s.selectedFixtureId);
  const showHeatmap = usePublicWizardStore((s) => s.showHeatmap);
  const targetLux = usePublicWizardStore((s) => s.targetLux);
  const ceilingHeightM = usePublicWizardStore((s) => s.ceilingHeightM);
  const downlightProductId = usePublicWizardStore((s) => s.downlightProductId);
  const editorMode = usePublicWizardStore((s) => s.editorMode);
  const preferredProductId = usePublicWizardStore((s) => s.preferredProductId);

  const generateLightingPlan = usePublicWizardStore((s) => s.generateLightingPlan);
  const selectFixture = usePublicWizardStore((s) => s.selectFixture);
  const moveFixtureById = usePublicWizardStore((s) => s.moveFixtureById);
  const deleteSelectedFixture = usePublicWizardStore((s) => s.deleteSelectedFixture);
  const addDownlightAtPoint = usePublicWizardStore((s) => s.addDownlightAtPoint);
  const setShowHeatmap = usePublicWizardStore((s) => s.setShowHeatmap);
  const setDownlightProductId = usePublicWizardStore((s) => s.setDownlightProductId);
  const setEditorMode = usePublicWizardStore((s) => s.setEditorMode);
  const undo = usePublicWizardStore((s) => s.undo);
  const redo = usePublicWizardStore((s) => s.redo);
  const nextStep = usePublicWizardStore((s) => s.nextStep);

  const stageRef = useRef<Konva.Stage>(null);
  const [generated, setGenerated] = useState(fixtures.length > 0);
  const image = useKonvaImage(backgroundDataUrl ?? undefined);

  const heatmapCells = useMemo(() => {
    if (!showHeatmap || !pixelsPerMeter || fixtures.length === 0) return [];
    return computePublicHeatmap(
      fixtures,
      roomVertices,
      pixelsPerMeter,
      ceilingHeightM,
      targetLux,
    );
  }, [showHeatmap, pixelsPerMeter, fixtures, roomVertices, ceilingHeightM, targetLux]);

  const handleGenerate = () => {
    const ok = generateLightingPlan();
    if (ok) setGenerated(true);
  };

  const handleStageClick = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (!stage || !pixelsPerMeter) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      if (editorMode === "place-downlight") {
        addDownlightAtPoint(pos.x, pos.y);
        return;
      }

      const clicked = fixtures.find((f) => {
        const product = getPublicProduct(f.productId);
        const sizePx = product.widthM * pixelsPerMeter;
        return (
          pos.x >= f.x - sizePx / 2 &&
          pos.x <= f.x + sizePx / 2 &&
          pos.y >= f.y - sizePx / 2 &&
          pos.y <= f.y + sizePx / 2
        );
      });
      selectFixture(clicked?.id ?? null);
    },
    [editorMode, fixtures, pixelsPerMeter, addDownlightAtPoint, selectFixture],
  );

  const handleDragEnd = useCallback(
    (id: string, productWidthM: number, event: KonvaEventObject<DragEvent>) => {
      if (!pixelsPerMeter) return;
      const sizePx = productWidthM * pixelsPerMeter;
      moveFixtureById(id, event.target.x() + sizePx / 2, event.target.y() + sizePx / 2);
    },
    [moveFixtureById, pixelsPerMeter],
  );

  const panelProduct = getPublicProduct(preferredProductId);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Genereer uw lichtplan</h1>
      <p className="mb-4 text-[var(--ls-gray)]">
        Op basis van oppervlakte, doel lux en plafondhoogte plaatsen we indicatief{" "}
        {panelProduct.name} armaturen. U kunt daarna handmatig aanpassen.
      </p>

      <WizardCard className="mb-4 space-y-3">
        {!generated ? (
          <button type="button" className="btn-primary w-full py-3 text-lg font-bold" onClick={handleGenerate}>
            Genereer mijn lichtplan
          </button>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary text-sm" onClick={undo}>
                Ongedaan maken
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={redo}>
                Opnieuw
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={deleteSelectedFixture}>
                Verwijder selectie
              </button>
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => setEditorMode("place-downlight")}
              >
                Downlight toevoegen
              </button>
              <button
                type="button"
                className={`text-sm ${showHeatmap ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setShowHeatmap(!showHeatmap)}
              >
                Bekijk lichtverdeling
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span>Downlight type:</span>
              {PUBLIC_PRODUCTS.filter((p) => p.category === "downlight").map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`rounded px-2 py-1 ${
                    downlightProductId === p.id ? "bg-[var(--ls-yellow)]" : "bg-[var(--ls-gray-light)]"
                  }`}
                  onClick={() => setDownlightProductId(p.id)}
                >
                  {p.cct}K
                </button>
              ))}
            </div>
            {showHeatmap && (
              <p className="text-xs text-[var(--ls-gray)]">{PUBLIC_HEATMAP_DISCLAIMER}</p>
            )}
          </>
        )}
      </WizardCard>

      {backgroundDataUrl && generated && (
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
                  fill="rgba(245,196,0,0.08)"
                  stroke="#f5c400"
                  strokeWidth={2}
                  listening={false}
                />
              )}
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
                    fill={product.category === "downlight" ? "#94a3b8" : "#f5c400"}
                    stroke={isSelected ? "#ffffff" : "#111111"}
                    strokeWidth={isSelected ? 3 : 1}
                    cornerRadius={product.category === "downlight" ? sizePx / 2 : 4}
                    draggable
                    onDragEnd={(e) => handleDragEnd(fixture.id, product.widthM, e)}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      selectFixture(fixture.id);
                    }}
                  />
                );
              })}
            </Layer>
          </Stage>
        </div>
      )}

      <WizardNav
        nextDisabled={fixtures.length === 0}
        onNext={() => {
          if (fixtures.length > 0) nextStep();
        }}
      />
    </div>
  );
}
