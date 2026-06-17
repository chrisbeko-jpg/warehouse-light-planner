"use client";

import { create } from "zustand";
import { calculateLighting } from "@/lib/calculations";
import { clampRectangle } from "@/lib/canvas-scale";
import type { CanvasExporterFn } from "@/lib/canvas-export";
import {
  generateAutoDrawnLightLines,
  generateLightLinePlanFromDrawn,
} from "@/lib/light-lines";
import type {
  DrawnLightLine,
  LightLinePlan,
  LineFillMode,
  LuxLevel,
  MountingSystem,
  PlacedRectangle,
  RectangleType,
} from "@/types";

interface WarehouseState {
  length: number;
  width: number;
  height: number;
  lux: LuxLevel;
  mountingSystem: MountingSystem;
  includeEdgeZones: boolean;
  lineFillMode: LineFillMode;
  rectangles: PlacedRectangle[];
  drawnLightLines: DrawnLightLine[];
  selectedRectangleId: string | null;
  selectedLightLineId: string | null;
  lightLineDrawMode: boolean;
  lightLinePlan: LightLinePlan | null;
  lightLinesGenerated: boolean;
  showHeatmap: boolean;
  canvasExporter: CanvasExporterFn | null;
  setLength: (length: number) => void;
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  setLux: (lux: LuxLevel) => void;
  setMountingSystem: (system: MountingSystem) => void;
  setIncludeEdgeZones: (value: boolean) => void;
  setLineFillMode: (mode: LineFillMode) => void;
  addRectangle: (type: RectangleType) => void;
  updateRectangle: (id: string, updates: Partial<PlacedRectangle>) => void;
  removeRectangle: (id: string) => void;
  setSelectedRectangleId: (id: string | null) => void;
  setSelectedLightLineId: (id: string | null) => void;
  setLightLineDrawMode: (active: boolean) => void;
  toggleLightLineDrawMode: () => void;
  addDrawnLightLine: (line: DrawnLightLine) => void;
  updateDrawnLightLine: (id: string, updates: Partial<DrawnLightLine>) => void;
  removeDrawnLightLine: (id: string) => void;
  toggleLinePosition: (lineId: string, positionIndex: number) => void;
  cancelLightLineDrawMode: () => void;
  generateLightLinesAuto: () => void;
  rebuildLightPlan: () => void;
  toggleHeatmap: () => void;
  setCanvasExporter: (exporter: CanvasExporterFn | null) => void;
}

const DEFAULT_SIZES: Record<RectangleType, { width: number; height: number }> = {
  shelf: { width: 3, height: 1.2 },
  obstruction: { width: 1.5, height: 1.5 },
};

let rectangleCounter = 0;
let lightLineCounter = 0;

function createRectangle(type: RectangleType, length: number, width: number): PlacedRectangle {
  const size = DEFAULT_SIZES[type];
  rectangleCounter += 1;

  const rect: PlacedRectangle = {
    id: `${type}-${rectangleCounter}`,
    type,
    x: Math.max(0, (length - size.width) / 2),
    y: Math.max(0, (width - size.height) / 2),
    width: Math.min(size.width, length),
    height: Math.min(size.height, width),
  };

  return {
    ...rect,
    ...clampRectangle(rect.x, rect.y, rect.width, rect.height, length, width),
  };
}

function buildLightPlan(state: WarehouseState): LightLinePlan | null {
  const lighting = calculateLighting(
    { length: state.length, width: state.width, height: state.height },
    state.lux,
    state.rectangles,
  );

  return generateLightLinePlanFromDrawn(
    state.drawnLightLines,
    state.length,
    state.width,
    state.height,
    state.rectangles,
    state.lux,
    lighting.netArea,
    state.mountingSystem,
    state.lineFillMode,
  );
}

function syncPlan(get: () => WarehouseState, set: (partial: Partial<WarehouseState>) => void) {
  const state = get();
  if (state.drawnLightLines.length === 0) {
    set({ lightLinePlan: null, lightLinesGenerated: false });
    return;
  }

  set({
    lightLinePlan: buildLightPlan(state),
    lightLinesGenerated: true,
  });
}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  length: 30,
  width: 20,
  height: 8,
  lux: 300,
  mountingSystem: "staalkabel",
  includeEdgeZones: false,
  lineFillMode: "continuous",
  rectangles: [],
  drawnLightLines: [],
  selectedRectangleId: null,
  selectedLightLineId: null,
  lightLineDrawMode: false,
  lightLinePlan: null,
  lightLinesGenerated: false,
  showHeatmap: false,
  canvasExporter: null,

  setLength: (length) => {
    set({ length: Math.max(1, length) });
    syncPlan(get, set);
  },
  setWidth: (width) => {
    set({ width: Math.max(1, width) });
    syncPlan(get, set);
  },
  setHeight: (height) => {
    set({ height: Math.max(1, height) });
    syncPlan(get, set);
  },
  setLux: (lux) => {
    set({ lux });
    syncPlan(get, set);
  },
  setMountingSystem: (mountingSystem) => {
    set({ mountingSystem });
    syncPlan(get, set);
  },
  setIncludeEdgeZones: (includeEdgeZones) => {
    set({ includeEdgeZones });
  },
  setLineFillMode: (lineFillMode) => {
    set((state) => ({
      lineFillMode,
      drawnLightLines: state.drawnLightLines.map((line) => ({
        ...line,
        positionTypes: undefined,
      })),
    }));
    syncPlan(get, set);
  },

  addRectangle: (type) => {
    const { length, width } = get();
    const rectangle = createRectangle(type, length, width);
    set((state) => ({
      rectangles: [...state.rectangles, rectangle],
      selectedRectangleId: rectangle.id,
      selectedLightLineId: null,
    }));
  },

  updateRectangle: (id, updates) => {
    const { length, width } = get();
    set((state) => ({
      rectangles: state.rectangles.map((rect) => {
        if (rect.id !== id) return rect;
        const merged = { ...rect, ...updates };
        return {
          ...merged,
          ...clampRectangle(
            merged.x,
            merged.y,
            merged.width,
            merged.height,
            length,
            width,
          ),
        };
      }),
    }));
    syncPlan(get, set);
  },

  removeRectangle: (id) => {
    set((state) => ({
      rectangles: state.rectangles.filter((rect) => rect.id !== id),
      selectedRectangleId:
        state.selectedRectangleId === id ? null : state.selectedRectangleId,
    }));
    syncPlan(get, set);
  },

  setSelectedRectangleId: (id) =>
    set({ selectedRectangleId: id, selectedLightLineId: id ? null : get().selectedLightLineId }),

  setSelectedLightLineId: (id) =>
    set({ selectedLightLineId: id, selectedRectangleId: id ? null : get().selectedRectangleId }),

  setLightLineDrawMode: (lightLineDrawMode) =>
    set({ lightLineDrawMode, selectedRectangleId: null, selectedLightLineId: null }),

  toggleLightLineDrawMode: () =>
    set((state) => ({
      lightLineDrawMode: !state.lightLineDrawMode,
      selectedRectangleId: null,
      selectedLightLineId: null,
    })),

  addDrawnLightLine: (line) => {
    set((state) => ({
      drawnLightLines: [...state.drawnLightLines, line],
      selectedLightLineId: line.id,
    }));
    syncPlan(get, set);
  },

  updateDrawnLightLine: (id, updates) => {
    set((state) => ({
      drawnLightLines: state.drawnLightLines.map((line) =>
        line.id === id ? { ...line, ...updates } : line,
      ),
    }));
    syncPlan(get, set);
  },

  removeDrawnLightLine: (id) => {
    set((state) => ({
      drawnLightLines: state.drawnLightLines.filter((line) => line.id !== id),
      selectedLightLineId:
        state.selectedLightLineId === id ? null : state.selectedLightLineId,
    }));
    syncPlan(get, set);
  },

  toggleLinePosition: (lineId, positionIndex) => {
    const state = get();
    const plan = state.lightLinePlan;
    if (!plan) return;

    const activeLine = plan.lines.find((line) => line.id === lineId);
    const drawnIndex = state.drawnLightLines.findIndex((line) => line.id === lineId);
    if (!activeLine || drawnIndex < 0) return;

    const baseTypes = activeLine.slots.map((slot) => slot.type);
    const drawn = state.drawnLightLines[drawnIndex];
    const currentTypes = drawn.positionTypes ?? baseTypes;
    if (positionIndex < 0 || positionIndex >= currentTypes.length) return;

    const nextTypes = [...currentTypes];
    nextTypes[positionIndex] =
      nextTypes[positionIndex] === "module" ? "blankplate" : "module";

    set((state) => ({
      drawnLightLines: state.drawnLightLines.map((line, index) =>
        index === drawnIndex ? { ...line, positionTypes: nextTypes } : line,
      ),
    }));
    syncPlan(get, set);
  },

  cancelLightLineDrawMode: () => set({ lightLineDrawMode: false }),

  generateLightLinesAuto: () => {
    const state = get();
    const autoLines = generateAutoDrawnLightLines(
      state.length,
      state.width,
      state.rectangles,
      state.includeEdgeZones,
    );
    set({
      drawnLightLines: autoLines,
      lightLineDrawMode: false,
      selectedLightLineId: null,
    });
    syncPlan(get, set);
  },

  rebuildLightPlan: () => syncPlan(get, set),

  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),

  setCanvasExporter: (canvasExporter) => set({ canvasExporter }),
}));

export function createDrawnLightLineId(): string {
  lightLineCounter += 1;
  return `drawn-${lightLineCounter}`;
}
