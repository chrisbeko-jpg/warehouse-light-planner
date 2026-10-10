import { calculateIndicativeResult } from "@/lib/public-wizard/calculation";
import { ceilingCellSizeM } from "@/lib/public-wizard/ceiling-raster";
import { selectBestDistributedModuleMatrix } from "@/lib/public-wizard/distributed-placement";
import {
  buildRoomCeilingGrid,
  downlightCenterPx,
  elongatedPanelCenterPx,
  listAllModuleIndices,
} from "@/lib/public-wizard/room-ceiling-grid";
import type { PanelLayoutContext } from "@/lib/public-wizard/ceiling-grid";
import {
  isPanelFootprintInsideRoom,
  isPanelPlacementValid,
  minDistanceToPolygonBoundaryM,
} from "@/lib/public-wizard/placement-constraints";
import { getPublicProduct } from "@/lib/public-wizard/products";
import type { Point2D } from "@/types/floor-plan";
import type { CeilingTypeId, PlacedPublicFixture, PublicProductId } from "@/types/public-wizard";

export interface MatrixPlacementResult {
  fixtures: PlacedPublicFixture[];
  requestedCount: number;
  placedCount: number;
  matrixRows?: number;
  matrixCols?: number;
  warning?: string;
}

function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.x;
    const yi = polygon[i]!.y;
    const xj = polygon[j]!.x;
    const yj = polygon[j]!.y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function polygonBounds(vertices: Point2D[]) {
  const xs = vertices.map((vertex) => vertex.x);
  const ys = vertices.map((vertex) => vertex.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function nextId(): string {
  return `fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function evenAxis(min: number, max: number, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [(min + max) / 2];
  const span = max - min;
  return Array.from({ length: count }, (_, index) => min + (span * (index + 1)) / (count + 1));
}

function orientMatrix(rows: number, cols: number, roomAspect: number): [number, number] {
  if (rows === cols) return [rows, cols];
  const err = (optionRows: number, optionCols: number) => {
    const aspect = optionCols / Math.max(optionRows, 1);
    return Math.abs(Math.log((aspect + 0.01) / (roomAspect + 0.01)));
  };
  return err(rows, cols) <= err(cols, rows) ? [rows, cols] : [cols, rows];
}

function matrixSizes(requiredCount: number): Array<{ rows: number; cols: number }> {
  const minTotal = Math.max(1, requiredCount - 1);
  const maxTotal = Math.min(80, Math.max(requiredCount, Math.ceil(requiredCount * 1.28)));
  const sizes: Array<{ rows: number; cols: number }> = [];
  for (let rows = 1; rows <= 12; rows++) {
    for (let cols = 1; cols <= 12; cols++) {
      const total = rows * cols;
      if (total < minTotal || total > maxTotal) continue;
      sizes.push({ rows, cols });
    }
  }
  return sizes;
}

function gapsAreEven(values: number[]): boolean {
  if (values.length < 3) return true;
  const sorted = [...values].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let index = 1; index < sorted.length; index++) {
    gaps.push(sorted[index]! - sorted[index - 1]!);
  }
  const first = gaps[0]!;
  return gaps.every((gap) => Math.abs(gap - first) < 1.5);
}

/**
 * Place downlights as a centred, even matrix.
 * A row shares one Y and a column shares one X. The first N grid cells are never used.
 */
export function placeDownlightsSymmetrically(
  vertices: Point2D[],
  pixelsPerMeter: number,
  requiredCount: number,
  productId: PublicProductId,
  context: PanelLayoutContext,
): MatrixPlacementResult {
  if (vertices.length < 3 || requiredCount <= 0 || pixelsPerMeter <= 0) {
    return { fixtures: [], requestedCount: requiredCount, placedCount: 0 };
  }

  const product = getPublicProduct(productId);
  const radiusM = (product.diameterM ?? Math.max(product.widthM, product.heightM)) / 2;
  const bounds = polygonBounds(vertices);
  const roomWidthM = (bounds.maxX - bounds.minX) / pixelsPerMeter;
  const roomHeightM = (bounds.maxY - bounds.minY) / pixelsPerMeter;
  const roomAspect = roomWidthM / Math.max(roomHeightM, 0.01);
  const ceilingType = context.ceilingType ?? "grid_600";
  const roomGrid = buildRoomCeilingGrid(vertices, pixelsPerMeter, ceilingType);

  if (roomGrid && product.category === "downlight") {
    return placeDownlightsOnModuleGrid(
      vertices,
      pixelsPerMeter,
      requiredCount,
      productId,
      context,
      roomGrid,
      roomAspect,
    );
  }

  let bestPoints: Point2D[] | null = null;
  let bestRows = 0;
  let bestCols = 0;
  let bestScore = -Infinity;

  for (const size of matrixSizes(requiredCount)) {
    const [rows, cols] = orientMatrix(size.rows, size.cols, roomAspect);
    const xs = evenAxis(bounds.minX, bounds.maxX, cols);
    const ys = evenAxis(bounds.minY, bounds.maxY, rows);
    if (!gapsAreEven(xs) || !gapsAreEven(ys)) continue;

    const points: Point2D[] = [];
    let valid = true;
    for (const y of ys) {
      for (const x of xs) {
        const point = { x, y };
        if (!pointInPolygon(point, vertices)) {
          valid = false;
          break;
        }
        if (minDistanceToPolygonBoundaryM(point, vertices, pixelsPerMeter) < radiusM - 1e-4) {
          valid = false;
          break;
        }
        points.push(point);
      }
      if (!valid) break;
    }
    if (!valid || points.length !== rows * cols) continue;

    const fixtures: PlacedPublicFixture[] = points.map((point, index) => ({
      id: `score-${index}`,
      productId,
      x: point.x,
      y: point.y,
      rotation: 0,
    }));
    const lux = calculateIndicativeResult(
      context.areaM2,
      context.targetLux,
      context.ceilingHeightM,
      fixtures,
      requiredCount,
    ).indicativeAverageLux;
    const meets = lux >= context.targetLux * 0.95;
    const perFixture =
      fixtures.length > 0 ? lux / fixtures.length : 0;
    const requiredLux = perFixture * requiredCount;
    const requiredMeets = requiredLux >= context.targetLux * 0.95;

    const matrixAspect = cols / Math.max(rows, 1);
    let score = 10000;
    score -= Math.abs(Math.log((matrixAspect + 0.01) / (roomAspect + 0.01))) * 220;

    const left = Math.min(...xs) - bounds.minX;
    const right = bounds.maxX - Math.max(...xs);
    const top = Math.min(...ys) - bounds.minY;
    const bottom = bounds.maxY - Math.max(...ys);
    score -= (Math.abs(left - right) + Math.abs(top - bottom)) * 0.05;

    const delta = rows * cols - requiredCount;
    if (delta === 0) score += 2500;
    else if (meets && !requiredMeets && delta > 0) score += 600 - delta * 40;
    else score -= Math.abs(delta) * 900;

    if (!meets) score -= (context.targetLux - lux) * 4;
    else if (lux > context.targetLux * 1.45) score -= (lux - context.targetLux) * 3;
    else score += 200;

    if (score > bestScore) {
      bestScore = score;
      bestPoints = points;
      bestRows = rows;
      bestCols = cols;
    }
  }

  const fixtures: PlacedPublicFixture[] = (bestPoints ?? []).map((point) => ({
    id: nextId(),
    productId,
    x: point.x,
    y: point.y,
    rotation: 0,
  }));

  let warning: string | undefined;
  if (fixtures.length > 0 && fixtures.length !== requiredCount) {
    warning = `Theoretisch benodigd: ${requiredCount} armaturen. Gekozen nette verdeling: ${fixtures.length} armaturen (${bestRows}×${bestCols}).`;
  }
  if (fixtures.length > 0) {
    const lux = calculateIndicativeResult(
      context.areaM2,
      context.targetLux,
      context.ceilingHeightM,
      fixtures,
      requiredCount,
    );
    if (!lux.meetsTarget) {
      const note = `Indicatief ${lux.indicativeAverageLux} lux bij een doel van ${context.targetLux} lux. Dit is geen EN 12464-1-validatie.`;
      warning = warning ? `${warning} ${note}` : note;
    }
  }

  return {
    fixtures,
    requestedCount: requiredCount,
    placedCount: fixtures.length,
    matrixRows: bestRows || undefined,
    matrixCols: bestCols || undefined,
    warning,
  };
}

export function panelRotationForRoom(roomWidthM: number, roomHeightM: number, productId: PublicProductId): number {
  const product = getPublicProduct(productId);
  const productWide = product.widthM >= product.heightM;
  const roomWide = roomWidthM >= roomHeightM;
  return productWide === roomWide ? 0 : 90;
}

function indexStep(centersM: number[], minSpacingM: number): number {
  if (centersM.length < 2) return 1;
  const cell = Math.abs(centersM[1]! - centersM[0]!);
  if (cell <= 0) return 1;
  return Math.max(1, Math.ceil((minSpacingM - 1e-6) / cell));
}

function takeCentered(centers: number[], count: number, step: number): number[] | null {
  const need = (count - 1) * step + 1;
  if (count < 1 || need > centers.length) return null;
  const slack = centers.length - need;
  const start = Math.floor(slack / 2);
  return Array.from({ length: count }, (_, index) => centers[start + index * step]!);
}

/**
 * Place a 1200×300 panel on the centre of a 1200×600 module.
 * The panel does not replace the whole ceiling tile.
 */
export function placeElongatedPanelsOnModules(
  vertices: Point2D[],
  pixelsPerMeter: number,
  requiredCount: number,
  productId: PublicProductId,
  context: PanelLayoutContext,
  ceilingType: CeilingTypeId = "grid_1200_600",
): MatrixPlacementResult {
  if (vertices.length < 3 || requiredCount <= 0 || pixelsPerMeter <= 0) {
    return { fixtures: [], requestedCount: requiredCount, placedCount: 0 };
  }

  const bounds = polygonBounds(vertices);
  const roomWidthM = (bounds.maxX - bounds.minX) / pixelsPerMeter;
  const roomHeightM = (bounds.maxY - bounds.minY) / pixelsPerMeter;
  const rotation = panelRotationForRoom(roomWidthM, roomHeightM, productId);

  const roomGrid = buildRoomCeilingGrid(vertices, pixelsPerMeter, ceilingType);
  if (!roomGrid) {
    return { fixtures: [], requestedCount: requiredCount, placedCount: 0 };
  }

  const colsByRow = new Map<number, Array<{ col: number; point: Point2D }>>();
  for (const { col, row } of listAllModuleIndices(roomGrid)) {
    const point = elongatedPanelCenterPx(roomGrid, col, row, productId, rotation);
    if (!isPanelFootprintInsideRoom(point, pixelsPerMeter, vertices, productId, rotation)) continue;
    const list = colsByRow.get(row) ?? [];
    list.push({ col, point });
    colsByRow.set(row, list);
  }
  const sortedRows = [...colsByRow.keys()].sort((a, b) => a - b);
  for (const row of sortedRows) {
    colsByRow.get(row)!.sort((a, b) => a.col - b.col);
  }

  const roomAspect = roomWidthM / Math.max(roomHeightM, 0.01);
  const best = selectBestDistributedModuleMatrix({
    sortedRows,
    colsByRow,
    requiredCount,
    roomAspect,
    bounds,
    vertices,
    pixelsPerMeter,
    productId,
    context,
    rotation,
  });

  const fixtures: PlacedPublicFixture[] = (best?.points ?? []).map((point) => ({
    id: nextId(),
    productId,
    x: point.x,
    y: point.y,
    rotation,
  }));

  let warning: string | undefined;
  if (best && fixtures.length !== requiredCount) {
    warning = `Theoretisch benodigd: ${requiredCount} panelen. Gekozen nette verdeling: ${fixtures.length} panelen (${best.rows}×${best.cols}). Het 1200×300 paneel ligt in een inbouwvoorziening binnen de plafondmodule.`;
  } else if (best) {
    warning =
      "Het 1200×300 paneel vult de 1200×600 plafondmodule niet volledig. Het ligt in een inbouwvoorziening binnen de module.";
  }

  return {
    fixtures,
    requestedCount: requiredCount,
    placedCount: fixtures.length,
    matrixRows: best?.rows,
    matrixCols: best?.cols,
    warning,
  };
}

function placeDownlightsOnModuleGrid(
  vertices: Point2D[],
  pixelsPerMeter: number,
  requiredCount: number,
  productId: PublicProductId,
  context: PanelLayoutContext,
  grid: NonNullable<ReturnType<typeof buildRoomCeilingGrid>>,
  roomAspect: number,
): MatrixPlacementResult {
  const bounds = polygonBounds(vertices);
  const product = getPublicProduct(productId);
  const radiusM = (product.diameterM ?? Math.max(product.widthM, product.heightM)) / 2;

  const colsByRow = new Map<number, Array<{ col: number; point: Point2D }>>();
  for (const { col, row } of listAllModuleIndices(grid)) {
    const point = downlightCenterPx(grid, col, row);
    if (!pointInPolygon(point, vertices)) continue;
    if (minDistanceToPolygonBoundaryM(point, vertices, pixelsPerMeter) < radiusM - 1e-4) continue;
    const list = colsByRow.get(row) ?? [];
    list.push({ col, point });
    colsByRow.set(row, list);
  }
  const sortedRows = [...colsByRow.keys()].sort((a, b) => a - b);
  for (const row of sortedRows) {
    colsByRow.get(row)!.sort((a, b) => a.col - b.col);
  }

  const best = selectBestDistributedModuleMatrix({
    sortedRows,
    colsByRow,
    requiredCount,
    roomAspect,
    bounds,
    vertices,
    pixelsPerMeter,
    productId,
    context,
    rotation: 0,
  });

  const fixtures: PlacedPublicFixture[] = (best?.points ?? []).map((point) => ({
    id: nextId(),
    productId,
    x: point.x,
    y: point.y,
    rotation: 0,
  }));

  let warning: string | undefined;
  if (fixtures.length > 0 && fixtures.length !== requiredCount) {
    warning = `Theoretisch benodigd: ${requiredCount} armaturen. Gekozen nette verdeling: ${fixtures.length} armaturen (${best?.rows ?? 0}×${best?.cols ?? 0}).`;
  }

  return {
    fixtures,
    requestedCount: requiredCount,
    placedCount: fixtures.length,
    matrixRows: best?.rows,
    matrixCols: best?.cols,
    warning,
  };
}

export function listModuleCenterPoints(
  vertices: Point2D[],
  pixelsPerMeter: number,
  productId: PublicProductId,
  ceilingType: CeilingTypeId,
  rotation: number,
): Point2D[] {
  if (vertices.length < 3 || pixelsPerMeter <= 0) return [];
  const grid = buildRoomCeilingGrid(vertices, pixelsPerMeter, ceilingType);
  if (!grid) return [];
  const points: Point2D[] = [];
  for (const { col, row } of listAllModuleIndices(grid)) {
    const point = elongatedPanelCenterPx(grid, col, row, productId, rotation);
    if (isPanelFootprintInsideRoom(point, pixelsPerMeter, vertices, productId, rotation)) {
      points.push(point);
    }
  }
  return points;
}
